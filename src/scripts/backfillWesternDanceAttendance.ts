/**
 * Repair Western Dance students who are on a class roster without an attendance record.
 * Progress is created when the course has a syllabus. Courses with no syllabus get attendance only.
 *
 * Run: yarn compile && yarn script:backfill-western-dance-attendance
 */
import mongoose from 'mongoose';
import config from '../config/config';
import Classes from '../modules/classes/classes.model';
import Course from '../modules/course/course.model';
import User from '../modules/user/user.model';
import StudentAttendance from '../modules/studentAttendance/studentAttendance.model';
import StudentProgress from '../modules/studentProgress/studentProgress.model';
import '../modules/syllabus/syllabus.model';
import '../modules/module/module.model';
import logger from '../modules/logger/logger';

type ClassEnrollment = {
  _id?: mongoose.Types.ObjectId;
  user?: mongoose.Types.ObjectId;
  course?: mongoose.Types.ObjectId;
};

const isMissingSyllabusError = (error: unknown): boolean =>
  error instanceof Error && error.message === 'No syllabi found for this course';

async function backfill() {
  await mongoose.connect(config.mongoose.url);
  logger.info('Connected to MongoDB');

  const danceCourses = await Course.find({
    $or: [{ instrument: /western dance/i }, { name: /western dance/i }],
  }).select('_id');
  const danceCourseIds = danceCourses.map((course) => course._id);

  const classes = await Classes.find({
    $or: [
      { name: /WDC/i },
      { courseId: { $in: danceCourseIds } },
      { 'studentsInClass.course': { $in: danceCourseIds } },
    ],
  });

  let attendanceCreated = 0;
  let progressCreated = 0;
  let progressSkippedNoSyllabus = 0;
  let skippedMissingUser = 0;

  for (const classDoc of classes) {
    const coursesByStudent = new Map<string, Map<string, Date>>();

    for (const entry of (classDoc.studentsInClass ?? []) as ClassEnrollment[]) {
      if (!entry.user) continue;
      const studentId = entry.user.toString();
      const enrolledAt = entry._id?.getTimestamp() ?? new Date();
      const courseMap = coursesByStudent.get(studentId) ?? new Map<string, Date>();
      if (entry.course) {
        const courseId = entry.course.toString();
        const previous = courseMap.get(courseId);
        if (!previous || enrolledAt < previous) courseMap.set(courseId, enrolledAt);
      }
      coursesByStudent.set(studentId, courseMap);
    }

    for (const student of classDoc.students ?? []) {
      const studentId = student.toString();
      if (!coursesByStudent.has(studentId)) coursesByStudent.set(studentId, new Map());
    }

    for (const [studentId, courseMap] of coursesByStudent) {
      const user = await User.findById(studentId).select('name role');
      if (!user || user.role !== 'student') {
        skippedMissingUser += 1;
        continue;
      }

      const studentObjectId = new mongoose.Types.ObjectId(studentId);
      const enrolledDates = [...courseMap.values()];
      const joiningDate =
        enrolledDates.length > 0 ? new Date(Math.min(...enrolledDates.map((date) => date.getTime()))) : new Date();

      const existingAttendance = await StudentAttendance.findOne({
        studentId: studentObjectId,
        classId: classDoc._id,
      });
      if (!existingAttendance) {
        await StudentAttendance.create({
          studentId: studentObjectId,
          classId: classDoc._id,
          joiningDate,
        });
        attendanceCreated += 1;
        logger.info(`Created attendance for ${user.name} in ${classDoc.name}`);
      }

      await User.findByIdAndUpdate(studentObjectId, { $addToSet: { classes: classDoc._id } });

      for (const courseId of courseMap.keys()) {
        const courseObjectId = new mongoose.Types.ObjectId(courseId);
        await User.findByIdAndUpdate(studentObjectId, { $addToSet: { courses: courseObjectId } });

        const existingProgress = await StudentProgress.findOne({
          studentId: studentObjectId,
          classId: classDoc._id,
          courseId: courseObjectId,
        });
        if (existingProgress) {
          await User.findByIdAndUpdate(studentObjectId, { $addToSet: { progress: existingProgress._id } });
          continue;
        }

        try {
          const progress = await StudentProgress.createProgressForStudent(studentObjectId, classDoc._id, courseObjectId);
          await User.findByIdAndUpdate(studentObjectId, { $addToSet: { progress: progress._id } });
          progressCreated += 1;
          logger.info(`Created progress for ${user.name} in ${classDoc.name}`);
        } catch (error) {
          if (!isMissingSyllabusError(error)) throw error;
          progressSkippedNoSyllabus += 1;
          logger.warn(`No syllabus, skipped progress for ${user.name} in ${classDoc.name}`);
        }
      }
    }
  }

  logger.info(
    `Backfill done. attendanceCreated=${attendanceCreated}, progressCreated=${progressCreated}, progressSkippedNoSyllabus=${progressSkippedNoSyllabus}, skippedMissingUser=${skippedMissingUser}`
  );
}

backfill()
  .catch((error) => {
    logger.error('Western Dance attendance backfill failed', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await mongoose.disconnect();
    logger.info('Disconnected from MongoDB');
  });
