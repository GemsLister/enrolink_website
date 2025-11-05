import mongoose from 'mongoose';

const PasswordResetSchema = new mongoose.Schema(
  {
    email: { type: String, required: true, index: true, lowercase: true },
    token: { type: String, required: true, unique: true },
    used: { type: Boolean, default: false },
    expiresAt: { type: Date, required: true }
  },
  { timestamps: true }
);

PasswordResetSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export default mongoose.model('PasswordReset', PasswordResetSchema);
