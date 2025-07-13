import httpStatus from 'http-status';
import mongoose from 'mongoose';
import StudentAttendance from './studentAttendance.model';
import ApiError from '../errors/ApiError';
import { IOptions, QueryResult } from '../paginate/paginate';
import { NewStudentAttendance, UpdateStudentAttendanceBody, IStudentAttendanceDoc } from './studentAttendance.interfaces';



/**
 * Query for student attendance records
 * @param {Object} filter - Mongo filter
 * @param {Object} options - Query options
 * @returns {Promise<QueryResult>}
 */
export const queryStudentAttendance = async (filter: Record<string, any>, options: IOptions): Promise<QueryResult> => {
  const attendance = await StudentAttendance.paginate(filter, options);
  return attendance;
};

/**
 * Get student attendance by id
 * @param {mongoose.Types.ObjectId} id
 * @returns {Promise<IStudentAttendanceDoc | null>}
 */
export const getStudentAttendanceById = async (id: mongoose.Types.ObjectId): Promise<IStudentAttendanceDoc | null> => {
  return StudentAttendance.findById(id).populate('studentId').populate('classId');
};

/**
 * Get student attendance by studentId and classId
 * @param {mongoose.Types.ObjectId} studentId
 * @param {mongoose.Types.ObjectId} classId
 * @returns {Promise<IStudentAttendanceDoc | null>}
 */
export const getStudentAttendanceByStudentAndClass = async (
  studentId: mongoose.Types.ObjectId,
  classId: mongoose.Types.ObjectId
): Promise<IStudentAttendanceDoc | null> => {
  return StudentAttendance.findOne({ studentId, classId })
    .populate('studentId')
    .populate('classId');
};

/**
 * Update student attendance by id
 * @param {mongoose.Types.ObjectId} attendanceId
 * @param {UpdateStudentAttendanceBody} updateBody
 * @returns {Promise<IStudentAttendanceDoc | null>}
 */
export const updateStudentAttendanceById = async (
  attendanceId: mongoose.Types.ObjectId,
  updateBody: UpdateStudentAttendanceBody
): Promise<IStudentAttendanceDoc | null> => {
  const attendance = await getStudentAttendanceById(attendanceId);
  if (!attendance) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Student attendance record not found');
  }
  Object.assign(attendance, updateBody);
  await attendance.save();
  return attendance;
};

/**
 * Delete student attendance by id
 * @param {mongoose.Types.ObjectId} attendanceId
 * @returns {Promise<IStudentAttendanceDoc | null>}
 */
export const deleteStudentAttendanceById = async (attendanceId: mongoose.Types.ObjectId): Promise<IStudentAttendanceDoc | null> => {
  const attendance = await getStudentAttendanceById(attendanceId);
  if (!attendance) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Student attendance record not found');
  }
  await attendance.deleteOne();
  return attendance;
};

/**
 * Get all attendance records for a student
 * @param {mongoose.Types.ObjectId} studentId
 * @returns {Promise<IStudentAttendanceDoc[]>}
 */
export const getAttendanceByStudent = async (studentId: mongoose.Types.ObjectId): Promise<IStudentAttendanceDoc[]> => {
  return StudentAttendance.find({ studentId }).populate('studentId').populate('classId');
};

/**
 * Get all attendance records for a class
 * @param {mongoose.Types.ObjectId} classId
 * @returns {Promise<IStudentAttendanceDoc[]>}
 */
export const getAttendanceByClass = async (classId: mongoose.Types.ObjectId): Promise<IStudentAttendanceDoc[]> => {
  return StudentAttendance.find({ classId }).populate('studentId').populate('classId');
}; 