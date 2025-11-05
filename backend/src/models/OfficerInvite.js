import mongoose from 'mongoose';

const OfficerInviteSchema = new mongoose.Schema(
  {
    email: { type: String, required: true, index: true },
    token: { type: String, required: true, unique: true },
    batch: { type: String },
    used: { type: Boolean, default: false },
    expiresAt: { type: Date, required: true }
  },
  { timestamps: true }
);

OfficerInviteSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export default mongoose.model('OfficerInvite', OfficerInviteSchema);
