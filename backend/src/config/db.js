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
  // Default connection for Head DB
  await mongoose.connect(headUri, { autoIndex: true });

  // Separate connection for Officers DB
  officersConn = mongoose.createConnection(officersUri, { autoIndex: true });
  await officersConn.asPromise();
}
