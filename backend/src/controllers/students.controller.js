import { getRecordModel } from '../models/Record.js';
import { getInterviewModel } from '../models/Interview.js';
import { sendGaEvent } from '../services/analytics.js';

function buildNameSignature({ firstName, middleName, lastName }) {
  const normalize = (value) => (value || '').trim().toLowerCase();
  const first = normalize(firstName);
  const middle = normalize(middleName);
  const last = normalize(lastName);
  if (!first && !last) return '';
  return [first, middle, last].join('|');
}

export async function list(req, res, next) {
  try {
    const archived = String(req.query.archived || '').toLowerCase();
    const isArchived = archived === '1' || archived === 'true';
    const category = String(req.query.recordCategory || '').toLowerCase();
    const kind = category === 'enrollee' || category === 'enrollees' ? 'enrollees' : (category === 'student' || category === 'students' ? 'students' : 'applicants');
    const Model = getRecordModel(kind, isArchived);
    const q = {};
    if (req.query.batch) q.batch = req.query.batch;
    if (!isArchived) {
      q.$or = [{ archived_at: { $exists: false } }, { archived_at: null }];
    } else {
      q.archived_at = { $ne: null };
    }
    // RBAC: Officers without viewRecordsAllPrograms can only view their assigned scope
    if (req.user && req.user.role === 'OFFICER') {
      try {
        const { getOfficerUserModel } = await import('../models/User.js');
        const User = getOfficerUserModel();
        const officer = await User.findById(req.user.id).lean();
        const canViewAll = !!(officer && officer.permissions && officer.permissions.viewRecordsAllPrograms);
        if (!canViewAll) {
          if (officer?.assignedYear) q.batch = officer.assignedYear;
        }
      } catch (_) {}
    }
    const rows = await Model.find(q).lean();
    res.json({ rows });
  } catch (e) { 
    // Log server-side error for debugging
    // eslint-disable-next-line no-console
    console.error('[students.controller.list] error:', e && e.stack ? e.stack : e);
    next(e);
  }
}

