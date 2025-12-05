import { getRecordModel } from '../models/Record.js';
import { getStudentModel } from '../models/Student.js';
import { getBatchModel } from '../models/Batch.js';
import { getInterviewModel } from '../models/Interview.js';
import { getOfficerUserModel } from '../models/User.js';
import HeadUser from '../models/HeadUser.js';
import LoginEvent from '../models/LoginEvent.js';
import ActivityEvent from '../models/ActivityEvent.js';
import { statsFromBigQuery } from '../services/google/bigquery.js';

export async function stats(req, res, next) {
  try {
    const useBq = false;
    const year = req.query.year ? String(req.query.year) : '';

    if (false) {
      const data = await statsFromBigQuery(year);
      return res.json(data);
    }

    const Applicants = getRecordModel('applicants');
    const StudentsRec = getRecordModel('students');
    const EnrolleesRec = getRecordModel('enrollees');
    const Batch = getBatchModel();
  const Interview = getInterviewModel();

    let batchIds = undefined;
    if (year) {
      const batchesOfYear = await Batch.find({ year }).select('_id code index').lean();
      batchIds = batchesOfYear.map(b => b._id);
    }

    // Year filter: prefer batchId list, but also support Record.batch string year fallback
    const match = year
      ? (batchIds && batchIds.length
          ? { $or: [ { batchId: { $in: batchIds } }, { batch: year } ] }
          : { batch: year })
      : {};

    const totalApplicants = await Applicants.countDocuments(match);
    const interviewedApplicants = await Applicants.countDocuments({ ...match, status: { $in: ['INTERVIEWED', 'PASSED', 'FAILED', 'ENROLLED'] } });
    const passedApplicants = await Applicants.countDocuments({ ...match, status: { $in: ['PASSED', 'ENROLLED'] } });
    const totalEnrollees = await EnrolleesRec.countDocuments(match);
    const interviewedEnrollees = await EnrolleesRec.countDocuments({ ...match, status: { $in: ['INTERVIEWED', 'PASSED', 'FAILED', 'ENROLLED'] } });
    const passedEnrollees = await EnrolleesRec.countDocuments({ ...match, status: { $in: ['PASSED', 'ENROLLED'] } });
    const interviewedStudents = await StudentsRec.countDocuments({ ...match, status: { $in: ['INTERVIEWED', 'PASSED', 'FAILED', 'ENROLLED'] } });
    const passedStudents = await StudentsRec.countDocuments({ ...match, status: { $in: ['PASSED', 'ENROLLED'] } });
    const enrolled = await StudentsRec.countDocuments({ ...match, status: 'ENROLLED' });
    const awol = await StudentsRec.countDocuments({ ...match, status: 'AWOL' });

    const ivFilter = year ? { batch: year } : {};
    const interviewedFromIv = await Interview.countDocuments(ivFilter);
    const passedFromIv = await Interview.countDocuments({ ...ivFilter, result: 'PASSED' });
    const interviewed = interviewedApplicants;
    const passed = passedApplicants;

    // Batch analytics: count students per batch for selected year
    let batchAnalytics = [];
    if (batchIds && batchIds.length) {
      // Always return all batches of the year with counts (0 if none)
      const batches = await Batch.find({ _id: { $in: batchIds } })
        .sort({ index: 1 })
        .select('code index')
        .lean();
      const counts = await StudentsRec.aggregate([
        { $match: { batchId: { $in: batchIds } } },
        { $group: { _id: '$batchId', count: { $sum: 1 } } },
      ]);
      const countsMap = new Map(counts.map(c => [String(c._id), c.count]));
      batchAnalytics = batches.map(b => ({ code: b.code, count: countsMap.get(String(b._id)) || 0 }));
    }

    const basePie = interviewedEnrollees || totalEnrollees || 0;
    const pie = [
      ['Result', 'Percent'],
      ['Passed', basePie ? Math.min(100, Math.round((passedEnrollees / basePie) * 100)) : 0],
      ['Failed', basePie ? Math.max(0, 100 - Math.min(100, Math.round((passedEnrollees / basePie) * 100))) : 100],
    ];
    const column = [
      ['Batch', 'Count'],
      ...batchAnalytics.map(b => [String(b.code || ''), Number(b.count || 0)]),
    ];

    // Additional charts (course-specific): base on Enrollees records
    const enrollees = await EnrolleesRec.find(match)
      .select('firstName lastName course preferredCourse shsStrand interviewerDecision interviewDate percentileScore finalScore status')
      .lean();
    const classifyCourse = (s) => {
      const c = String(s.course || s.preferredCourse || '').toUpperCase();
      if (c.includes('EMC')) return 'EMC';
      if (c.includes('IT')) return 'IT';
      return 'OTHER';
    };
    const byCourse = { EMC: [], IT: [] };
    for (const s of enrollees) {
      const k = classifyCourse(s);
      if (k === 'EMC') byCourse.EMC.push(s);
      else if (k === 'IT') byCourse.IT.push(s);
    }
    const normStrand = (t) => {
      const v = String(t || '').trim().toUpperCase();
      if (!v) return '';
      if (v.includes('STEM')) return 'STEM';
      if (v.includes('ABM')) return 'ABM';
      if (v.includes('HUMSS')) return 'HUMSS';
      if (v.includes('TVL')) return 'TVL-ICT';
      return v;
    };
    const buildPassersByStrand = (rows) => {
      const passedRows = rows.filter(r => {
        const s = String(r.status || '').toUpperCase();
        const d = String(r.interviewerDecision || '').toUpperCase();
        return s === 'PASSED' || s === 'ENROLLED' || d === 'PASSED';
      });
      const counts = new Map();
      for (const r of passedRows) {
        const key = normStrand(r.shsStrand);
        if (!key) continue;
        counts.set(key, (counts.get(key) || 0) + 1);
      }
      const labels = Array.from(counts.keys()).sort((a,b) => {
        const order = { 'STEM': 0, 'ABM': 1, 'HUMSS': 2, 'TVL-ICT': 3 };
        const ai = order[a] ?? 99;
        const bi = order[b] ?? 99;
        return ai - bi;
      });
      const rowsData = labels.map(l => [l, counts.get(l)]);
      const totalPassed = passedRows.length;
      rowsData.push(['Grand Total', totalPassed]);
      return [['SHS Strand','No. of Students who passed interview'], ...rowsData];
    };

    // Map exam scores by student name (fallback)
    const ivRows = await Interview.find(ivFilter).select('studentName examScore').lean();
    const examMap = new Map();
    for (const iv of ivRows) {
      const key = String(iv.studentName || '').trim().toLowerCase();
      if (key) examMap.set(key, iv.examScore);
    }
    const formatPct = (val) => {
      if (val === undefined || val === null || val === '') return '';
      if (typeof val === 'number' && Number.isFinite(val)) return `${val.toFixed(2)}%`;
      const txt = String(val).trim();
      const m = txt.match(/^(\d+(?:\.\d+)?)\s*%?$/);
      return m ? `${parseFloat(m[1]).toFixed(2)}%` : txt;
    };
    const buildConfirmedByPercentile = (rows) => {
      const list = rows; // default: include all interviewees
      const counts = new Map();
      for (const r of list) {
        const name1 = `${r.firstName || ''} ${r.lastName || ''}`.trim().toLowerCase();
        const name2 = `${r.lastName || ''} ${r.firstName || ''}`.trim().toLowerCase();
        const fallback = examMap.get(name1) ?? examMap.get(name2);
        const label = formatPct(r.percentileScore ?? r.finalScore ?? fallback);
        if (!label) continue;
        counts.set(label, (counts.get(label) || 0) + 1);
      }
      const labels = Array.from(counts.keys()).sort((a,b) => {
        const pa = parseFloat(String(a).replace('%',''));
        const pb = parseFloat(String(b).replace('%',''));
        if (Number.isFinite(pa) && Number.isFinite(pb)) return pa - pb;
        return String(a).localeCompare(String(b));
      });
      const rowsData = labels.map(l => [l, counts.get(l)]);
      const total = list.length;
      rowsData.push(['Grand Total', total]);
      return [['Percentile Score','No of Confirmed Interviewees'], ...rowsData];
    };

    const emcPassersByStrand = buildPassersByStrand(byCourse.EMC);
    const itPassersByStrand = buildPassersByStrand(byCourse.IT);
    const emcConfirmedByPercentile = buildConfirmedByPercentile(byCourse.EMC);
    const itConfirmedByPercentile = buildConfirmedByPercentile(byCourse.IT);

    res.json({
      totals: { totalApplicants, interviewed, passedInterview: passed, enrolled, awol },
      batchAnalytics,
      charts: {
        passRatePie: pie,
        batchesColumn: column,
        emcPassersByStrand,
        itPassersByStrand,
        emcConfirmedByPercentile,
        itConfirmedByPercentile
      }
    });
  } catch (e) { next(e); }
}

