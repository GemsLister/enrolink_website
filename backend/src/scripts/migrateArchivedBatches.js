import mongoose from 'mongoose';
import { getBatchModel } from '../models/Batch.js';
import { getStudentModel } from '../models/Student.js';
import { getHeadArchiveModel } from '../models/HeadArchive.js';
import { getOfficersConn, getHeadConn } from '../config/db.js';

async function migrateArchivedBatches() {
  try {
    // Connect to DBs if not already
    await getOfficersConn();
    await getHeadConn();

    const Batch = getBatchModel();
    const Student = getStudentModel();
    const HeadArchive = getHeadArchiveModel();

    // Find all archived batches
    const archivedBatches = await Batch.find({ archived: true }).lean();
    console.log(`Found ${archivedBatches.length} archived batches to migrate`);

    for (const batch of archivedBatches) {
      // Check if already migrated
      const existing = await HeadArchive.findOne({ originalId: batch._id, role: 'BATCH' }).lean();
      if (existing) {
        console.log(`Batch ${batch.code} already migrated, skipping`);
        continue;
      }

      // Get students count
      const studentsCount = await Student.countDocuments({ batchId: batch._id });

      // Move to archive
      await HeadArchive.create({
        originalId: batch._id,
        role: 'BATCH',
        code: batch.code,
        year: batch.year,
        index: batch.index,
        interviewer: batch.interviewer || '',
        status: batch.status || 'PENDING',
        studentsCount,
        archivedAt: batch.archivedAt || new Date(),
      });

      // Delete from batch
      await Batch.findByIdAndDelete(batch._id);
      console.log(`Migrated batch ${batch.code}`);
    }

    console.log('Migration completed');
    process.exit(0);
  } catch (e) {
    console.error('Migration failed:', e);
    process.exit(1);
  }
}

migrateArchivedBatches();
