import mongoose from 'mongoose'
import { getHeadConn } from '../config/db.js'

const HeadArchiveSchema = new mongoose.Schema(
  {
    originalId: { type: mongoose.Schema.Types.ObjectId, index: true },
    role: { type: String, enum: ['OFFICER', 'DEPT_HEAD'], required: true },
    name: { type: String },
    email: { type: String, lowercase: true },
    assignedBatch: { type: String },
    contact: { type: String },
    archivedAt: { type: Date, default: () => new Date() },
  },
  { timestamps: true }
)

let _model
export function getHeadArchiveModel() {
  if (!_model) {
    const conn = getHeadConn()
    // Explicit collection name: 'archive' under department-head DB
    _model = conn.model('HeadArchive', HeadArchiveSchema, 'archive')
  }
  return _model
}

