import { getOfficerUserModel } from '../models/User.js';

export async function list(req, res, next) {
  try {
    const User = getOfficerUserModel();
    let rows = await User.find({ role: 'OFFICER', archived: { $ne: true } }).lean();
    rows = rows.map(r => {
      const em = String(r.email || '');
      const local = em.includes('@') ? em.split('@')[0] : em;
      const hasSpaces = /\s/.test(String(r.name || ''));
      const looksRaw = String(r.name || '').toLowerCase() === local.toLowerCase();
      if (!hasSpaces || looksRaw) {
        const pretty = local.replace(/[._-]+/g, ' ').replace(/\d+/g, ' ').replace(/\s+/g, ' ').trim()
          .split(' ').map(t => t ? (t[0].toUpperCase() + t.slice(1).toLowerCase()) : '').join(' ').trim();
        r.name = pretty || r.name;
      }
      return r;
    });
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
    let rows = await User.find({ role: 'OFFICER', canInterview: true }).select('_id name email').lean();
    rows = rows.map(r => {
      const em = String(r.email || '');
      const local = em.includes('@') ? em.split('@')[0] : em;
      const hasSpaces = /\s/.test(String(r.name || ''));
      const looksRaw = String(r.name || '').toLowerCase() === local.toLowerCase();
      if (!hasSpaces || looksRaw) {
        const pretty = local.replace(/[._-]+/g, ' ').replace(/\d+/g, ' ').replace(/\s+/g, ' ').trim()
          .split(' ').map(t => t ? (t[0].toUpperCase() + t.slice(1).toLowerCase()) : '').join(' ').trim();
        r.name = pretty || r.name;
      }
      return r;
    });
    res.json({ rows });
  } catch (e) { next(e); }
}

export async function remove(req, res, next) {
  try {
    const User = getOfficerUserModel();
    const doc = await User.findOneAndUpdate(
      { _id: req.params.id, role: 'OFFICER' },
      { $set: { archived: true, archivedAt: new Date() }, $inc: { __v: 1 } },
      { new: true }
    ).lean();
    if (!doc) return res.status(404).json({ error: 'Officer not found' });
    res.json({ doc, archived: true });
  } catch (e) { next(e); }
}

export async function archived(req, res, next) {
  try {
    const User = getOfficerUserModel();
    const rows = await User.find({ role: 'OFFICER', archived: true }).lean();
    res.json({ rows });
  } catch (e) { next(e); }
}

export async function restore(req, res, next) {
  try {
    const User = getOfficerUserModel();
    const doc = await User.findOneAndUpdate(
      { _id: req.params.id, role: 'OFFICER' },
      { $set: { archived: false, archivedAt: null }, $inc: { __v: 1 } },
      { new: true }
    ).lean();
    if (!doc) return res.status(404).json({ error: 'Officer not found' });
    res.json({ doc, restored: true });
  } catch (e) { next(e); }
}
