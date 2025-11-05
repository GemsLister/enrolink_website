import mongoose from 'mongoose';
import { getOfficersConn } from '../config/db.js';

const StudentSchema = new mongoose.Schema(
  {
    firstName: String,
    lastName: String,
    batch: String,
    status: { type: String, enum: ['PENDING', 'INTERVIEWED', 'PASSED', 'FAILED', 'ENROLLED', 'AWOL'], default: 'PENDING' },
    interviewId: { type: mongoose.Schema.Types.ObjectId, ref: 'Interview' }
  },
  { timestamps: true }
);

let _model;
export function getStudentModel() {
  if (!_model) {
    const conn = getOfficersConn();
    _model = conn.model('Student', StudentSchema);
  }
  return _model;
}
