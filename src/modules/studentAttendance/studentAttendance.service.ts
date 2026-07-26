import httpStatus from 'http-status';
import mongoose from 'mongoose';
import StudentAttendance from './studentAttendance.model';
import ApiError from '../errors/ApiError';
import { IOptions, QueryResult } from '../paginate/paginate';
import { UpdateStudentAttendanceBody, IStudentAttendanceDoc } from './studentAttendance.interfaces';

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
  return StudentAttendance.findOne({ studentId, classId }).populate('studentId').populate('classId');
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
export const deleteStudentAttendanceById = async (
  attendanceId: mongoose.Types.ObjectId
): Promise<IStudentAttendanceDoc | null> => {
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

/**
 * Mark student attendance as present for a specific date
 * @param {mongoose.Types.ObjectId} attendanceId
 * @param {mongoose.Types.ObjectId} studentId
 * @param {mongoose.Types.ObjectId} classId
 * @param {Date} date
 * @returns {Promise<IStudentAttendanceDoc | null>}
 */
export const markAttendancePresent = async (
  attendanceId: mongoose.Types.ObjectId,
  studentId: mongoose.Types.ObjectId,
  classId: mongoose.Types.ObjectId,
  date: Date
): Promise<IStudentAttendanceDoc | null> => {
  const attendance = await getStudentAttendanceById(attendanceId);
  if (!attendance) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Student attendance record not found');
  }

  // Verify the attendance record belongs to the specified student and class
  if (
    attendance.studentId._id.toString() !== studentId.toString() ||
    attendance.classId._id.toString() !== classId.toString()
  ) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Attendance record does not match the specified student and class');
  }

  // Check if date is already marked as present
  const isAlreadyPresent = attendance.presentDates.some((presentDate) => presentDate.toDateString() === date.toDateString());

  if (isAlreadyPresent) {
    throw new ApiError(httpStatus.CONFLICT, 'Attendance for this date is already marked as present');
  }

  // Remove from absentDates if it exists there
  attendance.absentDates = attendance.absentDates.filter((absentDate) => absentDate.toDateString() !== date.toDateString());

  // Add to presentDates
  attendance.presentDates.push(date);

  // Update lastDate
  attendance.lastDate = date;

  await attendance.save();
  return attendance;
};

/**
 * Mark student attendance as absent for a specific date
 * @param {mongoose.Types.ObjectId} attendanceId
 * @param {mongoose.Types.ObjectId} studentId
 * @param {mongoose.Types.ObjectId} classId
 * @param {Date} date
 * @returns {Promise<IStudentAttendanceDoc | null>}
 */
export const markAttendanceAbsent = async (
  attendanceId: mongoose.Types.ObjectId,
  studentId: mongoose.Types.ObjectId,
  classId: mongoose.Types.ObjectId,
  date: Date
): Promise<IStudentAttendanceDoc | null> => {
  const attendance = await getStudentAttendanceById(attendanceId);
  if (!attendance) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Student attendance record not found');
  }
  // Verify the attendance record belongs to the specified student and class
  if (
    attendance.studentId._id.toString() !== studentId.toString() ||
    attendance.classId._id.toString() !== classId.toString()
  ) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Attendance record does not match the specified student and class');
  }

  // Check if date is already marked as absent
  const isAlreadyAbsent = attendance.absentDates.some((absentDate) => absentDate.toDateString() === date.toDateString());

  if (isAlreadyAbsent) {
    throw new ApiError(httpStatus.CONFLICT, 'Attendance for this date is already marked as absent');
  }

  // Remove from presentDates if it exists there
  attendance.presentDates = attendance.presentDates.filter(
    (presentDate) => presentDate.toDateString() !== date.toDateString()
  );

  // Add to absentDates
  attendance.absentDates.push(date);

  // Update lastDate
  attendance.lastDate = date;

  await attendance.save();
  return attendance;
};

/**
 * Clear student attendance for a specific date (remove from present and absent)
 * @param {mongoose.Types.ObjectId} attendanceId
 * @param {mongoose.Types.ObjectId} studentId
 * @param {mongoose.Types.ObjectId} classId
 * @param {Date} date
 * @returns {Promise<IStudentAttendanceDoc | null>}
 */
export const clearAttendanceForDate = async (
  attendanceId: mongoose.Types.ObjectId,
  studentId: mongoose.Types.ObjectId,
  classId: mongoose.Types.ObjectId,
  date: Date
): Promise<IStudentAttendanceDoc | null> => {
  const attendance = await getStudentAttendanceById(attendanceId);
  if (!attendance) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Student attendance record not found');
  }

  if (
    attendance.studentId._id.toString() !== studentId.toString() ||
    attendance.classId._id.toString() !== classId.toString()
  ) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Attendance record does not match the specified student and class');
  }

  const isPresent = attendance.presentDates.some((presentDate) => presentDate.toDateString() === date.toDateString());
  const isAbsent = attendance.absentDates.some((absentDate) => absentDate.toDateString() === date.toDateString());

  if (!isPresent && !isAbsent) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'No attendance marked for this date to clear');
  }

  attendance.presentDates = attendance.presentDates.filter(
    (presentDate) => presentDate.toDateString() !== date.toDateString()
  );
  attendance.absentDates = attendance.absentDates.filter((absentDate) => absentDate.toDateString() !== date.toDateString());

  const remainingDates = [...attendance.presentDates, ...attendance.absentDates];
  if (remainingDates.length === 0) {
    attendance.set('lastDate', undefined);
  } else {
    attendance.lastDate = new Date(Math.max(...remainingDates.map((d) => d.getTime())));
  }

  await attendance.save();
  return attendance;
};
