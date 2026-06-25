/**
 * Migration script: update StudentProgress index from { studentId, classId }
 * to { studentId, classId, courseId } to support multiple courses per class.
 *
 * Run: yarn compile && yarn script:migrate-student-progress-index
 */
import mongoose from 'mongoose';
import config from '../config/config';
import logger from '../modules/logger/logger';

async function migrate() {
  try {
    await mongoose.connect(config.mongoose.url);
    logger.info('Connected to MongoDB');

    const collection = mongoose.connection.collection('studentprogresses');
    const indexes = await collection.indexes();

    const oldIndex = indexes.find(
      (index) =>
        index['key'] &&
        index['key']['studentId'] === 1 &&
        index['key']['classId'] === 1 &&
        index['key']['courseId'] === undefined &&
        index['unique'] === true
    );

    if (oldIndex && oldIndex['name']) {
      logger.info(`Dropping old index: ${oldIndex['name']}`);
      await collection.dropIndex(oldIndex['name']);
    } else {
      logger.info('Old unique index { studentId, classId } not found — skipping drop');
    }

    const newIndexName = 'studentId_1_classId_1_courseId_1';
    const hasNewIndex = indexes.some((index) => index['name'] === newIndexName);

    if (!hasNewIndex) {
      logger.info('Creating new unique index { studentId, classId, courseId }');
      await collection.createIndex({ studentId: 1, classId: 1, courseId: 1 }, { unique: true });
    } else {
      logger.info('New index already exists — skipping create');
    }

    logger.info('Migration completed successfully');
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
