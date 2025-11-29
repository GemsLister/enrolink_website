import { getStudentModel } from '../models/Student.js';
import { ensureStudentsTable, insertStudentRows } from '../services/google/bigquery.js';

export async function migrateStudents(req, res, next) {
  try {
    const year = req.query.year ? String(req.query.year) : '';
    const Student = getStudentModel();
    const q = {};
    if (year) q.$or = [ { batch: new RegExp(`^${year}`) }, { year } ];
    const docs = await Student.find(q).lean();
    const rows = docs.map(d => {
      const batchStr = String(d.batch || '');
      const yr = String(d.year || (batchStr.includes('-') ? batchStr.split('-')[0] : '') || '');
      return {
        id: String(d._id || ''),
        firstName: String(d.firstName || ''),
        lastName: String(d.lastName || ''),
        email: String(d.email || ''),
        status: String(d.status || 'PENDING').toUpperCase(),
        batch: batchStr,
        year: yr,
        createdAt: d.createdAt ? new Date(d.createdAt).toISOString() : null,
        updatedAt: d.updatedAt ? new Date(d.updatedAt).toISOString() : null,
      };
    });
    try { await ensureStudentsTable(); } catch (e) {}
    const result = await insertStudentRows(rows);
    res.json({ ok: true, total: rows.length, inserted: result.inserted, failed: result.failed });
  } catch (e) { next(e); }
}
