import mongoose from 'mongoose'

const ActivityEventSchema = new mongoose.Schema({
  actorId: { type: mongoose.Schema.Types.ObjectId, required: false },
  actorName: { type: String, required: false },
  actorEmail: { type: String, required: false },
  actorRole: { type: String, required: false },
  type: { type: String, required: true }, // e.g. 'student_add','student_edit','student_archive','student_move','student_delete'
  description: { type: String, required: true },
}, {
  timestamps: { createdAt: true, updatedAt: false },
})

export default mongoose.models.ActivityEvent || mongoose.model('ActivityEvent', ActivityEventSchema)
