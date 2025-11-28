import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import OfficerInvite from '../models/OfficerInvite.js';
import HeadUser from '../models/HeadUser.js';
import { getOfficerUserModel } from '../models/User.js';
import { badRequest, unauthorized } from '../utils/errors.js';
import { verifyIdToken } from '../services/google/oauth.js';
import PasswordReset from '../models/PasswordReset.js';
import { sendPasswordResetEmail, sendOfficerInviteEmail, sendOfficerSignupNotice } from '../services/mailer.js';

function getAllowedOfficerEmailDomains() {
  const raw = process.env.ALLOWED_OFFICER_EMAIL_DOMAINS || ''
  const list = raw.split(',').map(s => s.trim().toLowerCase()).filter(Boolean)
  // Default policy if none configured: allow any .edu domain
  return list.length ? list : ['.edu']
}

function isAllowedOfficerEmail(email) {
  const em = String(email || '').toLowerCase()
  if (!em.includes('@')) return false
  const domains = getAllowedOfficerEmailDomains()
  // Match exact domain or any suffix (".edu" means any edu TLD)
  return domains.some(d => {
    if (!d) return false
    const dom = d.startsWith('@') ? d.slice(1) : d
    return em.endsWith(`@${dom}`) || (dom.startsWith('.') && em.endsWith(dom))
  })
}

function shouldEnforceInstitutionalEmails() {
  const flag = String(process.env.ALLOW_NON_INSTITUTIONAL_OFFICER_SIGNUP || '').toLowerCase()
  // When flag is 'true', we DO NOT enforce institutional emails (testing mode)
  return !(flag === 'true' || flag === '1' || flag === 'yes')
}

export async function login(req, res, next) {
  try {
    const { email, password } = req.body;
    // Try head DB first
    let user = await HeadUser.findOne({ email });
    let source = 'head';
    if (!user) {
      // Then officers DB
      const OfficerUser = getOfficerUserModel();
      user = await OfficerUser.findOne({ email });
      source = 'officers';
    }
    if (!user) return next(unauthorized('Invalid credentials'));
    if (source === 'officers' && user.role === 'OFFICER' && user.archived) return next(unauthorized('Account archived'));
    const ok = await bcrypt.compare(password || '', user.passwordHash);
    if (!ok) return next(unauthorized('Invalid credentials'));
    const token = jwt.sign({ id: user._id, role: user.role, name: user.name, src: source }, process.env.JWT_SECRET, { expiresIn: '12h' });
    res.json({ token, role: user.role, name: user.name });
  } catch (e) { next(e); }
}

export async function me(req, res, next) {
  try {
    if (!req.user) return next(unauthorized('Invalid token'))
    if (req.user.role !== 'DEPT_HEAD') return next(unauthorized('Forbidden'))
    const user = await HeadUser.findById(req.user.id).lean()
    if (!user) return next(unauthorized('User not found'))
    const { passwordHash, __v, ...safe } = user
    res.json({ user: safe })
  } catch (e) { next(e) }
}

// Officer self profile
export async function officerMe(req, res, next) {
  try {
    if (!req.user) return next(unauthorized('Invalid token'))
    if (req.user.role !== 'OFFICER') return next(unauthorized('Forbidden'))
    const OfficerUser = getOfficerUserModel();
    const user = await OfficerUser.findById(req.user.id).lean()
    if (!user) return next(unauthorized('User not found'))
    const { passwordHash, __v, ...safe } = user
    res.json({ user: safe })
  } catch (e) { next(e) }
}

export async function officerUpdateMe(req, res, next) {
  try {
    if (!req.user) return next(unauthorized('Invalid token'))
    if (req.user.role !== 'OFFICER') return next(unauthorized('Forbidden'))
    const OfficerUser = getOfficerUserModel();
    const fields = ['name']
    const update = {}
    for (const f of fields) if (f in req.body) update[f] = req.body[f]
    const doc = await OfficerUser.findByIdAndUpdate(req.user.id, update, { new: true }).lean()
    const { passwordHash, __v, ...safe } = doc
    res.json({ user: safe })
  } catch (e) { next(e) }
}

