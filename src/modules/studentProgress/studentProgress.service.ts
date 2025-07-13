import httpStatus from 'http-status';
import mongoose from 'mongoose';
import StudentProgress from './studentProgress.model';
import User from '../user/user.model';
import Classes from '../classes/classes.model';
import Course from '../course/course.model';
import ApiError from '../errors/ApiError';
import { IOptions, QueryResult } from '../paginate/paginate';
import { 
  NewCreatedStudentProgress, 
  UpdateStudentProgressBody, 
  IStudentProgressDoc,
  IUpdateModuleProgressBody,
  IStartModuleBody,
  IEndModuleBody 
} from './studentProgress.interfaces';

/**
 * Create student progress record
 * @param {NewCreatedStudentProgress} studentProgressBody
 * @returns {Promise<IStudentProgressDoc>}
 */
export const createStudentProgress = async (studentProgressBody: NewCreatedStudentProgress): Promise<IStudentProgressDoc> => {
  // Validate that the student exists and is a student
  const student = await User.findById(studentProgressBody.studentId);
  if (!student) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Student not found');
  }
  if (student.role !== 'student') {
    throw new ApiError(httpStatus.BAD_REQUEST, 'User must be a student');
  }

  // Validate that the class exists
  const classRecord = await Classes.findById(studentProgressBody.classId);
  if (!classRecord) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Class not found');
  }

  // Validate that the course exists
  const course = await Course.findById(studentProgressBody.courseId);
  if (!course) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Course not found');
  }

  // Check if progress record already exists for this student-class combination
  const existingProgress = await StudentProgress.findByStudentAndClass(
    studentProgressBody.studentId,
    studentProgressBody.classId
  );
  if (existingProgress) {
    throw new ApiError(httpStatus.CONFLICT, 'Progress record already exists for this student in this class');
  }

  return StudentProgress.create(studentProgressBody);
};

/**
 * Create progress record for a student when added to a class
 * @param {mongoose.Types.ObjectId} studentId
 * @param {mongoose.Types.ObjectId} classId
 * @param {mongoose.Types.ObjectId} courseId
 * @returns {Promise<IStudentProgressDoc>}
 */
export const createProgressForStudent = async (
  studentId: mongoose.Types.ObjectId,
  classId: mongoose.Types.ObjectId,
  courseId: mongoose.Types.ObjectId
): Promise<IStudentProgressDoc> => {
  return StudentProgress.createProgressForStudent(studentId, classId, courseId);
};

/**
 * Query for student progress records
 * @param {Object} filter - Mongo filter
 * @param {Object} options - Query options
 * @returns {Promise<QueryResult>}
 */
export const queryStudentProgress = async (filter: Record<string, any>, options: IOptions): Promise<QueryResult> => {
  const studentProgress = await StudentProgress.paginate(filter, options);
  return studentProgress;
};

/**
 * Get student progress by id
 * @param {mongoose.Types.ObjectId} id
 * @returns {Promise<IStudentProgressDoc | null>}
 */
export const getStudentProgressById = async (id: mongoose.Types.ObjectId): Promise<IStudentProgressDoc | null> => 
  StudentProgress.findById(id)
    .populate('studentId', 'name email role')
    .populate('classId', 'name')
    .populate('courseId', 'name description')
    .populate('syllabusProgress.syllabusId', 'title description')
    .populate('syllabusProgress.modules.moduleId', 'title description type session');

/**
 * Get student progress by student and class
 * @param {mongoose.Types.ObjectId} studentId
 * @param {mongoose.Types.ObjectId} classId
 * @returns {Promise<IStudentProgressDoc | null>}
 */
export const getStudentProgressByStudentAndClass = async (
  studentId: mongoose.Types.ObjectId,
  classId: mongoose.Types.ObjectId
): Promise<IStudentProgressDoc | null> => 
  StudentProgress.findByStudentAndClass(studentId, classId);

