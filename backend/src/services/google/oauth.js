import { OAuth2Client } from 'google-auth-library';

let client;
function getClient() {
  if (!client) {
    const cid = process.env.GOOGLE_CLIENT_ID;
    if (!cid) throw new Error('Missing GOOGLE_CLIENT_ID');
    client = new OAuth2Client(cid);
  }
  return client;
}

export async function verifyIdToken(idToken) {
  const c = getClient();
  const ticket = await c.verifyIdToken({ idToken, audience: process.env.GOOGLE_CLIENT_ID });
  const payload = ticket.getPayload();
  return {
    email: payload.email,
    emailVerified: payload.email_verified,
    name: payload.name,
    googleId: payload.sub,
    picture: payload.picture
  };
}