export async function officerChangePassword(req, res, next) {
  try {
    if (!req.user) return next(unauthorized('Invalid token'))
    if (req.user.role !== 'OFFICER') return next(unauthorized('Forbidden'))
    const { currentPassword, newPassword } = req.body || {}
    const OfficerUser = getOfficerUserModel();
    const user = await OfficerUser.findById(req.user.id)
    if (!user) return next(unauthorized('User not found'))
    const ok = await bcrypt.compare(currentPassword || '', user.passwordHash || '')
    if (!ok) return next(unauthorized('Current password is incorrect'))
    if (!newPassword || String(newPassword).length < 6) return next(badRequest('New password must be at least 6 characters'))
    user.passwordHash = await bcrypt.hash(newPassword, 10)
    await user.save()
    res.json({ ok: true })
  } catch (e) { next(e) }
}

export async function updateMe(req, res, next) {
  try {
    if (!req.user) return next(unauthorized('Invalid token'))
    if (req.user.role !== 'DEPT_HEAD') return next(unauthorized('Forbidden'))
    const fields = ['name','department','phone','notifEmail','notifSms','notifInterview','notifSystem']
    const update = {}
    for (const f of fields) if (f in req.body) update[f] = req.body[f]
    const doc = await HeadUser.findByIdAndUpdate(req.user.id, update, { new: true }).lean()
    const { passwordHash, __v, ...safe } = doc
    res.json({ user: safe })
  } catch (e) { next(e) }
}

export async function changePassword(req, res, next) {
  try {
    if (!req.user) return next(unauthorized('Invalid token'))
    if (req.user.role !== 'DEPT_HEAD') return next(unauthorized('Forbidden'))
    const { currentPassword, newPassword } = req.body || {}
    const user = await HeadUser.findById(req.user.id)
    if (!user) return next(unauthorized('User not found'))
    const ok = await bcrypt.compare(currentPassword || '', user.passwordHash || '')
    if (!ok) return next(unauthorized('Current password is incorrect'))
    if (!newPassword || String(newPassword).length < 6) return next(badRequest('New password must be at least 6 characters'))
    user.passwordHash = await bcrypt.hash(newPassword, 10)
    await user.save()
    res.json({ ok: true })
  } catch (e) { next(e) }
}

export async function exportData(req, res, next) {
  try {
    if (!req.user) return next(unauthorized('Invalid token'))
    if (req.user.role !== 'DEPT_HEAD') return next(unauthorized('Forbidden'))
    const user = await HeadUser.findById(req.user.id).lean()
    const data = { user, exportedAt: new Date().toISOString() }
    res.setHeader('Content-Type', 'application/json')
    res.setHeader('Content-Disposition', 'attachment; filename="enrolink-account-export.json"')
    res.send(JSON.stringify(data, null, 2))
  } catch (e) { next(e) }
}

export async function createInvite(req, res, next) {
  try {
    const { email, batch, year, ttlMinutes = 1440 } = req.body;
    if (!email) return next(badRequest('email required'));
    const token = Math.random().toString(36).slice(2) + Date.now().toString(36);
    const expiresAt = new Date(Date.now() + ttlMinutes * 60000);
    const invite = await OfficerInvite.create({ email, token, batch, year, expiresAt });
    const inviteLink = `${process.env.CLIENT_URL}/signup?token=${invite.token}`;
    let emailed = false;
    try {
      await sendOfficerInviteEmail(email, inviteLink, ttlMinutes);
      emailed = true;
    } catch (_) {
      // swallow email errors; still return link so head can send manually
    }
    res.json({ inviteLink, emailed });
  } catch (e) { next(e); }
}

export async function signupWithInvite(req, res, next) {
  try {
    const { token, password } = req.body;
    const invite = await OfficerInvite.findOne({ token, used: false });
    if (!invite) return next(badRequest('invalid invite'));
    if (shouldEnforceInstitutionalEmails() && !isAllowedOfficerEmail(invite.email)) return next(badRequest('Signup restricted to institutional emails'))
    const passwordHash = await bcrypt.hash(password, 10);
    const OfficerUser = getOfficerUserModel();
    const defaultName = String(invite.email || '').split('@')[0] || '';
    const user = await OfficerUser.create({ email: invite.email, passwordHash, role: 'OFFICER', name: defaultName, assignedYear: invite.year, assignedBatch: invite.batch });
    invite.used = true; await invite.save();
    try {
      const heads = await HeadUser.find({}).select('email notifEmail').lean();
      const targets = heads.map(h => h.notifEmail || h.email).filter(Boolean);
      await Promise.all(targets.map(to => sendOfficerSignupNotice(to, invite.email)));
    } catch (_) {}
    const jwtToken = jwt.sign({ id: user._id, role: user.role, name: user.name }, process.env.JWT_SECRET, { expiresIn: '12h' });
    res.json({ token: jwtToken });
  } catch (e) { next(e); }
}

