import { getInterviewModel } from '../models/Interview.js';
import PDFDocument from 'pdfkit';
import { readSheet } from '../services/google/sheets.js';
import { getStudentModel } from '../models/Student.js';
import fs from 'fs';
import path from 'path';

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

    const doc = new PDFDocument({ margin: 40, size: 'A4', layout: 'landscape' });
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'inline; filename="interview-report.pdf"');
    doc.pipe(res);

    let pageIndex = 0;
    const logoCandidates = [
      path.resolve(process.cwd(), 'frontend/src/assets/enrolink-logo 2.png'),
      path.resolve(process.cwd(), '../frontend/src/assets/enrolink-logo 2.png'),
    ];
    let logoPath = '';
    for (const p of logoCandidates) { if (!logoPath && fs.existsSync(p)) logoPath = p; }

    const drawChrome = () => {
      pageIndex += 1;
      const pw = doc.page.width;
      const ph = doc.page.height;
      const ml = doc.page.margins.left;
      const mr = doc.page.margins.right;
      const mb = doc.page.margins.bottom;
      const availableW = pw - ml - mr;
      const pillW = 160;
      const pillH = 42;
      const pillX = ml + (availableW - pillW) / 2;
      const pillY = 24;
      doc.save();
      doc.roundedRect(pillX, pillY, pillW, pillH, 21).fill('#e8c9ad');
      doc.restore();
      if (logoPath) {
        const imgW = 120;
        const imgH = 30;
        const imgX = ml + (availableW - imgW) / 2;
        const imgY = pillY + (pillH - imgH) / 2;
        try { doc.image(logoPath, imgX, imgY, { width: imgW, height: imgH }); } catch (_) {}
      } else {
        doc.fontSize(14).fillColor('#3a2a22').text('enrolink logo', pillX + 20, pillY + 12);
      }
      doc.fillColor('#000000');
      doc.fontSize(16).text('Records Summary', ml, pillY + pillH + 18, { width: availableW, align: 'center' });
      const rectY = pillY + pillH + 40;
      const rectH = ph - rectY - mb - 36;
      doc.save();
      doc.roundedRect(ml, rectY, availableW, rectH, 18).fill('#e8c9ad');
      doc.restore();
      doc.fontSize(11);
      const xName = ml + availableW * 0.02;
      const xBatch = ml + availableW * 0.30;
      const xInterviewer = ml + availableW * 0.46;
      const xDate = ml + availableW * 0.64;
      const xStatus = ml + availableW * 0.80;
      const xScore = ml + availableW * 0.92;
      const yHeader = rectY + 14;
      doc.text('Student Name', xName, yHeader, { continued: true });
      doc.text('Batch', xBatch, yHeader, { continued: true });
      doc.text('Interviewer', xInterviewer, yHeader, { continued: true });
      doc.text('Interview Date', xDate, yHeader, { continued: true });
      doc.text('Status', xStatus, yHeader, { continued: true });
      doc.text('Exam Score', xScore, yHeader);
      doc.moveTo(ml + 10, yHeader + 14).lineTo(ml + availableW - 10, yHeader + 14).stroke();
      const ts = new Date().toISOString().replace(/[-:.TZ]/g, '').slice(0, 14);
      const uid = `${ts}-${String(pageIndex).padStart(2,'0')}`;
      doc.fontSize(10).text(`ID ${uid}`, ml, ph - mb + 10);
      doc.text(`Page ${pageIndex}`, pw - mr - 60, ph - mb + 10);
      doc.y = yHeader + 20;
      return { xName, xBatch, xInterviewer, xDate, xStatus, xScore };
    };

    let cols = drawChrome();
    rows.forEach(r => {
      const date = r.date ? new Date(r.date).toLocaleDateString() : '-';
      const score = (typeof r.examScore === 'number' ? r.examScore : (r.examScore ?? '-'));
      if (doc.y > doc.page.height - doc.page.margins.bottom - 40) { doc.addPage(); cols = drawChrome(); }
      const y = doc.y;
      doc.text(`${r.studentName || '-'}`, cols.xName, y, { continued: true });
      doc.text(`${r.batch || '-'}`, cols.xBatch, y, { continued: true });
      doc.text(`${r.interviewerName || '-'}`, cols.xInterviewer, y, { continued: true });
      doc.text(`${date}`, cols.xDate, y, { continued: true });
      doc.text(`${r.result || 'PENDING'}`, cols.xStatus, y, { continued: true });
      doc.text(`${score}`, cols.xScore, y);
    });

    doc.end();
  } catch (e) { next(e); }
}
