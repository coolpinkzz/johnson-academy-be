/**
 * Migration script: populates studentsInClass from existing students + courseId on each class.
 * Run after compile: node dist/scripts/migrateStudentsInClass.js
 * Or: yarn compile && yarn script:migrate-students-in-class
 */
import mongoose from 'mongoose';
import config from '../config/config';
import Classes from '../modules/classes/classes.model';
import logger from '../modules/logger/logger';

async function migrate() {
  try {
    await mongoose.connect(config.mongoose.url);
    logger.info('Connected to MongoDB');

    const classes = await Classes.find({}).lean();
    logger.info(`Found ${classes.length} class(es) to process`);

    let updated = 0;
    let skipped = 0;

    for (const classDoc of classes) {
      const students = classDoc.students ?? [];
      const courseId = classDoc.courseId;

      if (students.length === 0) {
        skipped += 1;
        continue;
      }

      const studentsInClass = students.map((userId) => ({
        user: userId,
        course: courseId,
      }));

      await Classes.updateOne(
        { _id: classDoc._id },
        { $set: { studentsInClass } }
      );
      updated += 1;
      logger.info(`Updated class ${classDoc._id} with ${studentsInClass.length} student(s) in class`);
    }

    logger.info(`Migration done. Updated: ${updated}, Skipped (no students): ${skipped}`);
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
