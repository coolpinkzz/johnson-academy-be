/**
 * Migration: add courseId to MRT records and update unique index to
 * { month, classId, studentId, courseId }.
 *
 * Run: yarn compile && yarn script:migrate-mrt-course-id
 */
import mongoose from 'mongoose';
import config from '../config/config';
import logger from '../modules/logger/logger';
import StudentProgress from '../modules/studentProgress/studentProgress.model';
import Classes from '../modules/classes/classes.model';

async function resolveCourseIdForMrt(
  studentId: mongoose.Types.ObjectId,
  classId: mongoose.Types.ObjectId
): Promise<mongoose.Types.ObjectId | null> {
  const progressRecords = await StudentProgress.find({ studentId, classId }).sort({ createdAt: 1 }).lean();

  if (progressRecords.length === 1) {
    return progressRecords[0]!.courseId as mongoose.Types.ObjectId;
  }

  if (progressRecords.length > 1) {
    // Use earliest enrolled course (first progress record)
    return progressRecords[0]!.courseId as mongoose.Types.ObjectId;
  }

  const classDoc = await Classes.findById(classId).lean();
  if (!classDoc) {
    return null;
  }

  const studentEntry = (classDoc.studentsInClass ?? []).find(
    (entry) => entry.user?.toString() === studentId.toString()
  );
  if (studentEntry?.course) {
    return studentEntry.course as mongoose.Types.ObjectId;
  }

  if (classDoc.courseId) {
    return classDoc.courseId as mongoose.Types.ObjectId;
  }

  return null;
}

async function migrate() {
  try {
    await mongoose.connect(config.mongoose.url);
    logger.info('Connected to MongoDB');

    const collection = mongoose.connection.collection('mrts');
    const mrtRecords = await collection.find({}).toArray();

    logger.info(`Found ${mrtRecords.length} MRT record(s) to process`);

    let updated = 0;
    let skipped = 0;

    for (const mrt of mrtRecords) {
      if (mrt['courseId']) {
        continue;
      }

      const studentId = mrt['studentId'] as mongoose.Types.ObjectId;
      const classId = mrt['classId'] as mongoose.Types.ObjectId;
      const courseId = await resolveCourseIdForMrt(studentId, classId);

      if (!courseId) {
        logger.warn(`Could not resolve courseId for MRT ${mrt['_id']} (student=${studentId}, class=${classId})`);
        skipped += 1;
        continue;
      }

      await collection.updateOne({ _id: mrt['_id'] }, { $set: { courseId } });
      updated += 1;
      logger.info(`Updated MRT ${mrt['_id']} with courseId ${courseId}`);
    }

    const indexes = await collection.indexes();

    const oldIndex = indexes.find(
      (index) =>
        index['key'] &&
        index['key']['month'] === 1 &&
        index['key']['classId'] === 1 &&
        index['key']['studentId'] === 1 &&
        index['key']['courseId'] === undefined &&
        index['unique'] === true
    );

    if (oldIndex && oldIndex['name']) {
      logger.info(`Dropping old index: ${oldIndex['name']}`);
      await collection.dropIndex(oldIndex['name']);
    } else {
      logger.info('Old unique index { month, classId, studentId } not found — skipping drop');
    }

    const newIndexName = 'month_1_classId_1_studentId_1_courseId_1';
    const hasNewIndex = indexes.some((index) => index['name'] === newIndexName);

    if (!hasNewIndex) {
      logger.info('Creating new unique index { month, classId, studentId, courseId }');
      await collection.createIndex({ month: 1, classId: 1, studentId: 1, courseId: 1 }, { unique: true });
    } else {
      logger.info('New index already exists — skipping create');
    }

    logger.info(`Migration done. courseId backfilled: ${updated}, skipped: ${skipped}`);
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
