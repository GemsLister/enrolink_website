import { getRecordModel } from '../models/Record.js';
import mongoose from 'mongoose';
import { getInterviewModel } from '../models/Interview.js';
import { getBatchModel } from '../models/Batch.js';
import { sendGaEvent } from '../services/analytics.js';
import HeadUser from '../models/HeadUser.js';
import ActivityEvent from '../models/ActivityEvent.js';
import { getSingletonOfficerSettings } from '../models/OfficerSettings.js';

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
    // Allow filtering by batchId (ObjectId string) for exact batch selection
    if (req.query.batchId) {
      // If batchId is provided, try to match by ObjectId _id OR by batch year
      try {
        const raw = String(req.query.batchId || '').trim();
        if (!raw) {
          // ignore
        } else if (mongoose.Types.ObjectId.isValid(raw)) {
          // Try to load batch to find its year; then match either by batchId or by batch year
          try {
            const Batch = getBatchModel();
            const batchDoc = await Batch.findById(raw).select('year').lean();
            if (batchDoc && batchDoc.year) {
              q.$or = q.$or || [];
              q.$or.push({ batchId: mongoose.Types.ObjectId(raw) });
              q.$or.push({ batch: String(batchDoc.year) });
            } else {
              q.batchId = mongoose.Types.ObjectId(raw);
            }
          } catch (_) {
            q.batchId = mongoose.Types.ObjectId(raw);
          }
        } else {
          // Not an ObjectId: treat as code or raw id string
          q.$or = q.$or || [];
          q.$or.push({ batchId: raw });
          q.$or.push({ batch: raw });
        }
      } catch (_) {
        // Fallback: attempt direct match
        q.batchId = req.query.batchId;
      }
    }
    if (req.query.status) {
      const s = String(req.query.status || '').toUpperCase();
      if (s) q.status = s;
    }
    if (!isArchived) {
      const archivedCond = [{ archived_at: { $exists: false } }, { archived_at: null }];
      if (q.$or) {
        q.$and = q.$and || [];
        q.$and.push({ $or: q.$or });
        q.$and.push({ $or: archivedCond });
        delete q.$or;
      } else {
        q.$or = archivedCond;
      }
    } else {
      q.archived_at = { $ne: null };
    }

    // RBAC: Officers without viewRecordsAllPrograms can only view their assigned scope
    if (req.user && req.user.role === 'OFFICER') {
      try {
        const { getOfficerUserModel } = await import('../models/User.js');
        const User = getOfficerUserModel();
        const officer = await User.findById(req.user.id).lean();
        // Respect global officer settings if present
        const settings = await getSingletonOfficerSettings().catch(()=>null);
        const globalPerms = settings && settings.permissions ? settings.permissions : {};
        const canViewAll = !!( (globalPerms.viewRecordsAllPrograms) || (officer && officer.permissions && officer.permissions.viewRecordsAllPrograms) );
        if (!canViewAll) {
          if (officer?.assignedBatch) {
            try {
              const Batch = getBatchModel();
              const byCode = await Batch.findOne({ code: officer.assignedBatch }).select('_id').lean();
              const byId = byCode ? null : (await Batch.findById(officer.assignedBatch).select('_id').lean());
              const target = byCode || byId;
              if (target?._id) q.batchId = target._id;
              else if (officer?.assignedYear) q.batch = officer.assignedYear;
            } catch (_) {
              if (officer?.assignedYear) q.batch = officer.assignedYear;
            }
          } else if (officer?.assignedYear) {
            q.batch = officer.assignedYear;
          } else {
            try {
              const Batch = getBatchModel();
              const ids = await Batch.find({ $or: [{ interviewer: officer?.name }, { interviewer: officer?.email }] }).select('_id').lean();
              const list = ids.map(d => d._id).filter(Boolean);
              if (list.length > 0) q.batchId = { $in: list };
            } catch (_) {}
          }
        }
      } catch (_) {}
    }
    // Debug: log effective query when batchId filter is used
    if (req.query && (req.query.batchId || req.query.batch)) {
      // eslint-disable-next-line no-console
      console.log('[students.controller.list] executing query:', JSON.stringify(q));
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

    // Validate required fields
    let requiredFields = [];
    if (kind === 'applicants') {
      requiredFields = ['number', 'batch', 'course', 'examineeNo', 'source', 'firstName', 'lastName', 'middleName', 'email', 'percentileScore', 'shsStrand', 'shs', 'contact', 'shsGpa', 'interviewDate'];
    } else if (kind === 'enrollees') {
      requiredFields = ['course', 'batch', 'examineeNo', 'firstName', 'lastName', 'middleName', 'email', 'contact', 'enrollmentStatus'];
    } else if (kind === 'students') {
      requiredFields = ['course', 'batch', 'examineeNo', 'firstName', 'lastName', 'middleName', 'email', 'contact', 'interviewDate'];
    }
    const missingFields = requiredFields.filter(field => !String(data[field] || '').trim());
    if (missingFields.length > 0) {
      return res.status(400).json({ error: `The following fields are required: ${missingFields.join(', ')}` });
    }

    // Validate email format
    const email = String(data.email || '').trim();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ error: 'Invalid email format' });
    }

    // Validate contact number format
    const contact = String(data.contact || '').trim();
    const contactRegex = /^[0-9+\-\s()]{7,}$/;
    if (!contactRegex.test(contact)) {
      return res.status(400).json({ error: 'Invalid contact number format' });
    }

    // Validate enrollee-specific fields
    if (kind === 'enrollees') {
      const status = String(data.enrollmentStatus).toUpperCase();
      if (!['ENROLLED', 'PENDING'].includes(status)) {
        return res.status(400).json({ error: 'Invalid enrollment status. Must be ENROLLED or PENDING' });
      }
    }

    // Validate course system - only BSIT and BSEMC-DAT are allowed
    const VALID_COURSES = ['BSIT', 'BSEMC-DAT'];
    if (data.course && !VALID_COURSES.includes(String(data.course).trim())) {
      return res.status(400).json({ error: `Invalid course. Must be one of: ${VALID_COURSES.join(', ')}` });
    }
    if (data.preferredCourse && !VALID_COURSES.includes(String(data.preferredCourse).trim())) {
      return res.status(400).json({ error: `Invalid preferred course. Must be one of: ${VALID_COURSES.join(', ')}` });
    }

    // Validate batch - must be one of the allowed academic years
    const VALID_BATCHES = ['2026-2027', '2027-2028', '2028-2029', '2029-2030'];
    if (data.batch && !VALID_BATCHES.includes(String(data.batch).trim())) {
      return res.status(400).json({ error: `Invalid batch. Must be one of: ${VALID_BATCHES.join(', ')}` });
    }

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
        // Merge in any global settings that enable a permission for ALL officers
        try {
          const settings = await getSingletonOfficerSettings().catch(()=>null);
          const globalPerms = settings && settings.permissions ? settings.permissions : {};
          // If a global permission is true, grant it regardless of per-user setting
          for (const k of Object.keys(globalPerms)) {
            if (globalPerms[k]) officerPerms[k] = true;
          }
        } catch (_) {}
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

    const Interview = getInterviewModel();
    async function maybeUpsertInterview(savedDoc, payloadKind) {
      try {
        const k = String(payloadKind || kind || '').toLowerCase();
        if (k !== 'enrollees') return;
        const statusVal = String((savedDoc?.status || data.status || '')).toUpperCase();
        const decisionVal = String((savedDoc?.interviewerDecision || data.interviewerDecision || '')).toUpperCase();
        let result = 'PENDING';
        if (statusVal === 'FAILED' || decisionVal === 'FAILED') result = 'FAILED';
        else if (['PASSED','ENROLLED'].includes(statusVal) || decisionVal === 'PASSED') result = 'PASSED';
        if (result === 'PENDING') return;
        const studentName = [String(savedDoc?.firstName || data.firstName || ''), String(savedDoc?.lastName || data.lastName || '')].filter(Boolean).join(' ').trim();
        if (!studentName) return;
        const batch = String(savedDoc?.batch || data.batch || '');
        const interviewerName = String(savedDoc?.interviewer || data.interviewer || '');
        const date = savedDoc?.interviewDate ? new Date(savedDoc.interviewDate) : (data.interviewDate ? new Date(data.interviewDate) : undefined);
        const existing = await Interview.findOne({ studentName, ...(batch ? { batch } : {}) }).lean();
        const fields = { studentName, ...(batch ? { batch } : {}), result, ...(interviewerName ? { interviewerName } : {}), ...(date ? { date } : {}) };
        if (existing?._id) await Interview.findByIdAndUpdate(existing._id, fields, { new: true }).lean(); else await Interview.create(fields);
      } catch (_) {}
    }

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
      // Audit log + interview summary update
      await ActivityEvent.create({
        actorId: data.lastModifiedById,
        actorName: data.lastModifiedByName,
        actorEmail: data.lastModifiedByEmail,
        actorRole: data.lastModifiedByRole,
        type: 'student_archive',
        description: `${data.lastModifiedByName || data.lastModifiedByEmail || 'Someone'} archived a student record.`,
      });
      await maybeUpsertInterview(created, kind);
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

          // Audit log + interview summary update
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
          await maybeUpsertInterview(sourceDoc, kind);
          return res.json({ doc: sourceDoc.toObject() });
        }
        // Relocate across collections without duplicating
        if (isOfficer && !officerPerms.processEnrollment) {
          return res.status(403).json({ error: 'Forbidden' });
        }
        const duplicate = nameSignature ? await Live.findOne({ ...dupFilter, _id: { $ne: id } }).lean() : null;
        if (duplicate) return res.status(409).json({ error: 'A record with the same full name already exists.' });
        const relocated = await Live.create({ _id: sourceDoc._id, ...sourceDoc.toObject(), ...data, archived_at: null });
        await sourceModel.findByIdAndDelete(sourceDoc._id);

        // Audit log + interview summary update
        await ActivityEvent.create({
          actorId: data.lastModifiedById,
          actorName: data.lastModifiedByName,
          actorEmail: data.lastModifiedByEmail,
          actorRole: data.lastModifiedByRole,
          type: 'student_move',
          description: `${data.lastModifiedByName || data.lastModifiedByEmail || 'Someone'} moved a student record between categories.`,
        });
        await maybeUpsertInterview(relocated, kind);
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
        const restored = await Live.create({ _id: inArch._id, ...inArch.toObject(), ...data, archived_at: null });
        await Arch.findByIdAndDelete(inArch._id);

        // Audit log + interview summary update
        await ActivityEvent.create({
          actorId: data.lastModifiedById,
          actorName: data.lastModifiedByName,
          actorEmail: data.lastModifiedByEmail,
          actorRole: data.lastModifiedByRole,
          type: 'student_restore',
          description: `${data.lastModifiedByName || data.lastModifiedByEmail || 'Someone'} restored a student record from archive.`,
        });
        await maybeUpsertInterview(restored, kind);
        return res.json({ doc: { _id: inArch._id } });
      }
    }
    const duplicate = nameSignature ? await Live.findOne(dupFilter).lean() : null;
    if (duplicate) return res.status(409).json({ error: 'A record with the same full name already exists.' });
    const created = await Live.create(id ? { _id: id, ...data, archived_at: null } : { ...data, archived_at: null });

    // Audit log + interview summary update
    await ActivityEvent.create({
      actorId: data.lastModifiedById,
      actorName: data.lastModifiedByName,
      actorEmail: data.lastModifiedByEmail,
      actorRole: data.lastModifiedByRole,
      type: 'student_add',
      description: `${data.lastModifiedByName || data.lastModifiedByEmail || 'Someone'} added a student record.`,
    });
    await maybeUpsertInterview(created, kind);
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
