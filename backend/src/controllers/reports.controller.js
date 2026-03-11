import { getInterviewModel } from '../models/Interview.js';
import PDFDocument from 'pdfkit';
import { readSheet } from '../services/google/sheets.js';
import { getStudentModel } from '../models/Student.js';
import { getBatchModel } from '../models/Batch.js';
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

export async function getBatchReport(req, res, next) {
  try {
    const { batch } = req.query;
    if (!batch) return res.status(400).json({ error: 'Batch required' });

    const Batch = getBatchModel();
    const Student = getStudentModel();
    const Interview = getInterviewModel();

    // Get batch details
    const batchDoc = await Batch.findOne({ code: batch }).lean();
    
    // Get all students in this batch
    const students = await Student.find({ batch }).lean();
    
    // Get interview data
    const interviews = await Interview.find({ batch }).lean();
    const ivMap = new Map();
    for (const iv of interviews) {
      const key = (iv.studentName || '').toString().trim().toLowerCase();
      if (!key) continue;
      ivMap.set(key, iv);
    }

    // Build student list with interview data
    const studentList = students.map((s) => {
      const name1 = `${s.firstName || ''} ${s.lastName || ''}`.trim();
      const name2 = `${s.lastName || ''} ${s.firstName || ''}`.trim();
      const iv = ivMap.get(name1.toLowerCase()) || ivMap.get(name2.toLowerCase());
      return {
        _id: s._id,
        studentName: name1 || name2 || '-',
        batch: s.batch || '',
        email: s.email || '',
        contact: s.contact || '',
        course: s.course || '',
        enrollmentStatus: s.enrollmentStatus || 'PENDING',
        interviewer: s.interviewer || (iv?.interviewerName || ''),
        interviewDate: s.interviewDate ? new Date(s.interviewDate).toLocaleDateString() : (iv?.date ? new Date(iv.date).toLocaleDateString() : '-'),
        status: (s.status || '').toString().toUpperCase() || (iv?.result || 'PENDING'),
        examScore: typeof iv?.examScore === 'number' ? iv.examScore : (iv?.examScore ?? undefined),
      };
    });

    // Calculate summary statistics
    const stats = {
      totalStudents: studentList.length,
      enrolled: studentList.filter(s => s.status === 'ENROLLED' || s.enrollmentStatus === 'ENROLLED').length,
      pending: studentList.filter(s => s.status === 'PENDING' || s.enrollmentStatus === 'PENDING').length,
      passed: studentList.filter(s => s.status === 'PASSED').length,
      failed: studentList.filter(s => s.status === 'FAILED').length,
      interviewed: studentList.filter(s => s.interviewDate !== '-').length,
      averageScore: studentList
        .filter(s => typeof s.examScore === 'number')
        .reduce((sum, s) => sum + (s.examScore || 0), 0) / 
        Math.max(1, studentList.filter(s => typeof s.examScore === 'number').length),
    };

    res.json({
      batch: batchDoc || { code: batch, year: batch, status: 'UNKNOWN' },
      stats,
      students: studentList,
    });
  } catch (e) { next(e); }
}

