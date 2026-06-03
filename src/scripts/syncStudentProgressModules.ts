/**
 * Backfill student progress module snapshots from the modules collection (idempotent).
 *
 * Usage:
 *   node dist/scripts/syncStudentProgressModules.js
 *   node dist/scripts/syncStudentProgressModules.js <syllabusId>
 *
 * Run: yarn compile && node dist/scripts/syncStudentProgressModules.js
 */
import mongoose from 'mongoose';
import config from '../config/config';
import logger from '../modules/logger/logger';
import { syncAllModulesForSyllabusToStudentProgress } from '../modules/studentProgress/studentProgress.service';
import Module from '../modules/module/module.model';

async function run() {
  const syllabusIdArg = process.argv[2];

  try {
    await mongoose.connect(config.mongoose.url);
    logger.info('Connected to MongoDB');

    if (syllabusIdArg) {
      await syncAllModulesForSyllabusToStudentProgress(new mongoose.Types.ObjectId(syllabusIdArg));
      logger.info(`Synced modules for syllabus ${syllabusIdArg}`);
    } else {
      const syllabusIds = await Module.distinct('syllabusId', {
        syllabusId: { $exists: true, $ne: null },
      });
      logger.info(`Syncing ${syllabusIds.length} syllabus(es)`);

      for (const syllabusId of syllabusIds) {
        await syncAllModulesForSyllabusToStudentProgress(syllabusId as mongoose.Types.ObjectId);
        logger.info(`Synced syllabus ${syllabusId.toString()}`);
      }
    }
  } catch (error) {
    logger.error(error);
    process.exitCode = 1;
  } finally {
    await mongoose.disconnect();
  }
}

run();
