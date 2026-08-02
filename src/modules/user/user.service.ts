import httpStatus from 'http-status';
import mongoose from 'mongoose';
import User from './user.model';
import Classes from '../classes/classes.model';
import { resolveClassTeacherIds } from '../classes/classes.util';
import ApiError from '../errors/ApiError';
import { IOptions, QueryResult } from '../paginate/paginate';
import { NewCreatedUser, UpdateUserBody, IUserDoc, NewRegisteredUser } from './user.interfaces';
import { buildBranchRollNumberFilter, buildRollNumberSearchFilter, buildBranchAccessRollNumberOr } from './rollNumber.util';

/**
 * Create a user
 * @param {NewCreatedUser} userBody
 * @returns {Promise<IUserDoc>}
 */
export const createUser = async (userBody: NewCreatedUser): Promise<IUserDoc> => {
  if (await User.isEmailTaken(userBody.email)) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Email already taken');
  }

  // Validate role-specific fields
  if (userBody.role === 'student' && userBody.studentId) {
    if (await User.isStudentIdTaken(userBody.studentId)) {
      throw new ApiError(httpStatus.BAD_REQUEST, 'Student ID already taken');
    }
  }

  if (userBody.role === 'teacher' && userBody.teacherId) {
    if (await User.isTeacherIdTaken(userBody.teacherId)) {
      throw new ApiError(httpStatus.BAD_REQUEST, 'Teacher ID already taken');
    }
  }

  if (userBody.role === 'student' && userBody.rollNumber) {
    if (await User.isRollNumberTaken(userBody.rollNumber)) {
      throw new ApiError(httpStatus.BAD_REQUEST, 'Roll number already taken');
    }
  }

  // branchAccess only applies to admin/aqsd
  const payload = { ...userBody };
  if (!['admin', 'aqsd'].includes(payload.role)) {
    delete payload.branchAccess;
  }

  return User.create(payload);
};

/**
 * Register a user
 * @param {NewRegisteredUser} userBody
 * @returns {Promise<IUserDoc>}
 */
export const registerUser = async (userBody: NewRegisteredUser): Promise<IUserDoc> => {
  if (await User.isEmailTaken(userBody.email)) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Email already taken');
  }

  // Validate role-specific fields
  if (userBody.role === 'student' && userBody.studentId) {
    if (await User.isStudentIdTaken(userBody.studentId)) {
      throw new ApiError(httpStatus.BAD_REQUEST, 'Student ID already taken');
    }
  }

  if (userBody.role === 'teacher' && userBody.teacherId) {
    if (await User.isTeacherIdTaken(userBody.teacherId)) {
      throw new ApiError(httpStatus.BAD_REQUEST, 'Teacher ID already taken');
    }
  }

  if (userBody.role === 'student' && userBody.rollNumber) {
    if (await User.isRollNumberTaken(userBody.rollNumber)) {
      throw new ApiError(httpStatus.BAD_REQUEST, 'Roll number already taken');
    }
  }

  // For registration, set isActive to true
  const userData = {
    ...userBody,
    isActive: true,
  };

  return User.create(userData);
};

/**
 * Query for users
 * @param {Object} filter - Mongo filter
 * @param {Object} options - Query options
 * @returns {Promise<QueryResult>}
 */
