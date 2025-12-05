import bcrypt from 'bcryptjs';
import HeadUser from '../models/HeadUser.js';

export async function ensureAdmin() {
  const email = process.env.ADMIN_EMAIL;
  const password = process.env.ADMIN_PASSWORD;
  const name = process.env.ADMIN_NAME || 'Department Head';
  if (!email || !password) return; // skip auto-seed if not configured
  const existing = await HeadUser.findOne({ email });
  if (existing) {
    if (existing.role !== 'DEPT_HEAD') {
      existing.role = 'DEPT_HEAD';
    }
    const passwordMatches = await bcrypt.compare(password, existing.passwordHash || '');
    if (!passwordMatches) {
      existing.passwordHash = await bcrypt.hash(password, 10);
    }
    await existing.save();
    return;
  }
  const passwordHash = await bcrypt.hash(password, 10);
  await HeadUser.create({ email, passwordHash, name, role: 'DEPT_HEAD' });
}