export async function googleAuth(req, res, next) {
  try {
    const { idToken, inviteToken } = req.body;
    if (!idToken) return next(badRequest('idToken required'));
    const profile = await verifyIdToken(idToken);
    if (!profile.emailVerified) return next(unauthorized('Email not verified by Google'));

    // Check both DBs
    let user = await HeadUser.findOne({ email: profile.email });
    let inHead = !!user;
    if (!user) {
      const OfficerUser = getOfficerUserModel();
      user = await OfficerUser.findOne({ email: profile.email });
    }

    if (!user) {
      // New user: only allowed if inviteToken is present and matches email
      if (!inviteToken) return next(unauthorized('Invitation required'));
      const invite = await OfficerInvite.findOne({ token: inviteToken, used: false, email: profile.email });
      if (!invite) return next(unauthorized('Invalid invitation'));
      if (shouldEnforceInstitutionalEmails() && !isAllowedOfficerEmail(profile.email)) return next(unauthorized('Signup restricted to institutional emails'))
      const OfficerUser = getOfficerUserModel();
      user = await OfficerUser.create({
        email: profile.email,
        name: profile.name,
        role: 'OFFICER',
        assignedYear: invite.year,
        assignedBatch: invite.batch,
        provider: 'google',
        googleId: profile.googleId
      });
      invite.used = true; await invite.save();
      try {
        const heads = await HeadUser.find({}).select('email notifEmail').lean();
        const targets = heads.map(h => h.notifEmail || h.email).filter(Boolean);
        await Promise.all(targets.map(to => sendOfficerSignupNotice(to, profile.email)));
      } catch (_) {}
    } else {
      // Existing user can login with Google; ensure provider/googleId are set for convenience
      if (!inHead && !user.googleId) {
        user.googleId = profile.googleId;
        user.provider = 'google';
        await user.save();
      }
    }

    if (user.role === 'OFFICER') {
      const OfficerUser = getOfficerUserModel();
      const o = await OfficerUser.findById(user._id).lean();
      if (o && o.archived) return next(unauthorized('Account archived'));
    }
    const token = jwt.sign({ id: user._id, role: user.role, name: user.name }, process.env.JWT_SECRET, { expiresIn: '12h' });
    res.json({ token, role: user.role, name: user.name });
  } catch (e) { next(e); }
}

export async function requestPasswordReset(req, res, next) {
  try {
    const { email, ttlMinutes = 60 } = req.body;
    if (!email) return next(badRequest('email required'));
    // Check in both user stores
    let user = await HeadUser.findOne({ email });
    if (!user) {
      const OfficerUser = getOfficerUserModel();
      user = await OfficerUser.findOne({ email });
    }
    if (!user) {
      // Do not disclose whether the email exists
      return res.json({ message: 'If the email is registered, a reset link has been sent.' });
    }
    const token = Math.random().toString(36).slice(2) + Date.now().toString(36);
    const expiresAt = new Date(Date.now() + ttlMinutes * 60000);
    const pr = await PasswordReset.create({ email: user.email, token, expiresAt });
    const resetLink = `${process.env.CLIENT_URL}/reset-password?token=${pr.token}`;
    try {
      await sendPasswordResetEmail(user.email, resetLink);
    } catch (mailErr) {
      // If email sending fails, still respond generically to avoid enumeration
      return res.json({ message: 'If the email is registered, a reset link has been sent.' });
    }
    res.json({ message: 'If the email is registered, a reset link has been sent.' });
  } catch (e) { next(e); }
}

export async function resetPassword(req, res, next) {
  try {
    const { token, password } = req.body;
    if (!token) return next(badRequest('token required'));
    if (!password || String(password).length < 6) return next(badRequest('password must be at least 6 characters'));
    const pr = await PasswordReset.findOne({ token, used: false });
    if (!pr) return next(badRequest('invalid or expired token'));
    if (pr.expiresAt.getTime() < Date.now()) return next(badRequest('invalid or expired token'));

    // Find user across both collections by email
    let user = await HeadUser.findOne({ email: pr.email });
    let inHead = !!user;
    if (!user) {
      const OfficerUser = getOfficerUserModel();
      user = await OfficerUser.findOne({ email: pr.email });
    }
    if (!user) return next(badRequest('user not found'));

    const passwordHash = await bcrypt.hash(password, 10);
    user.passwordHash = passwordHash;
    await user.save();
    pr.used = true;
    await pr.save();
    res.json({ ok: true });
  } catch (e) { next(e); }
}