/**
 * Get all progress records for a student
 * @param {mongoose.Types.ObjectId} studentId
 * @returns {Promise<IStudentProgressDoc[]>}
 */
export const getStudentProgressByStudent = async (studentId: mongoose.Types.ObjectId): Promise<IStudentProgressDoc[]> => 
  StudentProgress.findByStudent(studentId);

/**
 * Get all progress records for a class
 * @param {mongoose.Types.ObjectId} classId
 * @returns {Promise<IStudentProgressDoc[]>}
 */
export const getStudentProgressByClass = async (classId: mongoose.Types.ObjectId): Promise<IStudentProgressDoc[]> => 
  StudentProgress.findByClass(classId);

/**
 * Get all progress records for a course
 * @param {mongoose.Types.ObjectId} courseId
 * @returns {Promise<IStudentProgressDoc[]>}
 */
export const getStudentProgressByCourse = async (courseId: mongoose.Types.ObjectId): Promise<IStudentProgressDoc[]> => 
  StudentProgress.findByCourse(courseId);

/**
 * Update student progress by id
 * @param {mongoose.Types.ObjectId} studentProgressId
 * @param {UpdateStudentProgressBody} updateBody
 * @returns {Promise<IStudentProgressDoc | null>}
 */
export const updateStudentProgressById = async (
  studentProgressId: mongoose.Types.ObjectId,
  updateBody: UpdateStudentProgressBody
): Promise<IStudentProgressDoc | null> => {
  const studentProgress = await getStudentProgressById(studentProgressId);
  if (!studentProgress) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Student progress not found');
  }

  Object.assign(studentProgress, updateBody);
  await studentProgress.save();
  return studentProgress;
};

/**
 * Update module progress for a student
 * @param {mongoose.Types.ObjectId} studentProgressId
 * @param {IUpdateModuleProgressBody} updateBody
 * @returns {Promise<IStudentProgressDoc | null>}
 */
export const updateModuleProgress = async (
  studentProgressId: mongoose.Types.ObjectId,
  updateBody: IUpdateModuleProgressBody
): Promise<IStudentProgressDoc | null> => {
  const studentProgress = await getStudentProgressById(studentProgressId);
  if (!studentProgress) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Student progress not found');
  }

  await studentProgress.updateModuleStatus(
    updateBody.moduleId,
    updateBody.status,
    updateBody.score,
    updateBody.remark
  );

  return studentProgress;
};

/**
 * Delete student progress by id
 * @param {mongoose.Types.ObjectId} studentProgressId
 * @returns {Promise<IStudentProgressDoc | null>}
 */
export const deleteStudentProgressById = async (studentProgressId: mongoose.Types.ObjectId): Promise<IStudentProgressDoc | null> => {
  const studentProgress = await getStudentProgressById(studentProgressId);
  if (!studentProgress) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Student progress not found');
  }
  await studentProgress.deleteOne();
  return studentProgress;
};

/**
 * Get progress statistics for a class
 * @param {mongoose.Types.ObjectId} classId
 * @returns {Promise<Object>}
 */
export const getClassProgressStatistics = async (classId: mongoose.Types.ObjectId): Promise<Object> => {
  const progressRecords = await getStudentProgressByClass(classId);
  
  if (progressRecords.length === 0) {
    return {
      totalStudents: 0,
      averageProgress: 0,
      completedStudents: 0,
      inProgressStudents: 0,
      notStartedStudents: 0,
    };
  }

  const totalStudents = progressRecords.length;
  const averageProgress = Math.round(
    progressRecords.reduce((sum, record) => sum + record.progress, 0) / totalStudents
  );
  const completedStudents = progressRecords.filter(record => record.progress === 100).length;
  const inProgressStudents = progressRecords.filter(record => record.progress > 0 && record.progress < 100).length;
  const notStartedStudents = progressRecords.filter(record => record.progress === 0).length;

  return {
    totalStudents,
    averageProgress,
    completedStudents,
    inProgressStudents,
    notStartedStudents,
  };
};

