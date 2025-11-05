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
    const doc = await User.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json({ doc });
  } catch (e) { next(e); }
}
