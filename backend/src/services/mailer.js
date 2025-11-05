import nodemailer from 'nodemailer';

let transporter;
function getTransporter() {
  if (!transporter) {
    const host = process.env.SMTP_HOST;
    const port = Number(process.env.SMTP_PORT || 587);
    const user = process.env.SMTP_USER;
    const pass = process.env.SMTP_PASS;
    const secure = String(process.env.SMTP_SECURE || '').toLowerCase() === 'true' || port === 465;
    if (!host || !user || !pass) throw new Error('Missing SMTP config: SMTP_HOST, SMTP_USER, SMTP_PASS');
    transporter = nodemailer.createTransport({ host, port, secure, auth: { user, pass } });
  }
  return transporter;
}

export async function sendPasswordResetEmail(to, resetLink) {
  const from = process.env.MAIL_FROM || process.env.SMTP_USER;
  const t = getTransporter();
  const subject = 'Reset your EnroLink password';
  const text = `We received a request to reset your password.\n\nClick the link below to set a new password:\n${resetLink}\n\nIf you did not request this, you can ignore this email.`;
  const html = `
    <div style="font-family:Arial,sans-serif;line-height:1.6;color:#222">
      <h2>Reset your password</h2>
      <p>We received a request to reset your password.</p>
      <p><a href="${resetLink}" style="display:inline-block;padding:10px 14px;background:#0ea5e9;color:#fff;text-decoration:none;border-radius:6px">Set a new password</a></p>
      <p>Or copy/paste this link:<br/><a href="${resetLink}">${resetLink}</a></p>
      <p>If you did not request this, you can ignore this email.</p>
    </div>`;
  await t.sendMail({ from, to, subject, text, html });
}
