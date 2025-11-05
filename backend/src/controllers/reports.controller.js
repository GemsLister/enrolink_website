import { getInterviewModel } from '../models/Interview.js';
import PDFDocument from 'pdfkit';

export async function list(req, res, next) {
  try {
    const Interview = getInterviewModel();
    const q = {};
    if (req.query.batch) q.batch = req.query.batch;
    const rows = await Interview.find(q).lean();
    res.json({ rows });
  } catch (e) { next(e); }
}

export async function pdf(req, res, next) {
  try {
    const Interview = getInterviewModel();
    const q = {};
    if (req.query.batch) q.batch = req.query.batch;
    const rows = await Interview.find(q).lean();

    const doc = new PDFDocument({ margin: 40 });
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'inline; filename="interview-report.pdf"');
    doc.pipe(res);

    doc.fontSize(18).text('Interview Report', { align: 'center' });
    if (req.query.batch) doc.moveDown(0.5).fontSize(12).text(`Batch: ${req.query.batch}`, { align: 'center' });
    doc.moveDown();

    doc.fontSize(12).text('Candidate Name', 40, doc.y, { continued: true });
    doc.text('Batch', 220, doc.y, { continued: true });
    doc.text('Interview Date', 320, doc.y, { continued: true });
    doc.text('Result', 470, doc.y);
    doc.moveDown(0.5);
    doc.moveTo(40, doc.y).lineTo(570, doc.y).stroke();

    rows.forEach(r => {
      const date = r.date ? new Date(r.date).toLocaleDateString() : '-';
      doc.text(`${r.studentName || '-'}`, 40, doc.y, { continued: true });
      doc.text(`${r.batch || '-'}`, 220, doc.y, { continued: true });
      doc.text(`${date}`, 320, doc.y, { continued: true });
      doc.text(`${r.result || 'PENDING'}`, 470, doc.y);
    });

    doc.end();
  } catch (e) { next(e); }
}
