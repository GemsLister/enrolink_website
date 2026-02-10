import { getOfficerUserModel } from '../models/User.js';
import { getBatchModel } from '../models/Batch.js';

/**
 * One-time script: backfill officer.assignedBatches from existing Batch.interviewer values.
 * Run once via node or an admin endpoint.
 */
export async function backfillOfficerAssignedBatches() {
  const User = getOfficerUserModel();
  const Batch = getBatchModel();

  // Get all non-archived batches with an interviewer
  const batches = await Batch.find({ archived: { $ne: true }, interviewer: { $exists: true, $ne: '' } }).lean();
  console.log(`[backfill] Found ${batches.length} batches with interviewer.`);

  // Group batch codes by interviewer (case-insensitive)
  const interviewerToBatches = {};
  for (const batch of batches) {
    const key = batch.interviewer.trim().toLowerCase();
    if (!interviewerToBatches[key]) interviewerToBatches[key] = new Set();
    interviewerToBatches[key].add(batch.code);
  }

  // Find all officers
  const officers = await User.find({ role: 'OFFICER' }).lean();
  console.log(`[backfill] Found ${officers.length} officers.`);

  let updated = 0;
  for (const officer of officers) {
    const keys = [
      officer.name?.trim().toLowerCase(),
      officer.email?.trim().toLowerCase()
    ].filter(Boolean);

    const batchCodesSet = new Set();
    for (const key of keys) {
      if (interviewerToBatches[key]) {
        for (const code of interviewerToBatches[key]) batchCodesSet.add(code);
      }
    }

    if (batchCodesSet.size > 0) {
      const batchCodes = Array.from(batchCodesSet);
      await User.findByIdAndUpdate(officer._id, {
        $addToSet: { assignedBatches: { $each: batchCodes } }
      });
      console.log(`[backfill] Updated officer ${officer.name || officer.email} with batches: ${batchCodes.join(', ')}`);
      updated++;
    }
  }

  console.log(`[backfill] Done. Updated ${updated} officers.`);
  return updated;
}

// Run if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  backfillOfficerAssignedBatches()
    .then((n) => {
      console.log(`Backfill complete. Updated ${n} officers.`);
      process.exit(0);
    })
    .catch((e) => {
      console.error('Backfill failed:', e);
      process.exit(1);
    });
}
