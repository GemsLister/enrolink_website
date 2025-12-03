import mongoose from 'mongoose';
import { getOfficersConn } from '../config/db.js';

const UserSchema = new mongoose.Schema(
  {
    email: { type: String, required: true, unique: true, lowercase: true },
    passwordHash: { type: String },
    name: { type: String },
    role: { type: String, enum: ['DEPT_HEAD', 'OFFICER'], required: true },
    assignedYear: { type: String },
    assignedBatch: { type: String },
    canInterview: { type: Boolean, default: false },
    provider: { type: String, enum: ['local', 'google'], default: 'local' },
    googleId: { type: String }
  },
  { timestamps: true, optimisticConcurrency: true }
);

// Archiving support
UserSchema.add({
  archived: { type: Boolean, default: false },
  archivedAt: { type: Date, default: null }
});

// Hidden Google events per user (to suppress visibility when deletion fails upstream)
UserSchema.add({
  hiddenGoogleEventIds: { type: [String], default: [] }
});

// RBAC permissions for OFFICER accounts
UserSchema.add({
  permissions: {
    type: Object,
    default: {
      validateRequirements: false,
      editProfiles: false,
      processEnrollment: false,
      manageSchedule: false,
      generateReports: false,
      viewRecordsAllPrograms: false
    }
  }
});

let _model;
export function getOfficerUserModel() {
  if (!_model) {
    const conn = getOfficersConn();
    _model = conn.model('User', UserSchema);
  }
  return _model;
}
