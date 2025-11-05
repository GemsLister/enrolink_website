import mongoose from 'mongoose';
import { getOfficersConn } from '../config/db.js';

const UserSchema = new mongoose.Schema(
  {
    email: { type: String, required: true, unique: true, lowercase: true },
    passwordHash: { type: String },
    name: { type: String },
    role: { type: String, enum: ['DEPT_HEAD', 'OFFICER'], required: true },
    assignedBatch: { type: String },
    provider: { type: String, enum: ['local', 'google'], default: 'local' },
    googleId: { type: String }
  },
  { timestamps: true }
);

let _model;
export function getOfficerUserModel() {
  if (!_model) {
    const conn = getOfficersConn();
    _model = conn.model('User', UserSchema);
  }
  return _model;
}
