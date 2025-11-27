import mongoose from 'mongoose';
import { getOfficersConn } from '../config/db.js';

const BatchSchema = new mongoose.Schema(
  {
    code: { type: String, unique: true, required: true }, // e.g., 2025-001
    year: { type: String, required: true }, // e.g., 2025
    index: { type: Number, required: true }, // e.g., 1
    interviewer: { type: String, default: '' },
    defaultInterviewDate: { type: Date },
    status: { type: String, enum: ['PENDING', 'INTERVIEWED', 'PASSED', 'FAILED', 'ENROLLED', 'AWOL'], default: 'PENDING' },
  },
  { timestamps: true, optimisticConcurrency: true }
);

let _model;
export function getBatchModel() {
  if (!_model) {
    const conn = getOfficersConn();
    _model = conn.model('Batch', BatchSchema);
  }
  return _model;
}
