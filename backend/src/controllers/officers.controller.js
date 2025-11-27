import { getOfficerUserModel } from '../models/User.js';

export async function list(req, res, next) {
  try {
    const User = getOfficerUserModel();
    const rows = await User.find({ role: 'OFFICER' }).lean();
    res.json({ rows });
  } catch (e) { next(e); }
}

export async function update(req, res, next) {
  try {
    const User = getOfficerUserModel();
    const { __v, ...data } = req.body || {};
    const filter = { _id: req.params.id };
    if (__v !== undefined) filter.__v = __v;
    const result = await User.updateOne(filter, { $set: data, $inc: { __v: 1 } });
    if ((result.modifiedCount ?? result.nModified ?? 0) === 0) {
      return res.status(409).json({ error: 'Conflict: record has been modified by another user' });
    }
    const doc = await User.findById(req.params.id).lean();
    res.json({ doc });
  } catch (e) { next(e); }
}

export async function interviewers(req, res, next) {
  try {
    const User = getOfficerUserModel();
    const rows = await User.find({ role: 'OFFICER', canInterview: true }).select('_id name email').lean();
    res.json({ rows });
  } catch (e) { next(e); }
}

export async function remove(req, res, next) {
  try {
    const User = getOfficerUserModel();
    const result = await User.deleteOne({ _id: req.params.id, role: 'OFFICER' });
    if ((result.deletedCount ?? 0) === 0) {
      return res.status(404).json({ error: 'Officer not found' });
    }
    res.json({ ok: true });
  } catch (e) { next(e); }
}
