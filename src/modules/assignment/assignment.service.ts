import httpStatus from 'http-status';
import mongoose from 'mongoose';
import Assignment from './assignment.model';
import User from '../user/user.model';
import Classes from '../classes/classes.model';
import { isUserClassTeacher } from '../classes/classes.util';
import ApiError from '../errors/ApiError';
import { IOptions, QueryResult } from '../paginate/paginate';
import { NewCreatedAssignment, UpdateAssignmentBody, IAssignmentDoc, UpdateSubmissionBody } from './assignment.interfaces';

/**
 * Create an assignment
 * @param {NewCreatedAssignment} assignmentBody
 * @returns {Promise<IAssignmentDoc>}
 */
export const createAssignment = async (assignmentBody: NewCreatedAssignment): Promise<IAssignmentDoc> => {
  // Validate that the teacher exists and is a teacher
  const teacher = await User.findById(assignmentBody.teacherId);
  if (!teacher) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Teacher not found');
  }
  if (teacher.role !== 'teacher') {
    throw new ApiError(httpStatus.BAD_REQUEST, 'User must be a teacher');
  }

  // Validate that the class exists
  const classDoc = await Classes.findById(assignmentBody.classId);
  if (!classDoc) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Class not found');
  }

  // Validate that the teacher is assigned to the class
  if (!isUserClassTeacher(classDoc.toObject(), assignmentBody.teacherId.toString())) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Teacher is not assigned to this class');
  }

  // Validate that the creator exists
  const creator = await User.findById(assignmentBody.createdBy);
  if (!creator) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Creator not found');
  }

  // Fetch students from the class and set them in the assignment
  const studentsFromClass = classDoc.students || [];

  // If specific students are provided in the payload, validate they are in the class
  if (assignmentBody.students && assignmentBody.students.length > 0) {
    const invalidStudents = assignmentBody.students.filter(
      (studentId) => !studentsFromClass.some((classStudentId) => classStudentId.toString() === studentId.toString())
    );

    if (invalidStudents.length > 0) {
      throw new ApiError(httpStatus.BAD_REQUEST, `Students not enrolled in this class: ${invalidStudents.join(', ')}`);
    }

    // Use the provided students
    assignmentBody.students = assignmentBody.students;
  } else {
    // Use all students from the class
    assignmentBody.students = studentsFromClass;
  }

  const assignment = await Assignment.create(assignmentBody);
  return assignment;
};

/**
 * Query for assignments
 * @param {Object} filter - Mongo filter
 * @param {Object} options - Query options
 * @returns {Promise<QueryResult>}
 */
export const queryAssignments = async (filter: Record<string, any>, options: IOptions): Promise<QueryResult> => {
  // Set default populate fields
  if (!options.populate) {
    options.populate = 'students,teacherId,classId,createdBy';
  }

  // Set default sort to latest to oldest if no sort is specified
  if (!options.sortBy) {
    options.sortBy = 'createdAt:desc';
  }

  // Handle students filter - if students filter is provided, find assignments where the student is in the students array
  if (filter['students']) {
    filter['students'] = { $in: [filter['students']] };
  }

  const assignments = await Assignment.paginate(filter, options);
  return assignments;
};

/**
 * Get assignment by id
 * @param {mongoose.Types.ObjectId} id
 * @returns {Promise<IAssignmentDoc | null>}
 */
export const getAssignmentById = async (id: mongoose.Types.ObjectId): Promise<IAssignmentDoc | null> =>
  await Assignment.findById(id)
    .populate('students')
    .populate('teacherId')
    .populate('classId')
    .populate('createdBy')
    .populate('submissions.student');

/**
 * Get assignments by student id
 * @param {mongoose.Types.ObjectId} studentId
 * @returns {Promise<IAssignmentDoc[]>}
 */
export const getAssignmentsByStudentId = async (studentId: mongoose.Types.ObjectId): Promise<IAssignmentDoc[]> => {
  const assignments = await Assignment.find({ students: studentId })
    .populate('students')
    .populate('teacherId')
    .populate('classId')
    .populate('createdBy')
    .populate('submissions.student');
  return assignments;
};

/**
 * Get assignments by class id
 * @param {mongoose.Types.ObjectId} classId
 * @returns {Promise<IAssignmentDoc[]>}
 */
