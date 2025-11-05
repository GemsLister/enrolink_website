import { getStudentModel } from '../models/Student.js';

export async function list(req, res, next) {
  try {
    const Student = getStudentModel();
    const q = {};
    if (req.query.batch) q.batch = req.query.batch;
    const rows = await Student.find(q).lean();
    res.json({ rows });
  } catch (e) { next(e); }
}

export async function upsert(req, res, next) {
  try {
    const Student = getStudentModel();
    const { id, ...data } = req.body;
    const doc = id ? await Student.findByIdAndUpdate(id, data, { new: true }) : await Student.create(data);
    res.json({ doc });
  } catch (e) { next(e); }
}
