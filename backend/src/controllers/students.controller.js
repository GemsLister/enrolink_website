import { getStudentModel } from '../models/Student.js';
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
    const Student = getStudentModel();
    const q = {};
    if (req.query.batch) q.batch = req.query.batch;
    if (req.query.recordCategory) q.recordCategory = req.query.recordCategory;
    const archived = String(req.query.archived || '').toLowerCase();
    if (archived === '1' || archived === 'true') {
      q.archived_at = { $ne: null };
    } else if (archived === '0') {
      q.$or = [{ archived_at: { $exists: false } }, { archived_at: null }];
    }
    const rows = await Student.find(q).lean();
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
    const Student = getStudentModel();
    const { id, __v, ...data } = req.body;

     const nameSignature = buildNameSignature(data);
     if (nameSignature) {
      data.nameSignature = nameSignature;
    }

    if (id) {
      const filter = { _id: id };
      if (__v !== undefined) filter.__v = __v;
      if (nameSignature) {
        const dupFilter = { nameSignature };
        if (data.batchId) dupFilter.batchId = data.batchId;
        else if (data.batch) dupFilter.batch = data.batch;
        const duplicate = await Student.findOne({ ...dupFilter, _id: { $ne: id } }).lean();
        if (duplicate) {
          return res.status(409).json({ error: 'A record with the same full name already exists.' });
        }
      }
      const result = await Student.updateOne(filter, { $set: data, $inc: { __v: 1 } });
      if ((result.modifiedCount ?? result.nModified ?? 0) === 0) {
        return res.status(409).json({ error: 'Conflict: record has been modified by another user' });
      }
      const doc = await Student.findById(id).lean();
      try {
        await sendGaEvent({
          userId: req.user && req.user.id,
          eventName: 'student_update',
          params: {
            batch: String(doc && (doc.batch || doc.batchId || '')),
            record_category: String(doc && (doc.recordCategory || ''))
          }
        })
      } catch (_) {}
      return res.json({ doc });
    }
    if (nameSignature) {
      const dupFilter = { nameSignature };
      if (data.batchId) dupFilter.batchId = data.batchId;
      else if (data.batch) dupFilter.batch = data.batch;
      const duplicate = await Student.findOne(dupFilter).lean();
      if (duplicate) {
        return res.status(409).json({ error: 'A record with the same full name already exists.' });
      }
    }
    const doc = await Student.create(data);
    try {
      await sendGaEvent({
        userId: req.user && req.user.id,
        eventName: 'student_create',
        params: {
          batch: String(doc && (doc.batch || doc.batchId || '')),
          record_category: String(doc && (doc.recordCategory || ''))
        }
      })
    } catch (_) {}
    res.json({ doc });
  } catch (e) {
    // eslint-disable-next-line no-console
    console.error('[students.controller.upsert] error:', e && e.stack ? e.stack : e);
    next(e);
  }
}

export async function remove(req, res, next) {
  try {
    const Student = getStudentModel();
    const Interview = getInterviewModel();
    const { id } = req.params;
    // Load student first to get identifying fields for cascading
    const student = await Student.findById(id).lean();
    await Student.findByIdAndDelete(id);
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
    const Student = getStudentModel();
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
