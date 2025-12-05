import mongoose from 'mongoose'

const LoginEventSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, required: false },
  email: { type: String, required: true, trim: true },
  role: { type: String, required: true, trim: true },
  source: { type: String, required: true, trim: true }, // 'password' | 'google' | 'invite' | etc
  ip: { type: String, required: false },
  userAgent: { type: String, required: false },
}, {
  timestamps: { createdAt: true, updatedAt: false },
})

export default mongoose.models.LoginEvent || mongoose.model('LoginEvent', LoginEventSchema)
