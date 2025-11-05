import mongoose from 'mongoose';

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

export default mongoose.models.HeadUser || mongoose.model('HeadUser', UserSchema);
