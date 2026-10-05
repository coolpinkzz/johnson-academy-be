/**
 * Revert students who were promoted from Keyboard Initial Course
 * straight to Western Keyboard - Level 2.
 *
 * Keeps the Keyboard Initial enrollment in the same class.
 * Removes only the Level 2 class enrollment, progress, MRT rows, and promotion record.
 * Students enrolled on Level 2 directly, or promoted from Western Keyboard- Level 1, are left unchanged.
 *
 * Dry run (default):
 *   yarn compile && yarn script:revert-initial-level2-promotions
 * Apply:
 *   yarn compile && yarn script:revert-initial-level2-promotions --apply
 */
import mongoose from 'mongoose';
import config from '../config/config';
import logger from '../modules/logger/logger';
import Course from '../modules/course/course.model';
import Classes from '../modules/classes/classes.model';
import User from '../modules/user/user.model';
import StudentProgress from '../modules/studentProgress/studentProgress.model';
import StudentPromotion from '../modules/studentPromotion/studentPromotion.model';
import MRT from '../modules/mrt/mrt.model';

const INITIAL_COURSE_NAME = 'Keyboard Initial Course';
const LEVEL_1_COURSE_NAME = 'Western Keyboard- Level 1';
const LEVEL_2_COURSE_NAME = 'Western Keyboard - Level 2';

interface EnrollmentPair {
  studentId: mongoose.Types.ObjectId;
  classId: mongoose.Types.ObjectId;
}

const pairKey = (studentId: mongoose.Types.ObjectId, classId: mongoose.Types.ObjectId): string =>
  `${studentId.toString()}:${classId.toString()}`;

async function courseIdByName(name: string): Promise<mongoose.Types.ObjectId> {
  const course = await Course.findOne({ name }).select('_id name').lean();
  if (!course) {
    throw new Error(`Course not found: ${name}`);
  }
  return course._id as mongoose.Types.ObjectId;
}

async function collectPairs(
  courseId: mongoose.Types.ObjectId
): Promise<Map<string, EnrollmentPair>> {
  const pairs = new Map<string, EnrollmentPair>();

  const progressRows = await StudentProgress.find({ courseId }).select('studentId classId').lean();
  progressRows.forEach((row) => {
    const studentId = row.studentId as mongoose.Types.ObjectId;
    const classId = row.classId as mongoose.Types.ObjectId;
    pairs.set(pairKey(studentId, classId), { studentId, classId });
  });

  const classes = await Classes.find({ 'studentsInClass.course': courseId }).select('studentsInClass').lean();
  classes.forEach((classDoc) => {
    (classDoc.studentsInClass ?? []).forEach((entry) => {
      if (entry.course?.toString() !== courseId.toString() || !entry.user) {
        return;
      }
      const studentId = entry.user as mongoose.Types.ObjectId;
      const classId = classDoc._id as mongoose.Types.ObjectId;
      pairs.set(pairKey(studentId, classId), { studentId, classId });
    });
  });

  return pairs;
}

async function revertPair(
  pair: EnrollmentPair,
  level2CourseId: mongoose.Types.ObjectId,
  session: mongoose.ClientSession
): Promise<void> {
  const { studentId, classId } = pair;

  const level2Progress = await StudentProgress.find({ studentId, classId, courseId: level2CourseId })
    .session(session)
    .select('_id')
    .lean();
  const progressIds = level2Progress.map((row) => row._id as mongoose.Types.ObjectId);

  await Classes.updateOne(
    { _id: classId },
    { $pull: { studentsInClass: { user: studentId, course: level2CourseId } } },
    { session }
  );

  if (progressIds.length > 0) {
    await StudentProgress.deleteMany({ _id: { $in: progressIds } }, { session });
  }

  await MRT.deleteMany({ studentId, classId, courseId: level2CourseId }, { session });
  await StudentPromotion.deleteMany({ studentId, classId, targetCourseId: level2CourseId }, { session });

  const remainingProgress = await StudentProgress.countDocuments({ studentId, courseId: level2CourseId }).session(session);
  const remainingClassEnrollment = await Classes.countDocuments({
    studentsInClass: { $elemMatch: { user: studentId, course: level2CourseId } },
  }).session(session);

  const pull: Record<string, unknown> = {};
  if (progressIds.length > 0) {
    pull['progress'] = { $in: progressIds };
  }
  if (remainingProgress === 0 && remainingClassEnrollment === 0) {
    pull['courses'] = level2CourseId;
  }

  if (Object.keys(pull).length > 0) {
    await User.updateOne({ _id: studentId }, { $pull: pull }, { session });
  }
}

async function run(): Promise<void> {
  const apply = process.argv.includes('--apply');
  await mongoose.connect(config.mongoose.url);
  logger.info(`Connected to MongoDB (${apply ? 'apply' : 'dry run'})`);

  const initialCourseId = await courseIdByName(INITIAL_COURSE_NAME);
  const level1CourseId = await courseIdByName(LEVEL_1_COURSE_NAME);
  const level2CourseId = await courseIdByName(LEVEL_2_COURSE_NAME);

  const initialPairs = await collectPairs(initialCourseId);
  const level1Pairs = await collectPairs(level1CourseId);
  const level2Pairs = await collectPairs(level2CourseId);

  const candidates: EnrollmentPair[] = [];
  level2Pairs.forEach((pair, key) => {
    if (!initialPairs.has(key) || level1Pairs.has(key)) {
      return;
    }
    candidates.push(pair);
  });

  logger.info(
    `Level 2 enrollments: ${level2Pairs.size}. Initial + Level 2 (no Level 1) in the same class: ${candidates.length}`
  );

  const users = await User.find({ _id: { $in: candidates.map((pair) => pair.studentId) } })
    .select('name rollNumber')
    .lean();
  const classes = await Classes.find({ _id: { $in: candidates.map((pair) => pair.classId) } })
    .select('name')
    .lean();
  const userName = new Map(users.map((user) => [user._id.toString(), `${user.name} (${user.rollNumber ?? 'no roll'})`]));
  const className = new Map(classes.map((classDoc) => [classDoc._id.toString(), classDoc.name]));

  candidates.forEach((pair) => {
    logger.info(
      `${apply ? 'Reverting' : 'Would revert'} ${userName.get(pair.studentId.toString()) ?? pair.studentId.toString()} in ${
        className.get(pair.classId.toString()) ?? pair.classId.toString()
      }`
    );
  });

  if (!apply) {
    logger.info('Dry run only. Re-run with --apply to update the database.');
    return;
  }

  if (candidates.length === 0) {
    logger.info('Nothing to revert.');
    return;
  }

  const session = await mongoose.startSession();
  try {
    await session.withTransaction(async () => {
      for (const pair of candidates) {
        await revertPair(pair, level2CourseId, session);
      }
    });
    logger.info(`Reverted ${candidates.length} student enrollment(s) to ${INITIAL_COURSE_NAME} only.`);
  } finally {
    await session.endSession();
  }
}

run()
  .catch((error) => {
    logger.error('Revert failed', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await mongoose.disconnect();
    logger.info('Disconnected from MongoDB');
  });
