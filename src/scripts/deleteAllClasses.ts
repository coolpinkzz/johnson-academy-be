/**
 * Script: Deletes all classes and cleans up related data.
 * - Removes classes, courses, and progress refs from User model
 * - Deletes all StudentProgress records
 * - Deletes all StudentAttendance records
 * - Deletes all Classes
 *
 * Run: yarn compile && node dist/scripts/deleteAllClasses.js
 * Or: yarn script:delete-all-classes
 */
import mongoose from 'mongoose';
import config from '../config/config';
import Classes from '../modules/classes/classes.model';
import User from '../modules/user/user.model';
import StudentProgress from '../modules/studentProgress/studentProgress.model';
import StudentAttendance from '../modules/studentAttendance/studentAttendance.model';
import logger from '../modules/logger/logger';

async function deleteAllClasses() {
  try {
    await mongoose.connect(config.mongoose.url);
    logger.info('Connected to MongoDB');

    const classes = await Classes.find({}).lean();
    logger.info(`Found ${classes.length} class(es) to process`);

    let usersUpdated = 0;
    let progressDeleted = 0;
    let attendanceDeleted = 0;

    for (const classDoc of classes) {
      const classId = classDoc._id;

      // Get all progress records for this class
      const progressRecords = await StudentProgress.find({ classId }).lean();
      logger.info(`Class ${classId}: ${progressRecords.length} progress record(s)`);

      // For each progress record, remove class, course, and progress from the user
      const studentsWithProgress = new Set<string>();
      for (const progress of progressRecords) {
        const courseId = progress.courseId;
        const progressId = progress._id;
        const studentId = progress.studentId;
        studentsWithProgress.add(studentId.toString());

        const pullOp: Record<string, unknown> = {
          classes: classId,
          progress: progressId,
        };
        if (courseId) pullOp['courses'] = courseId;

        const result = await User.findByIdAndUpdate(studentId, { $pull: pullOp }, { new: true });
        if (result) usersUpdated += 1;
      }

      // Build student -> course map from studentsInClass (each student can have their own course)
      const studentCourseMap = new Map<string, mongoose.Types.ObjectId>();
      const studentsInClass = (classDoc.studentsInClass ?? []) as { user: mongoose.Types.ObjectId; course: mongoose.Types.ObjectId }[];
      for (const entry of studentsInClass) {
        const userId = entry.user?.toString?.() ?? entry.user;
        const courseId = entry.course && (typeof entry.course === 'object' && entry.course._id ? entry.course._id : entry.course);
        if (userId && courseId) studentCourseMap.set(userId, courseId);
      }

      // For students in class without progress record (e.g. progress creation failed), still remove class/course refs
      const classStudents = (classDoc.students ?? []) as mongoose.Types.ObjectId[];
      for (const studentId of classStudents) {
        if (studentsWithProgress.has(studentId.toString())) continue;

        const pullOp: Record<string, unknown> = { classes: classId };
        const courseId = studentCourseMap.get(studentId.toString());
        if (courseId) pullOp['courses'] = courseId;

        const result = await User.findByIdAndUpdate(studentId, { $pull: pullOp }, { new: true });
        if (result) usersUpdated += 1;
      }

      // Delete StudentProgress for this class
      const progressResult = await StudentProgress.deleteMany({ classId });
      progressDeleted += progressResult.deletedCount;

      // Delete StudentAttendance for this class
      const attendanceResult = await StudentAttendance.deleteMany({ classId });
      attendanceDeleted += attendanceResult.deletedCount;
    }

    // Delete all classes
    const classesResult = await Classes.deleteMany({});
    const classesDeleted = classesResult.deletedCount;

    logger.info('Cleanup complete:');
    logger.info(`  - Users updated (refs removed): ${usersUpdated}`);
    logger.info(`  - StudentProgress deleted: ${progressDeleted}`);
    logger.info(`  - StudentAttendance deleted: ${attendanceDeleted}`);
    logger.info(`  - Classes deleted: ${classesDeleted}`);
  } catch (err) {
    logger.error('Delete all classes failed', err);
    throw err;
  } finally {
    await mongoose.disconnect();
    logger.info('Disconnected from MongoDB');
    process.exit(0);
  }
}

deleteAllClasses();
