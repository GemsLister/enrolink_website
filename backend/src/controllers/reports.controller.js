import { getInterviewModel } from '../models/Interview.js';
import PDFDocument from 'pdfkit';
import { readSheet } from '../services/google/sheets.js';
import { getStudentModel } from '../models/Student.js';

export async function list(req, res, next) {
  try {
    // Build reports primarily from Student records so that what is visible on Student Records
    // is reflected here. Merge in Interview data (examScore, optional normalized result) by student name + batch.
    const Interview = getInterviewModel();
    const Student = getStudentModel();

    const studentFilter = {};
    if (req.query.batch) studentFilter.batch = req.query.batch;

    const students = await Student.find(studentFilter).lean();
    if (!students || students.length === 0) {
      return res.json({ rows: [] });
    }

    // Load interviews for the same batch scope (if any) and map by normalized name
    const interviewFilter = {};
    if (req.query.batch) interviewFilter.batch = req.query.batch;
    const interviews = await Interview.find(interviewFilter).lean();
    const ivMap = new Map();
    for (const iv of interviews) {
      const key = (iv.studentName || '').toString().trim().toLowerCase();
      if (!key) continue;
      ivMap.set(key, iv);
    }

    const rows = students.map((s) => {
      const name1 = `${s.firstName || ''} ${s.lastName || ''}`.trim();
      const name2 = `${s.lastName || ''} ${s.firstName || ''}`.trim();
      const iv = ivMap.get(name1.toLowerCase()) || ivMap.get(name2.toLowerCase());
      return {
        _id: s._id,
        studentName: name1 || name2 || '-',
        batch: s.batch || '',
        interviewerName: s.interviewer || (iv?.interviewerName || ''),
        date: s.interviewDate ? new Date(s.interviewDate) : (iv?.date || null),
        // Prefer Student.status so it matches Student Records; fallback to interview result
        result: (s.status || '').toString().toUpperCase() || (iv?.result || 'PENDING'),
        examScore: typeof iv?.examScore === 'number' ? iv.examScore : (iv?.examScore ?? undefined),
      };
    });

    res.json({ rows });
  } catch (e) { next(e); }
}


export async function createRecord(req, res, next) {
  try {
    const Interview = getInterviewModel();
    const { studentName, batch, date, result, examScore, interviewerName } = req.body || {};
    if (!studentName) return res.status(400).json({ error: 'studentName required' });
    // Upsert by studentName + batch
    const existing = await Interview.findOne({ studentName, ...(batch ? { batch } : {}) });
    if (existing) {
      const fields = { studentName, ...(batch ? { batch } : {}), ...(date ? { date } : {}), ...(result ? { result } : {}), ...(examScore !== undefined ? { examScore } : {}), ...(interviewerName ? { interviewerName } : {}) };
      const doc = await Interview.findByIdAndUpdate(existing._id, fields, { new: true }).lean();
      return res.json({ doc, upserted: true });
    }
    const doc = await Interview.create({ studentName, batch, date, result, examScore, interviewerName });
    res.json({ doc, created: true });
  } catch (e) { next(e); }
}

export async function remove(req, res, next) {
  try {
    const Interview = getInterviewModel();
    const { id } = req.params;
    await Interview.findByIdAndDelete(id);
    res.json({ ok: true });
  } catch (e) { next(e); }
}

