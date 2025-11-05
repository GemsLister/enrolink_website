import mongoose from 'mongoose';
import { getOfficersConn } from '../config/db.js';

const InterviewSchema = new mongoose.Schema(
  {
    studentName: String,
    interviewerName: String,
    date: Date,
    result: { type: String, enum: ['PENDING', 'PASSED', 'FAILED'], default: 'PENDING' },
    batch: String
  },
  { timestamps: true }
);

let _model;
export function getInterviewModel() {
  if (!_model) {
    const conn = getOfficersConn();
    _model = conn.model('Interview', InterviewSchema);
  }
  return _model;
}
