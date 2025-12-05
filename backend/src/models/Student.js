import mongoose from 'mongoose';
import { getOfficersConn } from '../config/db.js';

const StudentSchema = new mongoose.Schema(
  {
    number: String,
    course: String,
    examineeNo: String,
    source: String,
    firstName: String,
    middleName: String,
    lastName: String,
    gender: String,
    birthdate: String,
    email: String,
    contact: String,
    enrollmentStatus: { type: String, enum: ['ENROLLED', 'PENDING'], default: undefined },
    address: String,
    school: String,
    strand: String,
    yearGraduated: String,
    preferredCourse: String,
    schedule: String,
    percentileScore: String,
    shsStrand: String,
    shs: String,
    shsGpa: String,
    recordCategory: { type: String, enum: ['Applicant', 'Enrollee', 'Student'], default: 'Applicant' },
    batchId: { type: mongoose.Schema.Types.ObjectId, ref: 'Batch' },
    batch: { type: String, default: () => String(new Date().getFullYear()) },
    status: { type: String, enum: ['PENDING', 'INTERVIEWED', 'PASSED', 'FAILED', 'ENROLLED', 'AWOL'], default: 'PENDING' },
    academicTechnicalBackground: String,
    skillsCompetencies: String,
    timeManagement: String,
    communicationSkills: String,
    problemSolving: String,
    ethicsIntegrity: String,
    qScore: String,
    interviewerDecision: String,
    sScore: String,
    finalScore: String,
    interviewer: String,
    interviewDate: String,
    remarks: String,
    interviewId: { type: mongoose.Schema.Types.ObjectId, ref: 'Interview' },
    nameSignature: { type: String, index: true },
    archived_at: { type: String, default: undefined },
    // Audit fields: who last modified this record (head or officer)
    lastModifiedById: { type: mongoose.Schema.Types.ObjectId, required: false },
    lastModifiedByName: { type: String, required: false },
    lastModifiedByEmail: { type: String, required: false },
    lastModifiedByRole: { type: String, required: false },
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
