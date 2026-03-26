/**
 * Migration script: sets seq field for existing modules based on syllabusId.
 * Modules within each syllabus are ordered by createdAt and assigned seq 1, 2, 3, ...
 * Modules without syllabusId are skipped.
 *
 * Run after compile: node dist/scripts/migrateModuleSeq.js
 * Or: yarn compile && yarn script:migrate-module-seq
 */
import mongoose from 'mongoose';
import config from '../config/config';
import Module from '../modules/module/module.model';
import logger from '../modules/logger/logger';

async function migrate() {
  try {
    await mongoose.connect(config.mongoose.url);
    logger.info('Connected to MongoDB');

    // Get all modules with syllabusId, sorted by syllabusId then createdAt
    const modules = await Module.find({ syllabusId: { $exists: true, $ne: null } })
      .sort({ syllabusId: 1, createdAt: 1 })
      .lean();

    logger.info(`Found ${modules.length} module(s) with syllabusId to process`);

    let updated = 0;
    let currentSyllabusId: string | null = null;
    let seq = 0;

    for (const moduleDoc of modules) {
      const syllabusIdStr = moduleDoc.syllabusId?.toString() ?? null;

      // Reset seq when we move to a new syllabus
      if (syllabusIdStr !== currentSyllabusId) {
        currentSyllabusId = syllabusIdStr;
        seq = 1;
      } else {
        seq += 1;
      }

      await Module.updateOne({ _id: moduleDoc._id }, { $set: { seq } });
      updated += 1;
      logger.info(`Updated module ${moduleDoc._id} with seq=${seq} (syllabusId: ${syllabusIdStr})`);
    }

    logger.info(`Migration done. Updated: ${updated} module(s)`);
  } catch (err) {
    logger.error('Migration failed', err);
    throw err;
  } finally {
    await mongoose.disconnect();
    logger.info('Disconnected from MongoDB');
    process.exit(0);
  }
}

migrate();