export async function upsert(req, res, next) {
  try {
    const cat = String(req.body.recordCategory || '').toLowerCase();
    const kind = cat === 'enrollee' || cat === 'enrollees' ? 'enrollees' : (cat === 'student' || cat === 'students' ? 'students' : 'applicants');
    const { id, __v, ...data } = req.body;

    const nameSignature = buildNameSignature(data);
    if (nameSignature) data.nameSignature = nameSignature;

    const isArchiving = !!data.archived_at && String(data.archived_at).length > 0;

    // RBAC: Officers require processEnrollment when changing enrollmentStatus or setting status to ENROLLED
    if (req.user && req.user.role === 'OFFICER') {
      try {
        const { getOfficerUserModel } = await import('../models/User.js');
        const User = getOfficerUserModel();
        const officer = await User.findById(req.user.id).lean();
        const perms = officer?.permissions || {};
        const wantsEnroll = ['ENROLLED'].includes(String(data.status || '').toUpperCase()) || ['ENROLLED'].includes(String(data.enrollmentStatus || '').toUpperCase());
        if (wantsEnroll && !perms.processEnrollment) {
          return res.status(403).json({ error: 'Forbidden' });
        }
      } catch (_) {}
    }
    const Live = getRecordModel(kind, false);
    const Arch = getRecordModel(kind, true);

    // Duplicate protection on target collection based on nameSignature within batch
    const dupFilter = nameSignature ? { nameSignature } : {};
    if (data.batchId) dupFilter.batchId = data.batchId; else if (data.batch) dupFilter.batch = data.batch;

    if (isArchiving) {
      if (id) {
        const inArch = await Arch.findById(id);
        if (inArch) {
          if (__v !== undefined && inArch.__v !== __v) {
            return res.status(409).json({ error: 'Conflict: record has been modified by another user' });
          }
          Object.assign(inArch, data);
          await inArch.save();
          return res.json({ doc: inArch.toObject() });
        }
        const inLive = await Live.findById(id);
        if (inLive) {
          const duplicate = nameSignature ? await Arch.findOne({ ...dupFilter, _id: { $ne: id } }).lean() : null;
          if (duplicate) return res.status(409).json({ error: 'A record with the same full name already exists.' });
          await Arch.create({ _id: inLive._id, ...inLive.toObject(), ...data });
          await Live.findByIdAndDelete(inLive._id);
          return res.json({ doc: { _id: inLive._id } });
        }
      }
      const duplicate = nameSignature ? await Arch.findOne(dupFilter).lean() : null;
      if (duplicate) return res.status(409).json({ error: 'A record with the same full name already exists.' });
      const created = await Arch.create(id ? { _id: id, ...data } : data);
      return res.json({ doc: created.toObject() });
    }

    // Live path
    if (id) {
      // Find the source doc across all live categories
      const LiveApplicants = getRecordModel('applicants', false);
      const LiveEnrollees = getRecordModel('enrollees', false);
      const LiveStudents = getRecordModel('students', false);
      const candidates = [
        { model: Live, kind },
        { model: LiveApplicants, kind: 'applicants' },
        { model: LiveEnrollees, kind: 'enrollees' },
        { model: LiveStudents, kind: 'students' }
      ];
      let sourceDoc = null;
      let sourceModel = null;
      let sourceKind = null;
      for (const c of candidates) {
        try {
          const doc = await c.model.findById(id);
          if (doc) { sourceDoc = doc; sourceModel = c.model; sourceKind = c.kind; break; }
        } catch (_) {}
      }

      if (sourceDoc) {
        // If already in target collection, update
        if (sourceKind === kind) {
          if (__v !== undefined && sourceDoc.__v !== __v) {
            return res.status(409).json({ error: 'Conflict: record has been modified by another user' });
          }
          const duplicate = nameSignature ? await Live.findOne({ ...dupFilter, _id: { $ne: id } }).lean() : null;
          if (duplicate) return res.status(409).json({ error: 'A record with the same full name already exists.' });
          Object.assign(sourceDoc, data, { archived_at: null });
          await sourceDoc.save();
          return res.json({ doc: sourceDoc.toObject() });
        }
        // Relocate across collections without duplicating
        const duplicate = nameSignature ? await Live.findOne({ ...dupFilter, _id: { $ne: id } }).lean() : null;
        if (duplicate) return res.status(409).json({ error: 'A record with the same full name already exists.' });
        await Live.create({ _id: sourceDoc._id, ...sourceDoc.toObject(), ...data, archived_at: null });
        await sourceModel.findByIdAndDelete(sourceDoc._id);
        return res.json({ doc: { _id: sourceDoc._id } });
      }

      // Check if exists in target archives (restore path)
      const inArch = await Arch.findById(id);
      if (inArch) {
        const duplicate = nameSignature ? await Live.findOne({ ...dupFilter, _id: { $ne: id } }).lean() : null;
        if (duplicate) return res.status(409).json({ error: 'A record with the same full name already exists.' });
        await Live.create({ _id: inArch._id, ...inArch.toObject(), ...data, archived_at: null });
        await Arch.findByIdAndDelete(inArch._id);
        return res.json({ doc: { _id: inArch._id } });
      }
    }
    const duplicate = nameSignature ? await Live.findOne(dupFilter).lean() : null;
    if (duplicate) return res.status(409).json({ error: 'A record with the same full name already exists.' });
    const created = await Live.create(id ? { _id: id, ...data, archived_at: null } : { ...data, archived_at: null });
    res.json({ doc: created.toObject() });
  } catch (e) {
    // eslint-disable-next-line no-console
    console.error('[students.controller.upsert] error:', e && e.stack ? e.stack : e);
    next(e);
  }
}

