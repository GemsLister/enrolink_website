import mongoose from 'mongoose';

export let officersConn = null;
export let recordsConn = null;
export let archivesConn = null;
export function getOfficersConn() {
  if (!officersConn) throw new Error('Officers DB not connected');
  return officersConn;
}

export function getRecordsConn() {
  if (!recordsConn) throw new Error('Records DB not connected');
  return recordsConn;
}

export function getArchivesConn() {
  if (!archivesConn) throw new Error('Archives DB not connected');
  return archivesConn;
}

export async function connectDb() {
  const headUri = process.env.MONGODB_ATLAS_URI_HEAD;
  const officersUri = process.env.MONGODB_ATLAS_URI_OFFICERS;
  const recordsUri = process.env.MONGODB_ATLAS_URI_RECORDS;
  const archivesUri = process.env.MONGODB_ATLAS_URI_ARCHIVES;
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

  // Records DB: prefer explicit URI, otherwise fallback to same cluster DB name
  try {
    if (recordsUri) {
      recordsConn = mongoose.createConnection(recordsUri, { autoIndex: true, serverSelectionTimeoutMS: 30000, connectTimeoutMS: 30000 });
      await recordsConn.asPromise();
    } else {
      recordsConn = officersConn.useDb('records');
    }
  } catch (e) {
    const m = mask(recordsUri || officersUri + '/records');
    const err = new Error(`Failed to connect Records DB (${m}): ${e?.name || 'Error'} ${e?.message || ''}`.trim());
    err.cause = e;
    throw err;
  }

  // Archives DB: prefer explicit URI, otherwise fallback to same cluster DB name
  try {
    if (archivesUri) {
      archivesConn = mongoose.createConnection(archivesUri, { autoIndex: true, serverSelectionTimeoutMS: 30000, connectTimeoutMS: 30000 });
      await archivesConn.asPromise();
    } else {
      archivesConn = officersConn.useDb('archives');
    }
  } catch (e) {
    const m = mask(archivesUri || officersUri + '/archives');
    const err = new Error(`Failed to connect Archives DB (${m}): ${e?.name || 'Error'} ${e?.message || ''}`.trim());
    err.cause = e;
    throw err;
  }
}
