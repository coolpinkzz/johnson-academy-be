import httpStatus from 'http-status';
import mongoose from 'mongoose';
import Classes from './classes.model';
import User from '../user/user.model';
import Course from '../course/course.model';
import ApiError from '../errors/ApiError';
import { IOptions, QueryResult } from '../paginate/paginate';
import { NewCreatedClasses, UpdateClassesBody, IClassesDoc } from './classes.interfaces';

/**
 * Create a class
 * @param {NewCreatedClasses} classesBody
 * @returns {Promise<IClassesDoc>}
 */
export const createClasses = async (classesBody: NewCreatedClasses): Promise<IClassesDoc> => {
  // Validate that the teacher exists and is a teacher
  const teacher = await User.findById(classesBody.teacherId);
  if (!teacher) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Teacher not found');
  }
  if (teacher.role !== 'teacher') {
    throw new ApiError(httpStatus.BAD_REQUEST, 'User must be a teacher to be assigned to a class');
  }

  // Validate that the course exists
  const course = await Course.findById(classesBody.courseId);
  if (!course) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Course not found');
  }

  // Validate that all students exist and are students
  if (classesBody.students && classesBody.students.length > 0) {
    const students = await User.find({
      _id: { $in: classesBody.students },
      role: 'student'
    });
    
    if (students.length !== classesBody.students.length) {
      const existingStudentIds = students.map(student => student._id.toString());
      const missingStudentIds = classesBody.students.filter(id => !existingStudentIds.includes(id.toString()));
      throw new ApiError(httpStatus.NOT_FOUND, `Students not found or not valid students: ${missingStudentIds.join(', ')}`);
    }
  }

  return Classes.create(classesBody);
};

/**
 * Query for classes
 * @param {Object} filter - Mongo filter
 * @param {Object} options - Query options
 * @returns {Promise<QueryResult>}
 */
export const queryClasses = async (filter: Record<string, any>, options: IOptions): Promise<QueryResult> => {
  const classes = await Classes.paginate(filter, options);
  return classes;
};

/**
 * Get class by id
 * @param {mongoose.Types.ObjectId} id
 * @returns {Promise<IClassesDoc | null>}
 */
export const getClassesById = async (id: mongoose.Types.ObjectId): Promise<IClassesDoc | null> => 
  Classes.findById(id).populate('teacherId').populate('courseId').populate('students');

/**
 * Get classes by teacher id
 * @param {mongoose.Types.ObjectId} teacherId
 * @returns {Promise<IClassesDoc[]>}
 */
export const getClassesByTeacherId = async (teacherId: mongoose.Types.ObjectId): Promise<IClassesDoc[]> => 
  Classes.find({ teacherId }).populate('teacherId').populate('courseId').populate('students');

/**
 * Get classes by course id
 * @param {mongoose.Types.ObjectId} courseId
 * @returns {Promise<IClassesDoc[]>}
 */
export const getClassesByCourseId = async (courseId: mongoose.Types.ObjectId): Promise<IClassesDoc[]> => 
  Classes.find({ courseId }).populate('teacherId').populate('courseId').populate('students');

/**
 * Get classes by student id
 * @param {mongoose.Types.ObjectId} studentId
 * @returns {Promise<IClassesDoc[]>}
 */
export const getClassesByStudentId = async (studentId: mongoose.Types.ObjectId): Promise<IClassesDoc[]> => 
  Classes.find({ students: studentId }).populate('teacherId').populate('courseId').populate('students');

/**
 * Update class by id
 * @param {mongoose.Types.ObjectId} classesId
 * @param {UpdateClassesBody} updateBody
 * @returns {Promise<IClassesDoc | null>}
 */
export const updateClassesById = async (
  classesId: mongoose.Types.ObjectId,
  updateBody: UpdateClassesBody
): Promise<IClassesDoc | null> => {
  const classes = await getClassesById(classesId);
  if (!classes) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Class not found');
  }

  // Validate teacherId if it's being updated
  if (updateBody.teacherId) {
    const teacher = await User.findById(updateBody.teacherId);
    if (!teacher) {
      throw new ApiError(httpStatus.NOT_FOUND, 'Teacher not found');
    }
    if (teacher.role !== 'teacher') {
      throw new ApiError(httpStatus.BAD_REQUEST, 'User must be a teacher to be assigned to a class');
    }
  }

  // Validate courseId if it's being updated
  if (updateBody.courseId) {
    const course = await Course.findById(updateBody.courseId);
    if (!course) {
      throw new ApiError(httpStatus.NOT_FOUND, 'Course not found');
    }
  }

  // Validate students if they're being updated
  if (updateBody.students && updateBody.students.length > 0) {
    const students = await User.find({
      _id: { $in: updateBody.students },
      role: 'student'
    });
    
    if (students.length !== updateBody.students.length) {
      const existingStudentIds = students.map(student => student._id.toString());
      const missingStudentIds = updateBody.students.filter(id => !existingStudentIds.includes(id.toString()));
      throw new ApiError(httpStatus.NOT_FOUND, `Students not found or not valid students: ${missingStudentIds.join(', ')}`);
    }
  }

  Object.assign(classes, updateBody);
  await classes.save();
  return classes;
};

/**
 * Delete class by id
 * @param {mongoose.Types.ObjectId} classesId
 * @returns {Promise<IClassesDoc | null>}
 */
export const deleteClassesById = async (classesId: mongoose.Types.ObjectId): Promise<IClassesDoc | null> => {
  const classes = await getClassesById(classesId);
  if (!classes) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Class not found');
  }
  await classes.deleteOne();
  return classes;
};

/**
 * Get all classes with populated references
 * @returns {Promise<IClassesDoc[]>}
 */
export const getAllClasses = async (): Promise<IClassesDoc[]> => {
  return Classes.find()
    .populate('teacherId')
    .populate('courseId')
    .populate('students');
};

/**
 * Bulk add students to a class
 * @param {mongoose.Types.ObjectId} classesId
 * @param {mongoose.Types.ObjectId[]} studentIds
 * @returns {Promise<IClassesDoc | null>}
 */
export const bulkAddStudentsToClass = async (
  classesId: mongoose.Types.ObjectId,
  studentIds: mongoose.Types.ObjectId[]
): Promise<IClassesDoc | null> => {
  // Check if class exists
  const classes = await getClassesById(classesId);
  if (!classes) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Class not found');
  }

  // Validate that all students exist and are students
  const students = await User.find({
    _id: { $in: studentIds },
    role: 'student'
  });
  
  if (students.length !== studentIds.length) {
    const existingStudentIds = students.map(student => student._id.toString());
    const missingStudentIds = studentIds.filter(id => !existingStudentIds.includes(id.toString()));
    throw new ApiError(httpStatus.NOT_FOUND, `Students not found or not valid students: ${missingStudentIds.join(', ')}`);
  }

  // Check for duplicate students (students already in the class)
  const existingStudentIds = classes.students.map(student => student.toString());
  const newStudentIds = studentIds.filter(id => !existingStudentIds.includes(id.toString()));
  
  if (newStudentIds.length === 0) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'All students are already enrolled in this class');
  }

  // Add new students to the class
  const updatedClasses = await Classes.findByIdAndUpdate(
    classesId,
    { $addToSet: { students: { $each: newStudentIds } } },
    { new: true }
  ).populate('teacherId').populate('courseId').populate('students');

  return updatedClasses;
}; 