export async function remove(req, res, next) {
  try {
    // We must detect the collection by loading the doc first.
    const LiveApplicants = getRecordModel('applicants', false);
    const LiveEnrollees = getRecordModel('enrollees', false);
    const LiveStudents = getRecordModel('students', false);
    const { id } = req.params;
    let student = await LiveApplicants.findById(id).lean();
    let SourceModel = LiveApplicants;
    if (!student) { student = await LiveEnrollees.findById(id).lean(); SourceModel = LiveEnrollees; }
    if (!student) { student = await LiveStudents.findById(id).lean(); SourceModel = LiveStudents; }
    if (!student) { return res.json({ ok: true }); }
    await SourceModel.findByIdAndDelete(id);
    const Interview = getInterviewModel();
    // Best-effort cascade: remove related interview reports by student name (case-insensitive),
    // and try both with the batch filter (if available) and without (to catch stray records)
    try {
      if (student) {
        const firstName = (student.firstName || '').trim();
        const lastName = (student.lastName || '').trim();
        const fullNameA = [firstName, lastName].filter(Boolean).join(' ').trim();
        const fullNameB = [lastName, firstName].filter(Boolean).join(' ').trim();
        const batch = student.batch || undefined;
        const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const or = [];
        if (fullNameA) or.push({ studentName: { $regex: `^${esc(fullNameA)}$`, $options: 'i' } });
        if (fullNameB && fullNameB !== fullNameA) or.push({ studentName: { $regex: `^${esc(fullNameB)}$`, $options: 'i' } });
        if (or.length) {
          // With batch (if available)
          if (batch) {
            await Interview.deleteMany({ $or: or, batch });
          }
          // Without batch as fallback
          await Interview.deleteMany({ $or: or });
        }
      }
    } catch (_) { /* ignore cascade errors */ }
    try {
      await sendGaEvent({
        userId: req.user && req.user.id,
        eventName: 'student_delete',
        params: {
          batch: String(student && (student.batch || student.batchId || '')),
          record_category: String(student && (student.recordCategory || ''))
        }
      })
    } catch (_) {}
    res.json({ ok: true });
  } catch (e) {
    // eslint-disable-next-line no-console
    console.error('[students.controller.remove] error:', e && e.stack ? e.stack : e);
    next(e);
  }
}

export async function exportCsv(req, res, next) {
  try {
    const Student = getRecordModel('students', false);
    const q = {};
    const year = req.query.year ? String(req.query.year) : '';
    if (year) q.$or = [{ batch: new RegExp(`^${year}`) }, { year }];
    const docs = await Student.find(q).lean();
    const rows = docs.map(d => ({
      id: String(d._id || ''),
      firstName: String(d.firstName || ''),
      lastName: String(d.lastName || ''),
      email: String(d.email || ''),
      status: String(d.status || 'PENDING').toUpperCase(),
      batch: String(d.batch || ''),
      year: String(d.year || (String(d.batch || '').includes('-') ? String(d.batch || '').split('-')[0] : '') || ''),
      createdAt: d.createdAt ? new Date(d.createdAt).toISOString() : '',
      updatedAt: d.updatedAt ? new Date(d.updatedAt).toISOString() : ''
    }));
    const esc = (v) => {
      const s = String(v == null ? '' : v);
      const needsQuote = /[",\n]/.test(s);
      const quoted = '"' + s.replace(/"/g, '""') + '"';
      return needsQuote ? quoted : s;
    };
    const header = ['id','firstName','lastName','email','status','batch','year','createdAt','updatedAt'].join(',');
    const body = rows.map(r => [r.id,r.firstName,r.lastName,r.email,r.status,r.batch,r.year,r.createdAt,r.updatedAt].map(esc).join(',')).join('\n');
    const csv = header + '\n' + body;
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="students.csv"');
    res.send(csv);
  } catch (e) {
    next(e);
  }
}