/**
 * Get progress statistics for a course
 * @param {mongoose.Types.ObjectId} courseId
 * @returns {Promise<Object>}
 */
export const getCourseProgressStatistics = async (courseId: mongoose.Types.ObjectId): Promise<Object> => {
  const progressRecords = await getStudentProgressByCourse(courseId);
  
  if (progressRecords.length === 0) {
    return {
      totalStudents: 0,
      averageProgress: 0,
      completedStudents: 0,
      inProgressStudents: 0,
      notStartedStudents: 0,
    };
  }

  const totalStudents = progressRecords.length;
  const averageProgress = Math.round(
    progressRecords.reduce((sum, record) => sum + record.progress, 0) / totalStudents
  );
  const completedStudents = progressRecords.filter(record => record.progress === 100).length;
  const inProgressStudents = progressRecords.filter(record => record.progress > 0 && record.progress < 100).length;
  const notStartedStudents = progressRecords.filter(record => record.progress === 0).length;

  return {
    totalStudents,
    averageProgress,
    completedStudents,
    inProgressStudents,
    notStartedStudents,
  };
};

/**
 * Start a module for a student
 * @param {mongoose.Types.ObjectId} studentProgressId
 * @param {IStartModuleBody} startBody
 * @returns {Promise<IStudentProgressDoc | null>}
 */
export const startModule = async (
  studentProgressId: mongoose.Types.ObjectId,
  startBody: IStartModuleBody
): Promise<IStudentProgressDoc | null> => {
  const studentProgress = await StudentProgress.findById(studentProgressId);
  if (!studentProgress) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Student progress not found');
  }

  // Find the syllabus progress that contains the module
  const syllabusProgress = studentProgress.syllabusProgress.find(
    sp => sp.syllabusId.toString() === startBody.syllabusId.toString()
  );

  if (!syllabusProgress) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Syllabus progress not found');
  }

  // Find the module in the syllabus
  const moduleProgress = syllabusProgress.modules.find(
    mp => mp.moduleId.toString() === startBody.moduleId.toString()
  );

  if (!moduleProgress) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Module not found in syllabus');
  }

  // Check if module is in upcoming status
  if (moduleProgress.status !== 'upcoming') {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Module must be in upcoming status to start');
  }

  // Use the existing updateModuleStatus method to update the module
  await studentProgress.updateModuleStatus(
    startBody.moduleId,
    'inprogress'
  );

  return studentProgress;
};

/**
 * End a module for a student
 * @param {mongoose.Types.ObjectId} studentProgressId
 * @param {IEndModuleBody} endBody
 * @returns {Promise<IStudentProgressDoc | null>}
 */
export const endModule = async (
  studentProgressId: mongoose.Types.ObjectId,
  endBody: IEndModuleBody
): Promise<IStudentProgressDoc | null> => {
  const studentProgress = await StudentProgress.findById(studentProgressId);
  if (!studentProgress) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Student progress not found');
  }

  // Find the syllabus progress that contains the module
  const syllabusProgress = studentProgress.syllabusProgress.find(
    sp => sp.syllabusId.toString() === endBody.syllabusId.toString()
  );

  if (!syllabusProgress) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Syllabus progress not found');
  }

  // Find the module in the syllabus
  const moduleProgress = syllabusProgress.modules.find(
    mp => mp.moduleId.toString() === endBody.moduleId.toString()
  );

  if (!moduleProgress) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Module not found in syllabus');
  }

  // Check if module is in inprogress status
  if (moduleProgress.status !== 'inprogress') {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Module must be in inprogress status to end');
  }

  // Validate score range
  if (endBody.score < 0 || endBody.score > 100) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Score must be between 0 and 100');
  }

  // Use the existing updateModuleStatus method to update the module
  await studentProgress.updateModuleStatus(
    endBody.moduleId,
    'completed',
    endBody.score,
    endBody.remark
  );

  return studentProgress;
}; 