import mongoose from 'mongoose'
import { getRecordsConn, getArchivesConn } from '../config/db.js'

const BaseSchema = new mongoose.Schema(
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
    enrollmentStatus: { type: String, enum: ['ENROLLED', 'PENDING'], set: (v) => (v == null || v === '' ? undefined : v), default: undefined, trim: true },
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
    recordCategory: { type: String, enum: ['Applicant', 'Enrollee', 'Student'], set: (v) => (v == null || v === '' ? undefined : v), default: 'Applicant', trim: true },
    batchId: { type: mongoose.Schema.Types.ObjectId },
    batch: { type: String, default: () => String(new Date().getFullYear()) },
    status: { type: String, enum: ['PENDING', 'INTERVIEWED', 'PASSED', 'FAILED', 'ENROLLED', 'AWOL'], set: (v) => (v == null || v === '' ? undefined : v), default: 'PENDING', trim: true },
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
    interviewId: { type: mongoose.Schema.Types.ObjectId },
    nameSignature: { type: String, index: true },
    archived_at: { type: String, default: undefined }
  },
  { timestamps: true, optimisticConcurrency: true }
)

const cache = new Map()

export function getRecordModel(kind = 'students', archived = false) {
  const normalizedKind = String(kind || '').toLowerCase()
  const collection = archived
    ? (normalizedKind === 'applicants' ? 'applicant_archives'
      : normalizedKind === 'enrollees' ? 'enrollee_archives'
      : 'student_archives')
    : (normalizedKind === 'applicants' ? 'applicants'
      : normalizedKind === 'enrollees' ? 'enrollees'
      : 'students')

  const key = `${collection}:${archived ? 'arch' : 'live'}`
  if (cache.has(key)) return cache.get(key)

  const conn = archived ? getArchivesConn() : getRecordsConn()
  const model = conn.model(collection, BaseSchema, collection)
  cache.set(key, model)
  return model
}