export const getAssignmentsByClassId = async (classId: mongoose.Types.ObjectId): Promise<IAssignmentDoc[]> => {
  const assignment = await Assignment.find({ classId })
    .populate('students')
    .populate('teacherId')
    .populate('classId')
    .populate('createdBy')
    .populate('submissions.student');

  return assignment;
};

/**
 * Get assignments by teacher id
 * @param {mongoose.Types.ObjectId} teacherId
 * @returns {Promise<IAssignmentDoc[]>}
 */
export const getAssignmentsByTeacherId = async (teacherId: mongoose.Types.ObjectId): Promise<IAssignmentDoc[]> =>
  await Assignment.find({ teacherId })
    .populate('students')
    .populate('teacherId')
    .populate('classId')
    .populate('createdBy')
    .populate('submissions.student');

/**
 * Update assignment by id
 * @param {mongoose.Types.ObjectId} assignmentId
 * @param {UpdateAssignmentBody} updateBody
 * @returns {Promise<IAssignmentDoc | null>}
 */
export const updateAssignmentById = async (
  assignmentId: mongoose.Types.ObjectId,
  updateBody: UpdateAssignmentBody
): Promise<IAssignmentDoc | null> => {
  const assignment = await getAssignmentById(assignmentId);
  if (!assignment) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Assignment not found');
  }

  // Validate students if they're being updated
  if (updateBody.students && updateBody.students.length > 0) {
    const students = await User.find({
      _id: { $in: updateBody.students },
      role: 'student',
    });

    if (students.length !== updateBody.students.length) {
      const existingStudentIds = students.map((student) => student._id.toString());
      const missingStudentIds = updateBody.students.filter((id) => !existingStudentIds.includes(id.toString()));
      throw new ApiError(httpStatus.NOT_FOUND, `Students not found or not valid students: ${missingStudentIds.join(', ')}`);
    }
  }

  // Validate teacherId if it's being updated
  if (updateBody.teacherId) {
    const teacher = await User.findById(updateBody.teacherId);
    if (!teacher) {
      throw new ApiError(httpStatus.NOT_FOUND, 'Teacher not found');
    }
    if (teacher.role !== 'teacher') {
      throw new ApiError(httpStatus.BAD_REQUEST, 'User must be a teacher');
    }
  }

  // Validate classId if it's being updated
  if (updateBody.classId) {
    const classDoc = await Classes.findById(updateBody.classId);
    if (!classDoc) {
      throw new ApiError(httpStatus.NOT_FOUND, 'Class not found');
    }
  }

  Object.assign(assignment, updateBody);
  await assignment.save();
  return assignment;
};

/**
 * Delete assignment by id
 * @param {mongoose.Types.ObjectId} assignmentId
 * @returns {Promise<IAssignmentDoc | null>}
 */
export const deleteAssignmentById = async (assignmentId: mongoose.Types.ObjectId): Promise<IAssignmentDoc | null> => {
  const assignment = await getAssignmentById(assignmentId);
  if (!assignment) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Assignment not found');
  }

  await assignment.deleteOne();
  return assignment;
};

/**
 * Submit assignment by student
 * @param {mongoose.Types.ObjectId} assignmentId
 * @param {mongoose.Types.ObjectId} studentId
 * @param {string} fileUrl
 * @returns {Promise<IAssignmentDoc | null>}
 */
export const submitAssignment = async (
  assignmentId: mongoose.Types.ObjectId,
  studentId: mongoose.Types.ObjectId,
  fileUrl: string
): Promise<IAssignmentDoc | null> => {
  const assignment = await getAssignmentById(assignmentId);
  if (!assignment) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Assignment not found');
  }

  // Check if assignment is for this student
  const isStudentInAssignment = assignment.students.some((student) => student._id.toString() === studentId.toString());
  if (!isStudentInAssignment) {
    throw new ApiError(httpStatus.FORBIDDEN, 'This assignment is not for you');
  }

  // Check if already submitted
  const existingSubmission = assignment.submissions.find(
    (submission) => submission.student.toString() === studentId.toString()
  );

  if (existingSubmission) {
    // Update existing submission
    existingSubmission.fileUrl = fileUrl;
    existingSubmission.submittedAt = new Date();
  } else {
    // Add new submission
    assignment.submissions.push({
      student: studentId,
      fileUrl,
      submittedAt: new Date(),
    });
  }

  // Update status to submitted if not already graded
  if (assignment.status === 'assigned') {
    assignment.status = 'submitted';
  }

  await assignment.save();
  return assignment;
};