export async function getBatchReportPdf(req, res, next) {
  try {
    const { batch } = req.query;
    if (!batch) return res.status(400).json({ error: 'Batch required' });

    const Batch = getBatchModel();
    const Student = getStudentModel();
    const Interview = getInterviewModel();

    // Get batch details
    const batchDoc = await Batch.findOne({ code: batch }).lean();
    
    // Get all students in this batch
    const students = await Student.find({ batch }).lean();
    
    // Get interview data
    const interviews = await Interview.find({ batch }).lean();
    const ivMap = new Map();
    for (const iv of interviews) {
      const key = (iv.studentName || '').toString().trim().toLowerCase();
      if (!key) continue;
      ivMap.set(key, iv);
    }

    // Build student list with interview data
    const studentList = students.map((s) => {
      const name1 = `${s.firstName || ''} ${s.lastName || ''}`.trim();
      const name2 = `${s.lastName || ''} ${s.firstName || ''}`.trim();
      const iv = ivMap.get(name1.toLowerCase()) || ivMap.get(name2.toLowerCase());
      return {
        studentName: name1 || name2 || '-',
        batch: s.batch || '',
        email: s.email || '',
        contact: s.contact || '',
        course: s.course || '',
        enrollmentStatus: s.enrollmentStatus || 'PENDING',
        interviewer: s.interviewer || (iv?.interviewerName || ''),
        interviewDate: s.interviewDate ? new Date(s.interviewDate).toLocaleDateString() : (iv?.date ? new Date(iv.date).toLocaleDateString() : '-'),
        status: (s.status || '').toString().toUpperCase() || (iv?.result || 'PENDING'),
        examScore: typeof iv?.examScore === 'number' ? iv.examScore : (iv?.examScore ?? undefined),
      };
    });

    // Calculate summary statistics
    const stats = {
      totalStudents: studentList.length,
      enrolled: studentList.filter(s => s.status === 'ENROLLED' || s.enrollmentStatus === 'ENROLLED').length,
      pending: studentList.filter(s => s.status === 'PENDING' || s.enrollmentStatus === 'PENDING').length,
      passed: studentList.filter(s => s.status === 'PASSED').length,
      failed: studentList.filter(s => s.status === 'FAILED').length,
      interviewed: studentList.filter(s => s.interviewDate !== '-').length,
      averageScore: studentList
        .filter(s => typeof s.examScore === 'number')
        .reduce((sum, s) => sum + (s.examScore || 0), 0) / 
        Math.max(1, studentList.filter(s => typeof s.examScore === 'number').length),
    };

    const doc = new PDFDocument({ margin: 40, size: 'A4', layout: 'landscape' });
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="batch-${batch}-report.pdf"`);
    doc.pipe(res);

    let pageIndex = 0;
    const logoCandidates = [
      path.resolve(process.cwd(), 'frontend/src/assets/enrolink-logo 2.png'),
      path.resolve(process.cwd(), '../frontend/src/assets/enrolink-logo 2.png'),
    ];
    let logoPath = '';
    for (const p of logoCandidates) { if (!logoPath && fs.existsSync(p)) logoPath = p; }

    const drawChrome = (isFirstPage = false) => {
      pageIndex += 1;
      if (!isFirstPage) doc.addPage();
      
      const pw = doc.page.width;
      const ph = doc.page.height;
      const ml = doc.page.margins.left;
      const mr = doc.page.margins.right;
      const mb = doc.page.margins.bottom;
      const availableW = pw - ml - mr;
      const pillW = 180;
      const pillH = 42;
      const pillX = ml + (availableW - pillW) / 2;
      const pillY = 24;
      
      doc.save();
      doc.roundedRect(pillX, pillY, pillW, pillH, 21).fill('#e8c9ad');
      doc.restore();
      
      if (logoPath) {
        const imgW = 140;
        const imgH = 30;
        const imgX = ml + (availableW - imgW) / 2;
        const imgY = pillY + (pillH - imgH) / 2;
        try { doc.image(logoPath, imgX, imgY, { width: imgW, height: imgH }); } catch (_) {}
      } else {
        doc.fontSize(14).fillColor('#3a2a22').text('enrolink', pillX + 20, pillY + 12);
      }
      
      doc.fillColor('#000000');
      doc.fontSize(16).text('Batch Report', ml, pillY + pillH + 18, { width: availableW, align: 'center' });
      
      const ts = new Date().toISOString().replace(/[-:.TZ]/g, '').slice(0, 14);
      const uid = `${ts}-${String(pageIndex).padStart(2,'0')}`;
      doc.fontSize(10).text(`ID ${uid}`, ml, ph - mb + 10);
      doc.text(`Page ${pageIndex}`, pw - mr - 60, ph - mb + 10);
      
      return { ml, mr, mb, availableW, ph, pillY, pillH };
    };

    // First page: Summary statistics
    let layout = drawChrome(true);
    doc.fontSize(12);
    
    doc.y = layout.pillY + layout.pillH + 40;
    doc.fontSize(14).fillColor('#5b1a30').text(`Batch Report: ${batch}`, layout.ml, doc.y);
    doc.y += 30;
    
    doc.fontSize(11).fillColor('#5b1a30').text('Summary Statistics', layout.ml, doc.y);
    doc.y += 15;
    
    // Create a 4-column grid for stats
    const statBoxWidth = (layout.availableW - 20) / 4;
    const statBoxHeight = 50;
    const statsData = [
      { label: 'Total Students', value: stats.totalStudents },
      { label: 'Enrolled', value: stats.enrolled },
      { label: 'Pending', value: stats.pending },
      { label: 'Passed', value: stats.passed },
      { label: 'Failed', value: stats.failed },
      { label: 'Interviewed', value: stats.interviewed },
      { label: 'Average Score', value: stats.averageScore.toFixed(2) },
      { label: 'Avg Exam Score', value: stats.averageScore.toFixed(2) },
    ];
    
    let statsIdx = 0;
    for (let row = 0; row < 2; row++) {
      for (let col = 0; col < 4; col++) {
        if (statsIdx >= statsData.length) break;
        const stat = statsData[statsIdx];
        const boxX = layout.ml + col * (statBoxWidth + 5);
        const boxY = doc.y;
        
        // Draw box
        doc.save();
        doc.strokeColor('#d9a5a5').lineWidth(1);
        doc.rect(boxX, boxY, statBoxWidth, statBoxHeight).stroke();
        doc.restore();
        
        // Label
        doc.fontSize(9).fillColor('#8b4a5d').text(stat.label, boxX + 5, boxY + 5, { width: statBoxWidth - 10, align: 'center' });
        
        // Value
        doc.fontSize(16).fillColor('#8b0000').text(String(stat.value), boxX + 5, boxY + 22, { width: statBoxWidth - 10, align: 'center' });
        
        statsIdx++;
      }
      doc.y += statBoxHeight + 10;
    }

    // Students table on following pages
    const xName = layout.ml;
    const xEmail = layout.ml + layout.availableW * 0.22;
    const xCourse = layout.ml + layout.availableW * 0.40;
    const xStatus = layout.ml + layout.availableW * 0.58;
    const xScore = layout.ml + layout.availableW * 0.75;
    const xInterview = layout.ml + layout.availableW * 0.90;

    doc.fontSize(11).fillColor('#5b1a30').text('Student Details', layout.ml, doc.y);
    doc.y += 18;

    // Header row with background
    doc.save();
    doc.fillColor('#f3d5d5');
    doc.rect(layout.ml, doc.y - 5, layout.availableW, 20).fill();
    doc.restore();
    
    doc.fontSize(10).fillColor('#5b1a30');
    const headerY = doc.y;
    doc.text('Student Name', xName, headerY, { width: xEmail - xName - 5 });
    doc.text('Email', xEmail, headerY, { width: xCourse - xEmail - 5 });
    doc.text('Course', xCourse, headerY, { width: xStatus - xCourse - 5 });
    doc.text('Status', xStatus, headerY, { width: xScore - xStatus - 5 });
    doc.text('Score', xScore, headerY, { width: xInterview - xScore - 5 });
    doc.text('Interviewed', xInterview, headerY);
    
    doc.y += 20;
    doc.moveTo(layout.ml, doc.y).lineTo(layout.ml + layout.availableW, doc.y).strokeColor('#d9a5a5').stroke();
    doc.y += 8;

    studentList.forEach((student, idx) => {
      if (doc.y > layout.ph - layout.mb - 50) {
        layout = drawChrome(false);
        doc.y = layout.pillY + layout.pillH + 40;
        doc.fontSize(11).fillColor('#5b1a30').text('Student Details (continued)', layout.ml, doc.y);
        doc.y += 18;
        
        // Repeat header
        doc.save();
        doc.fillColor('#f3d5d5');
        doc.rect(layout.ml, doc.y - 5, layout.availableW, 20).fill();
        doc.restore();
        doc.fontSize(10).fillColor('#5b1a30');
        doc.text('Student Name', xName, doc.y, { width: xEmail - xName - 5 });
        doc.text('Email', xEmail, doc.y, { width: xCourse - xEmail - 5 });
        doc.text('Course', xCourse, doc.y, { width: xStatus - xCourse - 5 });
        doc.text('Status', xStatus, doc.y, { width: xScore - xStatus - 5 });
        doc.text('Score', xScore, doc.y, { width: xInterview - xScore - 5 });
        doc.text('Interviewed', xInterview, doc.y);
        doc.y += 20;
        doc.moveTo(layout.ml, doc.y).lineTo(layout.ml + layout.availableW, doc.y).strokeColor('#d9a5a5').stroke();
        doc.y += 8;
      }

      const studentY = doc.y;
      const score = typeof student.examScore === 'number' ? student.examScore : '-';
      const interviewed = student.interviewDate !== '-' ? 'Yes' : 'No';
      
      // Alternate row colors
      if (idx % 2 === 0) {
        doc.save();
        doc.fillColor('#fafafa');
        doc.rect(layout.ml, studentY - 2, layout.availableW, 16).fill();
        doc.restore();
      }
      
      doc.fontSize(9).fillColor('#333333');
      doc.text(student.studentName || '-', xName, studentY, { width: xEmail - xName - 5 });
      doc.text(student.email || '-', xEmail, studentY, { width: xCourse - xEmail - 5 });
      doc.text(student.course || '-', xCourse, studentY, { width: xStatus - xCourse - 5 });
      doc.text(student.status || '-', xStatus, studentY, { width: xScore - xStatus - 5 });
      doc.text(String(score), xScore, studentY, { width: xInterview - xScore - 5 });
      doc.text(interviewed, xInterview, studentY);
      
      doc.y += 16;

    doc.end();
  } catch (e) { next(e); }
}
