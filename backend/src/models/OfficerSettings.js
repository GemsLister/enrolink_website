import mongoose from 'mongoose';
import { getHeadConn } from '../config/db.js';

const OfficerSettingsSchema = new mongoose.Schema(
  {
    permissions: {
      type: Object,
      default: {
        createRecords: false,
        editRecords: false,
        processEnrollment: false,
        archiveRecords: false,
        manageSchedule: false,
        generateReports: false,
        viewRecordsAllPrograms: false,
      }
    }
  },
  { timestamps: true }
);

let _model;

export function getOfficerSettingsModel() {
  if (!_model) {
    const conn = getHeadConn();
    _model = conn.model('OfficerSettings', OfficerSettingsSchema, 'officer_settings');
  }
  return _model;
}

export async function getSingletonOfficerSettings() {
  const Model = getOfficerSettingsModel();
  let doc = await Model.findOne().lean();
  if (!doc) {
    const created = await Model.create({ permissions: OfficerSettingsSchema.path('permissions').defaultValue });
    doc = created.toObject();
  }
  return doc;
}