/**
 * Grade assignment by teacher
 * @param {mongoose.Types.ObjectId} assignmentId
 * @param {mongoose.Types.ObjectId} studentId
 * @param {number} grade
 * @param {string} feedback
 * @returns {Promise<IAssignmentDoc | null>}
 */
export const gradeAssignment = async (
  assignmentId: mongoose.Types.ObjectId,
  studentId: mongoose.Types.ObjectId,
  grade: number,
  feedback?: string
): Promise<IAssignmentDoc | null> => {
  const assignment = await getAssignmentById(assignmentId);
  if (!assignment) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Assignment not found');
  }

  // Check if assignment is for this student
  const isStudentInAssignment = assignment.students.some((student) => student._id.toString() === studentId.toString());
  if (!isStudentInAssignment) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'This assignment is not for the specified student');
  }

  // Find the submission

  const submission = assignment.submissions.find((sub) => sub.student._id.toString() === studentId.toString());

  if (!submission) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'No submission found for this student');
  }

  // Update submission with grade and feedback
  submission.grade = grade;
  if (feedback) {
    submission.feedback = feedback;
  }

  // Update assignment status to graded
  assignment.status = 'graded';

  await assignment.save();
  return assignment;
};

/**
 * Update submission details
 * @param {mongoose.Types.ObjectId} assignmentId
 * @param {mongoose.Types.ObjectId} studentId
 * @param {UpdateSubmissionBody} updateBody
 * @returns {Promise<IAssignmentDoc | null>}
 */
export const updateSubmission = async (
  assignmentId: mongoose.Types.ObjectId,
  studentId: mongoose.Types.ObjectId,
  updateBody: UpdateSubmissionBody
): Promise<IAssignmentDoc | null> => {
  const assignment = await getAssignmentById(assignmentId);
  if (!assignment) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Assignment not found');
  }

  // Find the submission
  const submission = assignment.submissions.find((sub) => sub.student._id.toString() === studentId.toString());

  if (!submission) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'No submission found for this student');
  }

  // Update submission fields
  if (updateBody.fileUrl !== undefined) {
    submission.fileUrl = updateBody.fileUrl;
  }
  if (updateBody.grade !== undefined) {
    submission.grade = updateBody.grade;
  }
  if (updateBody.feedback !== undefined) {
    submission.feedback = updateBody.feedback;
  }

  await assignment.save();
  return assignment;
};

/**
 * Get all assignments with populated references
 * @returns {Promise<IAssignmentDoc[]>}
 */
export const getAllAssignments = async (): Promise<IAssignmentDoc[]> => {
  return await Assignment.find()
    .populate('students')
    .populate('teacherId')
    .populate('classId')
    .populate('createdBy')
    .populate('submissions.student');
};

/**
 * Get assignments due soon (within specified days)
 * @param {number} days - Number of days to check
 * @returns {Promise<IAssignmentDoc[]>}
 */
export const getAssignmentsDueSoon = async (days: number = 7): Promise<IAssignmentDoc[]> => {
  const futureDate = new Date();
  futureDate.setDate(futureDate.getDate() + days);

  return await Assignment.find({
    dueDate: { $lte: futureDate, $gte: new Date() },
    status: { $in: ['assigned', 'submitted'] },
  })
    .populate('students')
    .populate('teacherId')
    .populate('classId')
    .populate('createdBy')
    .populate('submissions.student');
};

/**
 * Get overdue assignments
 * @returns {Promise<IAssignmentDoc[]>}
 */
export const getOverdueAssignments = async (): Promise<IAssignmentDoc[]> => {
  return await Assignment.find({
    dueDate: { $lt: new Date() },
    status: { $in: ['assigned', 'submitted'] },
  })
    .populate('students')
    .populate('teacherId')
    .populate('classId')
    .populate('createdBy')
    .populate('submissions.student');
};

/**
 * Get assignments by class id and student id
 * @param {mongoose.Types.ObjectId} classId
 * @param {mongoose.Types.ObjectId} studentId
 * @returns {Promise<IAssignmentDoc[]>}
 */
export const getAssignmentsByClassAndStudent = async (
  classId: mongoose.Types.ObjectId,
  studentId: mongoose.Types.ObjectId
): Promise<IAssignmentDoc[]> => {
  return await Assignment.find({ classId, studentId })
    .populate('students')
    .populate('teacherId')
    .populate('classId')
    .populate('createdBy')
    .populate('submissions.student');
};
