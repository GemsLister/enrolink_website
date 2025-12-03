import mongoose from 'mongoose';

const DatePartSchema = new mongoose.Schema({
  date: { type: String },
  dateTime: { type: String },
}, { _id: false });

const ScheduleSchema = new mongoose.Schema({
  calendarId: { type: String, default: 'default', index: true },
  summary: { type: String, required: true },
  description: { type: String },
  start: { type: DatePartSchema, required: true },
  end: { type: DatePartSchema, required: true },
  allDay: { type: Boolean, default: false },
  htmlLink: { type: String },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

ScheduleSchema.index({ 'start.dateTime': 1, 'start.date': 1 });

export default mongoose.models.Schedule || mongoose.model('Schedule', ScheduleSchema);
