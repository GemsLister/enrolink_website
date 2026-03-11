import { getBatchModel } from '../models/Batch.js';
import { getRecordModel } from '../models/Record.js';
import { getOfficerUserModel } from '../models/User.js';

export async function list(req, res, next) {
  try {
    const Batch = getBatchModel();
    const Applicants = getRecordModel('applicants', false);
    const Enrollees = getRecordModel('enrollees', false);
    const Students = getRecordModel('students', false);
    const q = { archived: { $ne: true } };
    if (req.query.year) q.year = req.query.year;
    const batches = await Batch.find(q).lean();
    const ids = batches.map(b => b._id);

    const [aCounts, eCounts, sCounts] = await Promise.all([
      Applicants.aggregate([
        { $match: { batchId: { $in: ids } } },
        { $group: { _id: '$batchId', count: { $sum: 1 } } },
      ]),
      Enrollees.aggregate([
        { $match: { batchId: { $in: ids } } },
        { $group: { _id: '$batchId', count: { $sum: 1 } } },
      ]),
      Students.aggregate([
        { $match: { batchId: { $in: ids } } },
        { $group: { _id: '$batchId', count: { $sum: 1 } } },
      ]),
    ]);
    const countMap = new Map();
    for (const c of [...(aCounts || []), ...(eCounts || []), ...(sCounts || [])]) {
      const key = String(c._id);
      countMap.set(key, (countMap.get(key) || 0) + Number(c.count || 0));
    }
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
    const { year: rawYear, code: rawCode, interviewer = '', status = 'PENDING' } = req.body || {};
    const year = String(rawYear || new Date().getFullYear());
    const last = await Batch.findOne({ year }).sort({ index: -1 }).lean();
    const nextIndex = (last?.index || 0) + 1;
    let code = (rawCode ?? '').toString().trim();
    if (!code) {
      const padded = String(nextIndex).padStart(3, '0');
      code = `${year}-${padded}`;
    } else {
      const existing = await Batch.findOne({ code }).lean();
      if (existing) return res.status(400).json({ error: 'Batch code already exists' });
    }
    const requesterRole = req.user?.role || '';
    let safeInterviewer = (interviewer || '');
    // Officers can create batches, but the interviewer should always resolve to the logged-in officer
    if (requesterRole === 'OFFICER') {
      try {
        const User = getOfficerUserModel();
        const officer = await User.findById(req.user?.id).lean();
        safeInterviewer = String(officer?.name || officer?.email || interviewer || '').trim();
        if (officer?._id) {
          await User.findByIdAndUpdate(officer._id, { $addToSet: { assignedBatches: code } });
        }
      } catch (_) {
        safeInterviewer = String(interviewer || '').trim();
      }
    } else if (requesterRole === 'DEPT_HEAD') {
      // Department heads must select an officer when creating a batch
      if (!interviewer || !String(interviewer).trim()) {
        return res.status(400).json({ error: 'An officer must be selected to assign to this batch' });
      }
    }

    const doc = await Batch.create({ code, year, index: nextIndex, interviewer: safeInterviewer, status });

    // If an interviewer (officer) is specified (head flow), add this batch to their assignedBatches
    if (requesterRole !== 'OFFICER' && interviewer && typeof interviewer === 'string' && interviewer.trim()) {
      try {
        const User = getOfficerUserModel();
        const normalized = interviewer.trim().toLowerCase();
        // Try to match by name or email (case-insensitive)
        const officer = await User.findOne({
          $or: [
            { name: { $regex: `^${normalized}$`, $options: 'i' } },
            { email: { $regex: `^${normalized}$`, $options: 'i' } }
          ]
        });
        if (officer) {
          await User.findByIdAndUpdate(officer._id, {
            $addToSet: { assignedBatches: code }
          });
        }
      } catch (e) {
        console.warn('[batches.controller.create] failed to update officer assignedBatches:', e);
      }
    }
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
    const { id } = req.params;
    const doc = await Batch.findByIdAndUpdate(id, { $set: { archived: true, archivedAt: new Date() }, $inc: { __v: 1 } }, { new: true }).lean();
    if (!doc) return res.status(404).json({ error: 'Batch not found' });
    res.json({ archived: true, doc });
  } catch (e) {
    // eslint-disable-next-line no-console
    console.error('[batches.controller.remove] error:', e && e.stack ? e.stack : e);
    next(e);
  }
}

export async function students(req, res, next) {
  try {
    const { id } = req.params;
    const Applicants = getRecordModel('applicants', false);
    const Enrollees = getRecordModel('enrollees', false);
    const Students = getRecordModel('students', false);

    const [aRows, eRows, sRows] = await Promise.all([
      Applicants.find({ batchId: id }).lean(),
      Enrollees.find({ batchId: id }).lean(),
      Students.find({ batchId: id }).lean(),
    ]);

    // Return a single list (callers can display them together)
    const rows = [...(aRows || []), ...(eRows || []), ...(sRows || [])];
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

export async function archived(req, res, next) {
  try {
    const Batch = getBatchModel();
    const Applicants = getRecordModel('applicants', false);
    const Enrollees = getRecordModel('enrollees', false);
    const Students = getRecordModel('students', false);
    const batches = await Batch.find({ archived: true }).lean();
    const ids = batches.map(b => b._id);

    const [aCounts, eCounts, sCounts] = await Promise.all([
      Applicants.aggregate([
        { $match: { batchId: { $in: ids } } },
        { $group: { _id: '$batchId', count: { $sum: 1 } } },
      ]),
      Enrollees.aggregate([
        { $match: { batchId: { $in: ids } } },
        { $group: { _id: '$batchId', count: { $sum: 1 } } },
      ]),
      Students.aggregate([
        { $match: { batchId: { $in: ids } } },
        { $group: { _id: '$batchId', count: { $sum: 1 } } },
      ]),
    ]);
    const countMap = new Map();
    for (const c of [...(aCounts || []), ...(eCounts || []), ...(sCounts || [])]) {
      const key = String(c._id);
      countMap.set(key, (countMap.get(key) || 0) + Number(c.count || 0));
    }
    const rows = batches.map(b => ({
      id: String(b._id),
      code: b.code,
      year: b.year,
      index: b.index,
      interviewer: b.interviewer || '',
      status: b.status || 'PENDING',
      studentsCount: countMap.get(String(b._id)) || 0,
      createdAt: b.createdAt,
      archivedAt: b.archivedAt || null,
    }));
    res.json({ rows });
  } catch (e) {
    // eslint-disable-next-line no-console
    console.error('[batches.controller.archived] error:', e && e.stack ? e.stack : e);
    next(e);
  }
}

export async function restore(req, res, next) {
  try {
    const Batch = getBatchModel();
    const { id } = req.params;
    const doc = await Batch.findByIdAndUpdate(id, { $set: { archived: false, archivedAt: null }, $inc: { __v: 1 } }, { new: true }).lean();
    if (!doc) return res.status(404).json({ error: 'Batch not found' });
    res.json({ restored: true, doc });
  } catch (e) { next(e); }
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
    const Student = getRecordModel('students', false);
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
