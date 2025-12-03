import { getRecordModel } from '../models/Record.js';
import { getInterviewModel } from '../models/Interview.js';
import { sendGaEvent } from '../services/analytics.js';
import HeadUser from '../models/HeadUser.js';
import ActivityEvent from '../models/ActivityEvent.js';

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
    // Note: Officers can now view all records; visibility is no longer restricted
    // by viewRecordsAllPrograms. If needed, this can be reintroduced with a
    // dedicated permission flag.
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

    const isOfficer = !!(req.user && req.user.role === 'OFFICER');
    let officerPerms = {};
    let officerDoc = null;
    if (isOfficer) {
      try {
        const { getOfficerUserModel } = await import('../models/User.js');
        const User = getOfficerUserModel();
        officerDoc = await User.findById(req.user.id).lean();
        officerPerms = officerDoc?.permissions || {};
      } catch (_) {
        officerPerms = {};
      }
    }

    // Stamp audit metadata for who is performing this change (head or officer)
    try {
      if (req.user) {
        if (isOfficer && officerDoc) {
          data.lastModifiedById = officerDoc._id;
          data.lastModifiedByRole = officerDoc.role || 'OFFICER';
          if (officerDoc.name) data.lastModifiedByName = officerDoc.name;
          if (officerDoc.email) data.lastModifiedByEmail = officerDoc.email;
        } else if (req.user.role === 'DEPT_HEAD') {
          const head = await HeadUser.findById(req.user.id).lean();
          if (head) {
            data.lastModifiedById = head._id;
            data.lastModifiedByRole = head.role || 'DEPT_HEAD';
            if (head.name) data.lastModifiedByName = head.name;
            if (head.email) data.lastModifiedByEmail = head.email;
          }
        }
      }
    } catch (_) {}

    const isNew = !id;
    if (isOfficer) {
      // Archiving or restoring always requires archiveRecords
      if (isArchiving && !officerPerms.archiveRecords) {
        return res.status(403).json({ error: 'Forbidden' });
      }
      // Creating live records requires createRecords
      if (!isArchiving && isNew && !officerPerms.createRecords) {
        return res.status(403).json({ error: 'Forbidden' });
      }
      // For existing records, we check edit vs processEnrollment after we know
      // whether this is a same-collection edit or a cross-collection move.
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
          await ActivityEvent.create({
            actorId: data.lastModifiedById,
            actorName: data.lastModifiedByName,
            actorEmail: data.lastModifiedByEmail,
            actorRole: data.lastModifiedByRole,
            type: 'student_archive',
            description: `${data.lastModifiedByName || data.lastModifiedByEmail || 'Someone'} archived a student record.`,
          });
          return res.json({ doc: inArch.toObject() });
        }
        const inLive = await Live.findById(id);
        if (inLive) {
          const duplicate = nameSignature ? await Arch.findOne({ ...dupFilter, _id: { $ne: id } }).lean() : null;
          if (duplicate) return res.status(409).json({ error: 'A record with the same full name already exists.' });
          await Arch.create({ _id: inLive._id, ...inLive.toObject(), ...data });
          await Live.findByIdAndDelete(inLive._id);
          await ActivityEvent.create({
            actorId: data.lastModifiedById,
            actorName: data.lastModifiedByName,
            actorEmail: data.lastModifiedByEmail,
            actorRole: data.lastModifiedByRole,
            type: 'student_archive',
            description: `${data.lastModifiedByName || data.lastModifiedByEmail || 'Someone'} archived a student record.`,
          });
          return res.json({ doc: { _id: inLive._id } });
        }
      }
      const duplicate = nameSignature ? await Arch.findOne(dupFilter).lean() : null;
      if (duplicate) return res.status(409).json({ error: 'A record with the same full name already exists.' });
      const created = await Arch.create(id ? { _id: id, ...data } : data);
      await ActivityEvent.create({
        actorId: data.lastModifiedById,
        actorName: data.lastModifiedByName,
        actorEmail: data.lastModifiedByEmail,
        actorRole: data.lastModifiedByRole,
        type: 'student_archive',
        description: `${data.lastModifiedByName || data.lastModifiedByEmail || 'Someone'} archived a student record.`,
      });
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
        // If already in target collection, this is a normal edit
        if (sourceKind === kind) {
          if (isOfficer && !officerPerms.editRecords) {
            return res.status(403).json({ error: 'Forbidden' });
          }
          if (__v !== undefined && sourceDoc.__v !== __v) {
            return res.status(409).json({ error: 'Conflict: record has been modified by another user' });
          }
          const duplicate = nameSignature ? await Live.findOne({ ...dupFilter, _id: { $ne: id } }).lean() : null;
          if (duplicate) return res.status(409).json({ error: 'A record with the same full name already exists.' });
          Object.assign(sourceDoc, data, { archived_at: null });
          await sourceDoc.save();

          await ActivityEvent.create({
            actorId: data.lastModifiedById,
            actorName: data.lastModifiedByName,
            actorEmail: data.lastModifiedByEmail,
            actorRole: data.lastModifiedByRole,
            type: isNew ? 'student_add' : 'student_edit',
            description: isNew
              ? `${data.lastModifiedByName || data.lastModifiedByEmail || 'Someone'} added a student record.`
              : `${data.lastModifiedByName || data.lastModifiedByEmail || 'Someone'} edited a student record.`,
          });

          return res.json({ doc: sourceDoc.toObject() });
        }
        // Relocate across collections without duplicating
        if (isOfficer && !officerPerms.processEnrollment) {
          return res.status(403).json({ error: 'Forbidden' });
        }
        const duplicate = nameSignature ? await Live.findOne({ ...dupFilter, _id: { $ne: id } }).lean() : null;
        if (duplicate) return res.status(409).json({ error: 'A record with the same full name already exists.' });
        await Live.create({ _id: sourceDoc._id, ...sourceDoc.toObject(), ...data, archived_at: null });
        await sourceModel.findByIdAndDelete(sourceDoc._id);

        await ActivityEvent.create({
          actorId: data.lastModifiedById,
          actorName: data.lastModifiedByName,
          actorEmail: data.lastModifiedByEmail,
          actorRole: data.lastModifiedByRole,
          type: 'student_move',
          description: `${data.lastModifiedByName || data.lastModifiedByEmail || 'Someone'} moved a student record between categories.`,
        });

        return res.json({ doc: { _id: sourceDoc._id } });
      }

      // Check if exists in target archives (restore path)
      const inArch = await Arch.findById(id);
      if (inArch) {
        if (isOfficer && !officerPerms.archiveRecords) {
          return res.status(403).json({ error: 'Forbidden' });
        }
        const duplicate = nameSignature ? await Live.findOne({ ...dupFilter, _id: { $ne: id } }).lean() : null;
        if (duplicate) return res.status(409).json({ error: 'A record with the same full name already exists.' });
        await Live.create({ _id: inArch._id, ...inArch.toObject(), ...data, archived_at: null });
        await Arch.findByIdAndDelete(inArch._id);

        await ActivityEvent.create({
          actorId: data.lastModifiedById,
          actorName: data.lastModifiedByName,
          actorEmail: data.lastModifiedByEmail,
          actorRole: data.lastModifiedByRole,
          type: 'student_restore',
          description: `${data.lastModifiedByName || data.lastModifiedByEmail || 'Someone'} restored a student record from archive.`,
        });

        return res.json({ doc: { _id: inArch._id } });
      }
    }
    const duplicate = nameSignature ? await Live.findOne(dupFilter).lean() : null;
    if (duplicate) return res.status(409).json({ error: 'A record with the same full name already exists.' });
    const created = await Live.create(id ? { _id: id, ...data, archived_at: null } : { ...data, archived_at: null });

    await ActivityEvent.create({
      actorId: data.lastModifiedById,
      actorName: data.lastModifiedByName,
      actorEmail: data.lastModifiedByEmail,
      actorRole: data.lastModifiedByRole,
      type: 'student_add',
      description: `${data.lastModifiedByName || data.lastModifiedByEmail || 'Someone'} added a student record.`,
    });

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

    try {
      const actorId = req.user && req.user.id;
      const actorRole = req.user && req.user.role;
      const actorName = (req.user && req.user.name) || '';
      const actorEmail = (req.user && req.user.email) || '';
      await ActivityEvent.create({
        actorId,
        actorName: actorName || undefined,
        actorEmail: actorEmail || undefined,
        actorRole,
        type: 'student_delete',
        description: `${actorName || actorEmail || 'Someone'} deleted a student record.`,
      });
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