export const queryUsers = async (filter: Record<string, any>, options: IOptions): Promise<QueryResult> => {
  // Transform the filter to handle partial name matching
  const transformedFilter = { ...filter };
  const branch = transformedFilter['branch'];
  const branchIn = transformedFilter['branchIn'] as string[] | undefined;
  delete transformedFilter['branch'];
  delete transformedFilter['branchIn'];

  if (transformedFilter['name']) {
    // Convert name filter to case-insensitive regex for partial matching
    transformedFilter['name'] = { $regex: transformedFilter['name'], $options: 'i' };
  }

  const rollNumberFilters: Array<{ $regex: string; $options: string }> = [];
  const andClauses: Record<string, unknown>[] = Array.isArray(transformedFilter['$and'])
    ? [...transformedFilter['$and']]
    : [];

  if (transformedFilter['rollNumber']) {
    rollNumberFilters.push(buildRollNumberSearchFilter(String(transformedFilter['rollNumber'])));
    delete transformedFilter['rollNumber'];
  }

  if (branch != null && branch !== '') {
    const branchFilter = buildBranchRollNumberFilter(String(branch));
    if (branchFilter) {
      rollNumberFilters.push(branchFilter);
    }
  }

  if (Array.isArray(branchIn)) {
    if (branchIn.length === 0) {
      // No accessible branches → empty result set
      transformedFilter['_id'] = { $in: [] };
    } else {
      const branchOr = buildBranchAccessRollNumberOr(branchIn);
      if (branchOr.length === 0) {
        transformedFilter['_id'] = { $in: [] };
      } else if (branchOr.length === 1 && branchOr[0]) {
        rollNumberFilters.push(branchOr[0].rollNumber);
      } else {
        andClauses.push({ $or: branchOr });
      }
    }
  }

  if (rollNumberFilters.length === 1) {
    transformedFilter['rollNumber'] = rollNumberFilters[0];
  } else if (rollNumberFilters.length > 1) {
    andClauses.push(...rollNumberFilters.map((rollNumber) => ({ rollNumber })));
  }

  if (andClauses.length > 0) {
    transformedFilter['$and'] = andClauses;
  }

  // If filtering by teacher role, populate courses
  const queryOptions = { ...options };
  if (transformedFilter['role'] === 'teacher' && !queryOptions.populate) {
    queryOptions.populate = 'courses';
  }

  const users = await User.paginate(transformedFilter, queryOptions);

  // If filtering by teacher role, populate classes from Classes model (teachers[] or legacy teacherId)
  if (transformedFilter['role'] === 'teacher' && users.results.length > 0) {
    const teacherIds = users.results.map((user) => user._id);

    const allClasses = await Classes.find({
      $or: [{ teachers: { $in: teacherIds } }, { teacherId: { $in: teacherIds } }],
    })
      .populate('courseId')
      .populate('students');

    const classesByTeacher = allClasses.reduce((acc: Record<string, unknown[]>, cls: any) => {
      for (const tId of resolveClassTeacherIds(cls)) {
        const bucket = acc[tId] ?? (acc[tId] = []);
        bucket.push(cls);
      }
      return acc;
    }, {});

    users.results = users.results.map((user: any) => {
      const userObj = user.toObject ? user.toObject() : user;
      const key = userObj._id.toString();
      userObj.classes = classesByTeacher[key] || [];
      return userObj;
    });
  }

  return users;
};

/**
 * Get user by id
 * @param {mongoose.Types.ObjectId} id
 * @returns {Promise<IUserDoc | null>}
 */
export const getUserById = async (id: mongoose.Types.ObjectId): Promise<IUserDoc | null> => User.findById(id);

/**
 * Get user by email
 * @param {string} email
 * @returns {Promise<IUserDoc | null>}
 */
export const getUserByEmail = async (email: string): Promise<IUserDoc | null> => User.findOne({ email });

/**
 * Update user by id
 * @param {mongoose.Types.ObjectId} userId
 * @param {UpdateUserBody} updateBody
 * @returns {Promise<IUserDoc | null>}
 */
export const updateUserById = async (
  userId: mongoose.Types.ObjectId,
  updateBody: UpdateUserBody
): Promise<IUserDoc | null> => {
  const user = await getUserById(userId);
  if (!user) {
    throw new ApiError(httpStatus.NOT_FOUND, 'User not found');
  }
  if (updateBody.email && (await User.isEmailTaken(updateBody.email, userId))) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Email already taken');
  }

  // Validate role-specific fields
  if (updateBody.studentId && (await User.isStudentIdTaken(updateBody.studentId, userId))) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Student ID already taken');
  }

  if (updateBody.teacherId && (await User.isTeacherIdTaken(updateBody.teacherId, userId))) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Teacher ID already taken');
  }

  if (updateBody.rollNumber && (await User.isRollNumberTaken(updateBody.rollNumber, userId))) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Roll number already taken');
  }

  const nextRole = updateBody.role ?? user.role;
  if (!['admin', 'aqsd'].includes(nextRole)) {
    delete updateBody.branchAccess;
  } else if (updateBody.branchAccess !== undefined) {
    if (!Array.isArray(updateBody.branchAccess) || updateBody.branchAccess.length === 0) {
      throw new ApiError(httpStatus.BAD_REQUEST, 'branchAccess is required for admin and aqsd users');
    }
  } else if (['admin', 'aqsd'].includes(nextRole) && (!user.branchAccess || user.branchAccess.length === 0)) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'branchAccess is required for admin and aqsd users');
  }

  Object.assign(user, updateBody);
  if (!['admin', 'aqsd'].includes(nextRole)) {
    user.set('branchAccess', undefined);
  }
  await user.save();
  return user;
};

