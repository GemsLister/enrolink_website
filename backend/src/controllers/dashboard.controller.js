import { getStudentModel } from '../models/Student.js';
import { getBatchModel } from '../models/Batch.js';

export async function stats(req, res, next) {
  try {
    const Student = getStudentModel();
    const Batch = getBatchModel();

    const year = req.query.year ? String(req.query.year) : '';
    let batchIds = undefined;
    if (year) {
      const batchesOfYear = await Batch.find({ year }).select('_id code index').lean();
      batchIds = batchesOfYear.map(b => b._id);
    }

    // Year filter: prefer batchId list, but also support Student.batch string year fallback
    const match = year
      ? (batchIds && batchIds.length
          ? { $or: [ { batchId: { $in: batchIds } }, { batch: year } ] }
          : { batch: year })
      : {};

    const total = await Student.countDocuments(match);
    const interviewed = await Student.countDocuments({ ...match, status: { $in: ['INTERVIEWED', 'PASSED', 'FAILED', 'ENROLLED'] } });
    const passed = await Student.countDocuments({ ...match, status: 'PASSED' });
    const enrolled = await Student.countDocuments({ ...match, status: 'ENROLLED' });
    const awol = await Student.countDocuments({ ...match, status: 'AWOL' });

    // Batch analytics: count students per batch for selected year
    let batchAnalytics = [];
    if (batchIds && batchIds.length) {
      // Always return all batches of the year with counts (0 if none)
      const batches = await Batch.find({ _id: { $in: batchIds } })
        .sort({ index: 1 })
        .select('code index')
        .lean();
      const counts = await Student.aggregate([
        { $match: { batchId: { $in: batchIds } } },
        { $group: { _id: '$batchId', count: { $sum: 1 } } },
      ]);
      const countsMap = new Map(counts.map(c => [String(c._id), c.count]));
      batchAnalytics = batches.map(b => ({ code: b.code, count: countsMap.get(String(b._id)) || 0 }));
    }

    res.json({ totals: { totalApplicants: total, interviewed, passedInterview: passed, enrolled, awol }, batchAnalytics });
  } catch (e) { next(e); }
}

export async function activity(req, res, next) {
  try {
    const Student = getStudentModel();
    const Batch = getBatchModel();

    const year = req.query.year ? String(req.query.year) : '';
    let batchIds = undefined;
    if (year) {
      const batchesOfYear = await Batch.find({ year }).select('_id').lean();
      batchIds = batchesOfYear.map(b => b._id);
    }

    const match = year
      ? (batchIds && batchIds.length
          ? { $or: [ { batchId: { $in: batchIds } }, { batch: year } ] }
          : { batch: year })
      : {};

    const rows = await Student.find(match)
      .sort({ updatedAt: -1 })
      .limit(20)
      .select('firstName lastName status updatedAt createdAt')
      .lean();

    const actor = (req.user && (req.user.firstName || req.user.lastName))
      ? `${req.user.firstName || ''} ${req.user.lastName || ''}`.trim()
      : 'System';

    const events = rows.map(s => {
      const created = new Date(s.createdAt).getTime();
      const updated = new Date(s.updatedAt).getTime();
      const isAdded = Math.abs(updated - created) < 5000; // 5s threshold
      let action = 'edited a student.';
      if (isAdded) action = 'added a student.';
      if (String(s.status).toUpperCase() === 'AWOL') action = 'archive a student.';
      return {
        id: String(s._id || `${s.firstName}-${s.lastName}-${updated}`),
        actor,
        action,
        when: s.updatedAt,
      };
    });

    res.json({ events });
  } catch (e) { next(e); }
}
