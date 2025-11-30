import { readSheet, readSheetByUrl, writeSheet } from '../services/google/sheets.js';
import { getStudentModel } from '../models/Student.js';
import { getInterviewModel } from '../models/Interview.js';

export async function importStudents(req, res, next) {
  try {
    const { url, spreadsheetId, range, batch, batchId } = req.body;
    let rows = [];
    if (url) {
      rows = await readSheetByUrl(url);
    } else {
      rows = await readSheet(spreadsheetId, range);
    }
    const docs = [];
    const Student = getStudentModel();
    if (!Array.isArray(rows) || rows.length === 0) return res.json({ imported: 0 });

    let startIdx = 0;
    let lnIdx = 0, fnIdx = 1, stIdx = 2, emIdx = -1, ctIdx = -1, dtIdx = -1, exIdx = -1;
    // Header detection: if first row contains likely header labels
    const hdr = (rows[0] || []).map(x => (x ?? '').toString().trim().toLowerCase());
    const hset = hdr.join(' ');
    if (hset.includes('last') && hset.includes('first')) {
      lnIdx = hdr.findIndex(h => h === 'lastname' || h === 'last name' || h === 'last');
      fnIdx = hdr.findIndex(h => h === 'firstname' || h === 'first name' || h === 'first');
      stIdx = hdr.findIndex(h => h === 'status');
      emIdx = hdr.findIndex(h => h === 'email' || h === 'e-mail');
      ctIdx = hdr.findIndex(h => h === 'contact' || h === 'phone' || h === 'contact number' || h === 'mobile');
      dtIdx = hdr.findIndex(h => h === 'interview date' || h === 'interviewdate' || h === 'date');
      exIdx = hdr.findIndex(h => h === 'exam score' || h === 'examscore' || h === 'score');
      if (lnIdx === -1) lnIdx = 0;
      if (fnIdx === -1) fnIdx = 1;
      if (stIdx === -1) stIdx = 2;
      startIdx = 1; // skip header
    }

    for (let i = startIdx; i < rows.length; i += 1) {
      const r = rows[i] || [];
      const arr = r.map(x => (x ?? '').toString().trim());
      const lastName = arr[lnIdx] || '';
      const firstName = arr[fnIdx] || '';
      const status = arr[stIdx] || 'PENDING';
      const email = emIdx >= 0 ? (arr[emIdx] || '') : '';
      const contact = ctIdx >= 0 ? (arr[ctIdx] || '') : '';
      let interviewDate = dtIdx >= 0 ? (arr[dtIdx] || '') : '';
      const examScoreRaw = exIdx >= 0 ? (arr[exIdx] || '') : '';
      if (!firstName || !lastName) continue;
      if (interviewDate) {
        const d = new Date(interviewDate);
        if (!isNaN(d.getTime())) interviewDate = d.toISOString().slice(0, 10);
      }
      const payload = {
        firstName,
        lastName,
        status: (status || 'PENDING').toUpperCase(),
        batch,
        ...(batchId ? { batchId } : {}),
        ...(email ? { email } : {}),
        ...(contact ? { contact } : {}),
        ...(interviewDate ? { interviewDate } : {}),
      };
      const s = await Student.create(payload);
      // Create a matching Interview report if score/date/status are present
      try {
        const Interview = getInterviewModel();
        const result = String(status || 'PENDING').toUpperCase();
        const examScore = examScoreRaw !== '' ? Number(examScoreRaw) : undefined;
        if (interviewDate || examScore !== undefined || result) {
          await Interview.create({
            studentName: [firstName, lastName].filter(Boolean).join(' ').trim(),
            batch,
            date: interviewDate || undefined,
            result,
            examScore,
          });
        }
      } catch (_) {}
      docs.push(s);
    }
    res.json({ imported: docs.length });
  } catch (e) { next(e); }
}

export async function exportStudentsToSheet(req, res, next) {
  try {
    const { spreadsheetId, range, year } = req.body;
    if (!spreadsheetId || !range) return res.status(400).json({ error: 'Missing spreadsheetId or range' });
    const Student = getStudentModel();
    const q = {};
    if (year) q.$or = [ { batch: new RegExp(`^${String(year)}`) }, { year: String(year) } ];
    const docs = await Student.find(q).lean();
    const header = ['id','firstName','lastName','email','status','batch','year','createdAt','updatedAt'];
    const values = [header];
    for (const d of docs) {
      const batchStr = String(d.batch || '');
      const yr = String(d.year || (batchStr.includes('-') ? batchStr.split('-')[0] : '') || '');
      values.push([
        String(d._id || ''),
        String(d.firstName || ''),
        String(d.lastName || ''),
        String(d.email || ''),
        String((d.status || 'PENDING')).toUpperCase(),
        batchStr,
        yr,
        d.createdAt ? new Date(d.createdAt).toISOString() : '',
        d.updatedAt ? new Date(d.updatedAt).toISOString() : ''
      ]);
    }
    await writeSheet(spreadsheetId, range, values);
    res.json({ ok: true, rows: values.length - 1 });
  } catch (e) { next(e); }
}

export async function exportStudentsDefault(req, res, next) {
  try {
    const spreadsheetId = process.env.SHEETS_SPREADSHEET_ID || '';
    const range = process.env.SHEETS_EXPORT_RANGE || 'Sheet1!A1:I';
    const year = req.query.year ? String(req.query.year) : '';
    if (!spreadsheetId) return res.status(400).json({ error: 'Missing SHEETS_SPREADSHEET_ID in environment' });
    req.body = { spreadsheetId, range, year };
    return exportStudentsToSheet(req, res, next);
  } catch (e) { next(e); }
}