/**
 * Delete user by id with cascade deletion
 * This function will delete all related records in other collections that reference this user
 * @param {mongoose.Types.ObjectId} userId
 * @returns {Promise<IUserDoc | null>}
 */
export const deleteUserById = async (userId: mongoose.Types.ObjectId): Promise<IUserDoc | null> => {
  const user = await getUserById(userId);
  if (!user) {
    throw new ApiError(httpStatus.NOT_FOUND, 'User not found');
  }

  // Start a transaction to ensure all deletions succeed or fail together
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    // Import required models
    const StudentProgress = mongoose.model('StudentProgress');
    const StudentAttendance = mongoose.model('StudentAttendance');
    const MRT = mongoose.model('MRT');
    const Token = mongoose.model('Token');
    const Classes = mongoose.model('Classes');

    // Delete all related records in parallel for better performance
    const deletionResults = await Promise.all([
      // Delete student progress records
      StudentProgress.deleteMany({ studentId: userId }, { session }),

      // Delete student attendance records
      StudentAttendance.deleteMany({ studentId: userId }, { session }),

      // Delete MRT records
      MRT.deleteMany({ studentId: userId }, { session }),

      // Delete token records
      Token.deleteMany({ user: userId }, { session }),

      // Remove user from classes where they are a student
      Classes.updateMany({ students: userId }, { $pull: { students: userId } }, { session }),

      // Remove user from classes where they are a teacher (array + legacy field)
      Classes.updateMany({ teachers: userId }, { $pull: { teachers: userId } }, { session }),
      Classes.updateMany({ teacherId: userId }, { $unset: { teacherId: 1 } }, { session }),
    ]);

    // Log deletion results for debugging
    console.log(`Cascade deletion results for user ${userId}:`, {
      studentProgress: deletionResults[0].deletedCount,
      studentAttendance: deletionResults[1].deletedCount,
      mrt: deletionResults[2].deletedCount,
      tokens: deletionResults[3].deletedCount,
      classesUpdated: deletionResults[4].modifiedCount,
      teacherClassesPulledFrom: deletionResults[5].modifiedCount,
      teacherLegacyFieldUnset: deletionResults[6].modifiedCount,
    });

    // Finally delete the user
    await user.deleteOne({ session });

    // Commit the transaction
    await session.commitTransaction();

    return user;
  } catch (error) {
    // If any error occurs, rollback the transaction
    await session.abortTransaction();
    console.error(`Error during cascade deletion for user ${userId}:`, error);
    throw new ApiError(httpStatus.INTERNAL_SERVER_ERROR, 'Failed to delete user and related records');
  } finally {
    // End the session
    session.endSession();
  }
};

/**
 * Get users by role
 * @param {string} role
 * @returns {Promise<IUserDoc[]>}
 */
export const getUsersByRole = async (role: string): Promise<IUserDoc[]> => {
  return User.find({ role, isActive: true }).sort({ createdAt: -1 });
};

/**
 * Get students by grade level
 * @param {string} gradeLevel
 * @returns {Promise<IUserDoc[]>}
 */
export const getStudentsByGradeLevel = async (gradeLevel: string): Promise<IUserDoc[]> => {
  return User.find({ role: 'student', gradeLevel, isActive: true }).sort({ createdAt: -1 });
};

/**
 * Get teachers by department
 * @param {string} department
 * @returns {Promise<IUserDoc[]>}
 */
export const getTeachersByDepartment = async (department: string): Promise<IUserDoc[]> => {
  return User.find({ role: 'teacher', department, isActive: true }).sort({ createdAt: -1 });
};

/**
 * Get user by student ID
 * @param {string} studentId
 * @returns {Promise<IUserDoc | null>}
 */
export const getUserByStudentId = async (studentId: string): Promise<IUserDoc | null> => {
  return User.findOne({ _id: studentId, isActive: true }).populate('classes').populate('courses').populate('progress');
};

/**
 * Get user by teacher ID
 * @param {string} teacherId
 * @returns {Promise<IUserDoc | null>}
 */
export const getUserByTeacherId = async (teacherId: string): Promise<IUserDoc | null> => {
  return User.findOne({ teacherId, isActive: true });
};
