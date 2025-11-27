import mongoose from 'mongoose';

export let officersConn = null;
export function getOfficersConn() {
  if (!officersConn) throw new Error('Officers DB not connected');
  return officersConn;
}

export async function connectDb() {
  const headUri = process.env.MONGODB_ATLAS_URI_HEAD;
  const officersUri = process.env.MONGODB_ATLAS_URI_OFFICERS;
  if (!headUri) throw new Error('Missing MONGODB_ATLAS_URI_HEAD');
  if (!officersUri) throw new Error('Missing MONGODB_ATLAS_URI_OFFICERS');

  mongoose.set('strictQuery', true);
  const mask = (uri) => {
    try {
      const u = new URL(uri);
      const user = u.username ? (u.username.includes('%40') ? decodeURIComponent(u.username) : u.username) : '';
      const host = u.host;
      const db = u.pathname || '';
      return `${u.protocol}//${user ? user + '@' : ''}${host}${db}`;
    } catch (_) {
      return 'invalid-uri';
    }
  };
  try {
    await mongoose.connect(headUri, { autoIndex: true, serverSelectionTimeoutMS: 30000, connectTimeoutMS: 30000 });
  } catch (e) {
    const m = mask(headUri);
    const err = new Error(`Failed to connect Head DB (${m}): ${e?.name || 'Error'} ${e?.message || ''}`.trim());
    err.cause = e;
    throw err;
  }
  try {
    officersConn = mongoose.createConnection(officersUri, { autoIndex: true, serverSelectionTimeoutMS: 30000, connectTimeoutMS: 30000 });
    await officersConn.asPromise();
  } catch (e) {
    const m = mask(officersUri);
    const err = new Error(`Failed to connect Officers DB (${m}): ${e?.name || 'Error'} ${e?.message || ''}`.trim());
    err.cause = e;
    throw err;
  }
}
