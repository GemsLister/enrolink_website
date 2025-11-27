import mongoose from 'mongoose';
import { getOfficersConn } from '../config/db.js';

const StudentSchema = new mongoose.Schema(
  {
    firstName: String,
    lastName: String,
    batchId: { type: mongoose.Schema.Types.ObjectId, ref: 'Batch' },
    batch: { type: String, default: () => String(new Date().getFullYear()) },
    status: { type: String, enum: ['PENDING', 'INTERVIEWED', 'PASSED', 'FAILED', 'ENROLLED', 'AWOL'], default: 'PENDING' },
    contact: String,
    email: String,
    interviewer: String,
    interviewDate: String,
    remarks: String,
    interviewId: { type: mongoose.Schema.Types.ObjectId, ref: 'Interview' }
  },
  { timestamps: true, optimisticConcurrency: true }
);

let _model;
export function getStudentModel() {
  if (!_model) {
    const conn = getOfficersConn();
    _model = conn.model('Student', StudentSchema);
  }
  return _model;
}
