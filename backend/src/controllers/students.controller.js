import { getStudentModel } from '../models/Student.js';
import { getInterviewModel } from '../models/Interview.js';

export async function list(req, res, next) {
  try {
    const Student = getStudentModel();
    const q = {};
    if (req.query.batch) q.batch = req.query.batch;
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
    if (id) {
      const filter = { _id: id };
      if (__v !== undefined) filter.__v = __v;
      const result = await Student.updateOne(filter, { $set: data, $inc: { __v: 1 } });
      if ((result.modifiedCount ?? result.nModified ?? 0) === 0) {
        return res.status(409).json({ error: 'Conflict: record has been modified by another user' });
      }
      const doc = await Student.findById(id).lean();
      return res.json({ doc });
    }
    const doc = await Student.create(data);
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
    res.json({ ok: true });
  } catch (e) {
    // eslint-disable-next-line no-console
    console.error('[students.controller.remove] error:', e && e.stack ? e.stack : e);
    next(e);
  }
}
