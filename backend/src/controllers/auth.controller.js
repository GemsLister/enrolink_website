import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import OfficerInvite from '../models/OfficerInvite.js';
import HeadUser from '../models/HeadUser.js';
import { getOfficerUserModel } from '../models/User.js';
import { badRequest, unauthorized } from '../utils/errors.js';
import { verifyIdToken } from '../services/google/oauth.js';
import PasswordReset from '../models/PasswordReset.js';
import { sendPasswordResetEmail } from '../services/mailer.js';

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
    const ok = await bcrypt.compare(password || '', user.passwordHash);
    if (!ok) return next(unauthorized('Invalid credentials'));
    const token = jwt.sign({ id: user._id, role: user.role, name: user.name, src: source }, process.env.JWT_SECRET, { expiresIn: '12h' });
    res.json({ token, role: user.role, name: user.name });
  } catch (e) { next(e); }
}

export async function createInvite(req, res, next) {
  try {
    const { email, batch, ttlMinutes = 1440 } = req.body;
    if (!email) return next(badRequest('email required'));
    const token = Math.random().toString(36).slice(2) + Date.now().toString(36);
    const expiresAt = new Date(Date.now() + ttlMinutes * 60000);
    const invite = await OfficerInvite.create({ email, token, batch, expiresAt });
    res.json({ inviteLink: `${process.env.CLIENT_URL}/signup?token=${invite.token}` });
  } catch (e) { next(e); }
}

export async function signupWithInvite(req, res, next) {
  try {
    const { token, name, password } = req.body;
    const invite = await OfficerInvite.findOne({ token, used: false });
    if (!invite) return next(badRequest('invalid invite'));
    const passwordHash = await bcrypt.hash(password, 10);
    const OfficerUser = getOfficerUserModel();
    const user = await OfficerUser.create({ email: invite.email, passwordHash, role: 'OFFICER', name, assignedBatch: invite.batch });
    invite.used = true; await invite.save();
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
      const OfficerUser = getOfficerUserModel();
      user = await OfficerUser.create({
        email: profile.email,
        name: profile.name,
        role: 'OFFICER',
        assignedBatch: invite.batch,
        provider: 'google',
        googleId: profile.googleId
      });
      invite.used = true; await invite.save();
    } else {
      // Existing user can login with Google; ensure provider/googleId are set for convenience
      if (!inHead && !user.googleId) {
        user.googleId = profile.googleId;
        user.provider = 'google';
        await user.save();
      }
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
