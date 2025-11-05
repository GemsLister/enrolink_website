import { readSheet } from '../services/google/sheets.js';
import { getStudentModel } from '../models/Student.js';

export async function importStudents(req, res, next) {
  try {
    const { spreadsheetId, range, batch } = req.body;
    const rows = await readSheet(spreadsheetId, range);
    const docs = [];
    const Student = getStudentModel();
    for (const r of rows) {
      const [lastName, firstName, status] = r;
      const s = await Student.create({ firstName, lastName, status: (status || 'PENDING').toUpperCase(), batch });
      docs.push(s);
    }
    res.json({ imported: docs.length });
  } catch (e) { next(e); }
}
