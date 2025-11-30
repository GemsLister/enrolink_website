import { getStudentModel } from '../models/Student.js';
import { getBatchModel } from '../models/Batch.js';
import { getInterviewModel } from '../models/Interview.js';
import { statsFromBigQuery } from '../services/google/bigquery.js';

export async function stats(req, res, next) {
  try {
    const useBq = false;
    const year = req.query.year ? String(req.query.year) : '';

    if (false) {
      const data = await statsFromBigQuery(year);
      return res.json(data);
    }

    const Student = getStudentModel();
    const Batch = getBatchModel();
    const Interview = getInterviewModel();

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
    let interviewed = await Student.countDocuments({ ...match, status: { $in: ['INTERVIEWED', 'PASSED', 'FAILED', 'ENROLLED'] } });
    let passed = await Student.countDocuments({ ...match, status: { $in: ['PASSED', 'ENROLLED'] } });
    const enrolled = await Student.countDocuments({ ...match, status: 'ENROLLED' });
    const awol = await Student.countDocuments({ ...match, status: 'AWOL' });

    const ivFilter = year ? { batch: year } : {};
    const interviewedFromIv = await Interview.countDocuments(ivFilter);
    const passedFromIv = await Interview.countDocuments({ ...ivFilter, result: 'PASSED' });
    interviewed = Math.max(interviewed, interviewedFromIv);
    passed = Math.max(passed, passedFromIv);

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

    const base = interviewed || total || 0;
    const pie = [
      ['Result', 'Percent'],
      ['Failed', base ? Math.max(0, 100 - Math.min(100, Math.round((passed / base) * 100))) : 100],
      ['Passed', base ? Math.min(100, Math.round((passed / base) * 100)) : 0],
    ];
    const column = [
      ['Batch', 'Count'],
      ...batchAnalytics.map(b => [String(b.code || ''), Number(b.count || 0)]),
    ];
    res.json({ totals: { totalApplicants: total, interviewed, passedInterview: passed, enrolled, awol }, batchAnalytics, charts: { passRatePie: pie, batchesColumn: column } });
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

    let actor = 'System';
    if (req.user) {
      const byName = (req.user.name || '').trim();
      const byFirstLast = `${req.user.firstName || ''} ${req.user.lastName || ''}`.trim();
      const byEmail = (req.user.email || '').trim();
      actor = byName || byFirstLast || byEmail || 'System';
    }

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

export async function pushGa(req, res, next) {
  try {
    const Student = getStudentModel();
    const Batch = getBatchModel();
    const Interview = getInterviewModel();
    const measurementId = process.env.GA_MEASUREMENT_ID;
    const apiSecret = process.env.GA_API_SECRET;
    if (!measurementId || !apiSecret) {
      return res.status(400).json({ error: 'Missing GA configuration' });
    }
    const year = req.query.year ? String(req.query.year) : '';
    let batchIds = undefined;
    if (year) {
      const batchesOfYear = await Batch.find({ year }).select('_id code index').lean();
      batchIds = batchesOfYear.map(b => b._id);
    }
    const match = year
      ? (batchIds && batchIds.length
          ? { $or: [ { batchId: { $in: batchIds } }, { batch: year } ] }
          : { batch: year })
      : {};
    const total = await Student.countDocuments(match);
    let interviewed = await Student.countDocuments({ ...match, status: { $in: ['INTERVIEWED', 'PASSED', 'FAILED', 'ENROLLED'] } });
    let passed = await Student.countDocuments({ ...match, status: { $in: ['PASSED', 'ENROLLED'] } });
    const enrolled = await Student.countDocuments({ ...match, status: 'ENROLLED' });
    const awol = await Student.countDocuments({ ...match, status: 'AWOL' });

    const ivFilter = year ? { batch: year } : {};
    const interviewedFromIv = await Interview.countDocuments(ivFilter);
    const passedFromIv = await Interview.countDocuments({ ...ivFilter, result: 'PASSED' });
    interviewed = Math.max(interviewed, interviewedFromIv);
    passed = Math.max(passed, passedFromIv);
    let batchAnalytics = [];
    if (batchIds && batchIds.length) {
      const counts = await Student.aggregate([
        { $match: { batchId: { $in: batchIds } } },
        { $group: { _id: '$batchId', count: { $sum: 1 } } },
      ]);
      const countsMap = new Map(counts.map(c => [String(c._id), c.count]));
      const batches = await Batch.find({ _id: { $in: batchIds } }).sort({ index: 1 }).select('code index').lean();
      batchAnalytics = batches.map(b => ({ code: b.code, count: countsMap.get(String(b._id)) || 0 }));
    }
    const base = interviewed || total || 0;
    const passRate = base ? Math.round((passed / base) * 100) : 0;
    const url = `https://www.google-analytics.com/mp/collect?measurement_id=${encodeURIComponent(measurementId)}&api_secret=${encodeURIComponent(apiSecret)}`;
    const clientId = String(req.user?.id || 'enrolink-head');
    const events = [];
    events.push({ name: 'pass_rate', params: { year: year || '', total_applicants: total, interviewed, passed, enrolled, awol, pass_rate: passRate } });
    for (const b of batchAnalytics) {
      events.push({ name: 'batch_count', params: { year: year || '', batch_code: b.code, count: b.count } });
    }
    const _fetch = typeof globalThis.fetch === 'function' ? globalThis.fetch : (await import('node-fetch')).default;
    const resp = await _fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ client_id: clientId, events })
    });
    if (!resp.ok) {
      const txt = await resp.text().catch(() => '');
      return res.status(502).json({ error: 'GA push failed', details: txt });
    }
    res.json({ ok: true, pushed: events.length });
  } catch (e) { next(e); }
}
