import { getBatchModel } from '../models/Batch.js';
import { getStudentModel } from '../models/Student.js';

export async function list(req, res, next) {
  try {
    const Batch = getBatchModel();
    const Student = getStudentModel();
    const q = {};
    if (req.query.year) q.year = req.query.year;
    const batches = await Batch.find(q).lean();
    const ids = batches.map(b => b._id);
    const counts = await Student.aggregate([
      { $match: { batchId: { $in: ids } } },
      { $group: { _id: '$batchId', count: { $sum: 1 } } },
    ]);
    const countMap = new Map(counts.map(c => [String(c._id), c.count]));
    const rows = batches.map(b => ({
      id: String(b._id),
      code: b.code,
      year: b.year,
      index: b.index,
      interviewer: b.interviewer || '',
      status: b.status || 'PENDING',
      studentsCount: countMap.get(String(b._id)) || 0,
      createdAt: b.createdAt,
    }));
    res.json({ rows });
  } catch (e) {
    // eslint-disable-next-line no-console
    console.error('[batches.controller.list] error:', e && e.stack ? e.stack : e);
    next(e);
  }
}

export async function create(req, res, next) {
  try {
    const Batch = getBatchModel();
    const { year: rawYear, interviewer = '', status = 'PENDING' } = req.body || {};
    const year = String(rawYear || new Date().getFullYear());
    const last = await Batch.findOne({ year }).sort({ index: -1 }).lean();
    const nextIndex = (last?.index || 0) + 1;
    const padded = String(nextIndex).padStart(3, '0');
    const code = `${year}-${padded}`;
    const requesterRole = req.user?.role || '';
    const safeInterviewer = requesterRole === 'OFFICER' ? '' : (interviewer || '');
    const doc = await Batch.create({ code, year, index: nextIndex, interviewer: safeInterviewer, status });
    res.json({ doc });
  } catch (e) {
    // eslint-disable-next-line no-console
    console.error('[batches.controller.create] error:', e && e.stack ? e.stack : e);
    next(e);
  }
}

export async function remove(req, res, next) {
  try {
    const Batch = getBatchModel();
    const Student = getStudentModel();
    const { id } = req.params;
    const cascade = String(req.query.cascade || '').toLowerCase() === 'true';
    const count = await Student.countDocuments({ batchId: id });
    if (count > 0 && !cascade) {
      return res.status(400).json({ error: 'Batch not empty. Use ?cascade=true to delete with students.' });
    }
    if (cascade) {
      await Student.deleteMany({ batchId: id });
    }
    await Batch.findByIdAndDelete(id);
    res.json({ ok: true });
  } catch (e) {
    // eslint-disable-next-line no-console
    console.error('[batches.controller.remove] error:', e && e.stack ? e.stack : e);
    next(e);
  }
}

export async function students(req, res, next) {
  try {
    const Student = getStudentModel();
    const { id } = req.params;
    const rows = await Student.find({ batchId: id }).lean();
    res.json({ rows });
  } catch (e) {
    // eslint-disable-next-line no-console
    console.error('[batches.controller.students] error:', e && e.stack ? e.stack : e);
    next(e);
  }
}

export async function update(req, res, next) {
  try {
    const Batch = getBatchModel();
    const { id } = req.params;
    const requesterRole = req.user?.role || '';
    const updates = {};
    if (requesterRole === 'DEPT_HEAD') {
      if (typeof req.body.interviewer === 'string') updates.interviewer = req.body.interviewer;
      if (typeof req.body.status === 'string') updates.status = req.body.status;
    }
    const doc = await Batch.findByIdAndUpdate(id, { $set: updates }, { new: true }).lean();
    if (!doc) return res.status(404).json({ error: 'Batch not found' });
    res.json({ doc });
  } catch (e) {
    // eslint-disable-next-line no-console
    console.error('[batches.controller.update] error:', e && e.stack ? e.stack : e);
    next(e);
  }
}

function isDateInAcademicYear(d, yearStr) {
  if (!d || !yearStr) return false;
  const year = Number(String(yearStr));
  if (!Number.isFinite(year)) return false;
  const dt = new Date(d);
  if (isNaN(dt.getTime())) return false;
  const start = new Date(year, 0, 1);
  const end = new Date(year, 11, 31, 23, 59, 59, 999);
  return dt >= start && dt <= end;
}

export async function setSchedule(req, res, next) {
  try {
    const Batch = getBatchModel();
    const { id } = req.params;
    const { defaultInterviewDate } = req.body || {};
    const doc = await Batch.findById(id);
    if (!doc) return res.status(404).json({ error: 'Batch not found' });
    if (defaultInterviewDate) {
      if (!isDateInAcademicYear(defaultInterviewDate, doc.year)) {
        return res.status(400).json({ error: 'Date is outside of academic year' });
      }
      doc.defaultInterviewDate = new Date(defaultInterviewDate);
    } else {
      doc.defaultInterviewDate = undefined;
    }
    await doc.save();
    res.json({ doc });
  } catch (e) { next(e); }
}

export async function applyInterviewDate(req, res, next) {
  try {
    const Batch = getBatchModel();
    const Student = getStudentModel();
    const { id } = req.params;
    const { overwrite = false, onlyEmpty = true } = req.body || {};
    const batch = await Batch.findById(id).lean();
    if (!batch) return res.status(404).json({ error: 'Batch not found' });
    if (!batch.defaultInterviewDate) return res.status(400).json({ error: 'Batch has no defaultInterviewDate' });
    const dateStr = new Date(batch.defaultInterviewDate).toISOString().slice(0, 10);
    const q = { batchId: id };
    if (onlyEmpty && !overwrite) q.$or = [{ interviewDate: { $exists: false } }, { interviewDate: '' }, { interviewDate: null }];
    const result = await Student.updateMany(q, { $set: { interviewDate: dateStr } });
    res.json({ matched: result.matchedCount ?? result.n, modified: result.modifiedCount ?? result.nModified });
  } catch (e) { next(e); }
}