export async function update(req, res, next) {
  try {
    const Interview = getInterviewModel();
    const { id } = req.params;
    const fields = ['studentName','batch','date','result','examScore','interviewerName'];
    const update = {};
    for (const f of fields) if (f in req.body) update[f] = req.body[f];
    const filter = { _id: id };
    if (req.body && req.body.__v !== undefined) filter.__v = req.body.__v;
    const result = await Interview.updateOne(filter, { $set: update, $inc: { __v: 1 } });
    if ((result.modifiedCount ?? result.nModified ?? 0) === 0) {
      return res.status(409).json({ error: 'Conflict: record has been modified by another user' });
    }
    const doc = await Interview.findById(id).lean();
    res.json({ doc });
  } catch (e) { next(e); }
}
export async function importFromSheets(req, res, next) {
  try {
    const Interview = getInterviewModel();
    const { spreadsheetId, range, batch } = req.body || {};
    if (!spreadsheetId || !range) return res.status(400).json({ error: 'spreadsheetId and range required' });
    const rows = await readSheet(spreadsheetId, range);
    let imported = 0;
    for (const r of rows) {
      // Expect columns: LastName, FirstName, Result, ExamScore
      const [lastName, firstName, resultRaw, scoreRaw] = r;
      const studentName = [firstName, lastName].filter(Boolean).join(' ').trim();
      if (!studentName) continue;
      const result = String(resultRaw || 'PENDING').toUpperCase();
      const examScore = scoreRaw !== undefined && scoreRaw !== '' ? Number(scoreRaw) : undefined;
      await Interview.create({ studentName, batch, result, examScore });
      imported += 1;
    }
    res.json({ imported });
  } catch (e) { next(e); }
}

export async function pdf(req, res, next) {
  try {
    // Build the same unified dataset as in list()
    const Interview = getInterviewModel();
    const Student = getStudentModel();
    const studentFilter = {};
    if (req.query.batch) studentFilter.batch = req.query.batch;
    const students = await Student.find(studentFilter).lean();
    let rows = [];
    if (students && students.length) {
      const interviewFilter = {};
      if (req.query.batch) interviewFilter.batch = req.query.batch;
      const interviews = await Interview.find(interviewFilter).lean();
      const ivMap = new Map();
      for (const iv of interviews) {
        const key = (iv.studentName || '').toString().trim().toLowerCase();
        if (!key) continue;
        ivMap.set(key, iv);
      }
      rows = students.map((s) => {
        const name1 = `${s.firstName || ''} ${s.lastName || ''}`.trim();
        const name2 = `${s.lastName || ''} ${s.firstName || ''}`.trim();
        const iv = ivMap.get(name1.toLowerCase()) || ivMap.get(name2.toLowerCase());
        return {
          studentName: name1 || name2 || '-',
          batch: s.batch || '',
          interviewerName: s.interviewer || (iv?.interviewerName || ''),
          date: s.interviewDate ? new Date(s.interviewDate) : (iv?.date || null),
          result: (s.status || '').toString().toUpperCase() || (iv?.result || 'PENDING'),
          examScore: typeof iv?.examScore === 'number' ? iv.examScore : (iv?.examScore ?? undefined),
        };
      });
    }

    const doc = new PDFDocument({ margin: 40 });
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'inline; filename="interview-report.pdf"');
    doc.pipe(res);

    doc.fontSize(18).text('Interview Report', { align: 'center' });
    if (req.query.batch) doc.moveDown(0.5).fontSize(12).text(`Batch: ${req.query.batch}`, { align: 'center' });
    doc.moveDown();

    // Header matching fields visible in Student Records
    doc.fontSize(12).text('Student Name', 40, doc.y, { continued: true });
    doc.text('Batch', 200, doc.y, { continued: true });
    doc.text('Interviewer', 260, doc.y, { continued: true });
    doc.text('Interview Date', 360, doc.y, { continued: true });
    doc.text('Status', 460, doc.y, { continued: true });
    doc.text('Exam Score', 520, doc.y);
    doc.moveDown(0.5);
    doc.moveTo(40, doc.y).lineTo(570, doc.y).stroke();

    rows.forEach(r => {
      const date = r.date ? new Date(r.date).toLocaleDateString() : '-';
      const score = (typeof r.examScore === 'number' ? r.examScore : (r.examScore ?? '-'));
      doc.text(`${r.studentName || '-'}`, 40, doc.y, { continued: true });
      doc.text(`${r.batch || '-'}`, 200, doc.y, { continued: true });
      doc.text(`${r.interviewerName || '-'}`, 260, doc.y, { continued: true });
      doc.text(`${date}`, 360, doc.y, { continued: true });
      doc.text(`${r.result || 'PENDING'}`, 460, doc.y, { continued: true });
      doc.text(`${score}`, 520, doc.y);
    });

    doc.end();
  } catch (e) { next(e); }
}
