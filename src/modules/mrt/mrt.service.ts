import mongoose from 'mongoose';
import { IMRTDoc, IMRTCreateBody, IMRTUpdateBody } from './mrt.interfaces';
import MRT from './mrt.model';
import Course from '../course/course.model';
import StudentProgress from '../studentProgress/studentProgress.model';
import ApiError from '../errors/ApiError';
import httpStatus from 'http-status';
import { IOptions, QueryResult } from '../paginate/paginate';

const mrtPopulate = [
  { path: 'studentId', select: 'name email studentId' },
  { path: 'classId', select: 'name' },
  { path: 'courseId', select: 'name description instrument level' },
  { path: 'createdBy', select: 'name email' },
  { path: 'updatedBy', select: 'name email' },
];

/**
 * Create a new MRT record
 * @param {IMRTCreateBody} mrtBody
 * @param {string} userId - ID of the user creating the record
 * @returns {Promise<IMRTDoc>}
 */
export const createMRT = async (mrtBody: IMRTCreateBody, userId: string): Promise<IMRTDoc> => {
  const course = await Course.findById(mrtBody.courseId);
  if (!course) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Course not found');
  }

  const enrolled = await StudentProgress.findOne({
    studentId: mrtBody.studentId,
    classId: mrtBody.classId,
    courseId: mrtBody.courseId,
  });
  if (!enrolled) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Student is not enrolled in this course in the specified class');
  }

  const existingMRT = await MRT.isMonthExistsForStudent(
    mrtBody.studentId,
    mrtBody.classId,
    mrtBody.month,
    mrtBody.courseId
  );

  if (existingMRT) {
    throw new ApiError(
      httpStatus.CONFLICT,
      'MRT record already exists for this student, class, course, and month'
    );
  }

  const mrt = await MRT.create({
    ...mrtBody,
    createdBy: userId,
  });

  return mrt.populate(mrtPopulate);
};

/**
 * Get MRT by id
 * @param {mongoose.Types.ObjectId} id
 * @returns {Promise<IMRTDoc | null>}
 */
export const getMRTById = async (id: mongoose.Types.ObjectId): Promise<IMRTDoc | null> => {
  return MRT.findById(id).populate(mrtPopulate);
};

/**
 * Get MRT by student, class, course, and month
 * @param {string} studentId
 * @param {string} classId
 * @param {string} month
 * @param {string} courseId
 * @returns {Promise<IMRTDoc | null>}
 */
export const getMRTByStudentClassMonth = async (
  studentId: string,
  classId: string,
  month: string,
  courseId: string
): Promise<IMRTDoc | null> => {
  return MRT.findOne({ studentId, classId, month, courseId }).populate(mrtPopulate);
};

/**
 * Get all MRT records with pagination
 * @param {object} filter - Mongoose filter
 * @param {IOptions} options - Query options
 * @returns {Promise<QueryResult>}
 */
export const queryMRTs = async (filter: Record<string, any>, options: IOptions): Promise<QueryResult> => {
  const mrtResults = await MRT.paginate(filter, {
    ...options,
    populate: mrtPopulate,
  });
  return mrtResults;
};

/**
 * Update MRT by id
 * @param {mongoose.Types.ObjectId} mrtId
 * @param {IMRTUpdateBody} updateBody
 * @param {string} userId - ID of the user updating the record
 * @returns {Promise<IMRTDoc | null>}
 */
export const updateMRTById = async (
  mrtId: mongoose.Types.ObjectId,
  updateBody: IMRTUpdateBody,
  userId: string
): Promise<IMRTDoc | null> => {
  const mrt = await getMRTById(mrtId);
  if (!mrt) {
    throw new ApiError(httpStatus.NOT_FOUND, 'MRT not found');
  }

  Object.assign(mrt, { ...updateBody, updatedBy: userId });
  await mrt.save();
  return mrt.populate(mrtPopulate);
};

/**
 * Delete MRT by id
 * @param {mongoose.Types.ObjectId} mrtId
 * @returns {Promise<IMRTDoc | null>}
 */
export const deleteMRTById = async (mrtId: mongoose.Types.ObjectId): Promise<IMRTDoc | null> => {
  const mrt = await getMRTById(mrtId);
  if (!mrt) {
    throw new ApiError(httpStatus.NOT_FOUND, 'MRT not found');
  }
  await mrt.deleteOne();
  return mrt;
};

/**
 * Get MRT records by student ID
 * @param {string} studentId
 * @param {IOptions} options - Query options
 * @returns {Promise<QueryResult>}
 */
export const getMRTsByStudent = async (studentId: string, options: IOptions): Promise<QueryResult> => {
  return queryMRTs({ studentId }, options);
};

/**
 * Get MRT records by class ID
 * @param {string} classId
 * @param {IOptions} options - Query options
 * @returns {Promise<QueryResult>}
 */
export const getMRTsByClass = async (classId: string, options: IOptions): Promise<QueryResult> => {
  return queryMRTs({ classId }, options);
};

/**
 * Get MRT records by month
 * @param {string} month
 * @param {IOptions} options - Query options
 * @returns {Promise<QueryResult>}
 */
export const getMRTsByMonth = async (month: string, options: IOptions): Promise<QueryResult> => {
  return queryMRTs({ month }, options);
};