export async function activity(req, res, next) {
  try {
    const OfficerUser = getOfficerUserModel();
    const Student = getStudentModel();
    const Batch = getBatchModel();
    const year = req.query.year ? String(req.query.year) : '';
    let batchIds = undefined;
    if (year) {
      const batchesOfYear = await Batch.find({ year }).select('_id code index').lean();
      batchIds = batchesOfYear.map(b => b._id);
    }
    let auditEvents = [];
    try {
      const auditRows = await ActivityEvent.find({})
        .sort({ createdAt: -1 })
        .limit(40)
        .lean();
      auditEvents = auditRows.map((ev) => ({
        id: String(ev._id),
        actor: ev.actorName || ev.actorEmail || 'Someone',
        action: ev.description || 'updated a student record.',
        when: ev.createdAt,
      }));
    } catch (_) {}

    const match = year
      ? (batchIds && batchIds.length
          ? { $or: [ { batchId: { $in: batchIds } }, { batch: year } ] }
          : { batch: year })
      : {};

    const rows = await Student.find(match)
      .sort({ updatedAt: -1 })
      .limit(20)
      .select('firstName lastName status interviewer updatedAt createdAt')
      .lean();

    const studentEventsDerived = rows.map(s => {
      const created = new Date(s.createdAt).getTime();
      const updated = new Date(s.updatedAt).getTime();
      const isAdded = Math.abs(updated - created) < 5000;
      const preferredActor = (s.interviewer || '').trim();
      let actor = preferredActor;
      if (!actor) {
        if (req.user) {
          const byName = (req.user.name || '').trim();
          const byFirstLast = `${req.user.firstName || ''} ${req.user.lastName || ''}`.trim();
          const byEmail = (req.user.email || '').trim();
          actor = byName || byFirstLast || byEmail || 'System';
        } else {
          actor = 'System';
        }
      }
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

    const oMatch = year ? { role: 'OFFICER', assignedYear: year } : { role: 'OFFICER' };
    const oRows = await OfficerUser.find(oMatch)
      .sort({ createdAt: -1 })
      .limit(10)
      .select('name email createdAt updatedAt')
      .lean();

    const officerEvents = oRows.map(o => {
      const created = new Date(o.createdAt).getTime();
      const updated = new Date(o.updatedAt).getTime();
      const isAdded = Math.abs(updated - created) < 5000;
      if (!isAdded) return null;
      const who = (o.name || o.email || 'Officer').toString();
      return {
        id: String(o._id || o.email || created),
        actor: who,
        action: 'accepted the officer invitation.',
        when: o.createdAt,
      };
    }).filter(Boolean);

    try {
      if (req.user && req.user.role === 'DEPT_HEAD') {
        const prefs = await HeadUser.findById(req.user.id).select('notifSystem').lean();
        if (prefs && prefs.notifSystem === false) {
          officerEvents.splice(0, officerEvents.length);
        }
      }
    } catch (_) {}

    // Recent login events (basic audit of head/officer logins)
    let loginEvents = [];
    try {
      const loginRows = await LoginEvent.find({})
        .sort({ createdAt: -1 })
        .limit(10)
        .lean();
      loginEvents = loginRows.map((ev) => {
        const who = (ev.email || ev.role || 'User').toString();
        let action = 'logged in.';
        if (ev.role === 'DEPT_HEAD') action = 'Department Head logged in.';
        if (ev.role === 'OFFICER') action = 'Enrollment Officer logged in.';
        return {
          id: String(ev._id || `${who}-${ev.createdAt}`),
          actor: who,
          action,
          when: ev.createdAt,
        };
      });
    } catch (_) {}

    const combined = [...auditEvents, ...studentEventsDerived, ...officerEvents, ...loginEvents].sort((a, b) => {
      const ta = new Date(a.when).getTime();
      const tb = new Date(b.when).getTime();
      return tb - ta;
    }).slice(0, 20);

    res.json({ events: combined });
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
