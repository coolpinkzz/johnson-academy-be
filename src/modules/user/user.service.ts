import httpStatus from 'http-status';
import mongoose from 'mongoose';
import User from './user.model';
import Classes from '../classes/classes.model';
import Course from '../course/course.model';
import { resolveClassTeacherIds } from '../classes/classes.util';
import ApiError from '../errors/ApiError';
import { IOptions, QueryResult } from '../paginate/paginate';
import { NewCreatedUser, UpdateUserBody, IUserDoc, NewRegisteredUser, IGuardian } from './user.interfaces';
import { buildBranchRollNumberFilter, buildRollNumberSearchFilter, buildBranchAccessRollNumberOr } from './rollNumber.util';
import {
  isStudentProfileComplete,
  parseGuardians,
  profileCardStillValid,
  requiresParentDetails,
} from './studentProfile';
import uploadService from '../upload/upload.service';
import StudentPackage from '../studentFee/studentPackage.model';
import StudentProgress from '../studentProgress/studentProgress.model';
import StudentAttendance from '../studentAttendance/studentAttendance.model';
import MRT from '../mrt/mrt.model';
import Token from '../token/token.model';

type AdmissionInput = {
  role: string;
  dateOfJoining?: Date;
  enrollmentDate?: Date;
  referralSource?: string;
  referralSourceOther?: string;
};

/** Keep enrollmentDate aligned with date of joining, and drop unused "other" text. */
const normalizeAdmission = <T extends AdmissionInput>(userBody: T): T => {
  const payload: T = { ...userBody };
  if (payload.role === 'student' && payload.dateOfJoining && payload.enrollmentDate == null) {
    payload.enrollmentDate = payload.dateOfJoining;
  }
  if (payload.referralSource !== 'other') {
    delete payload.referralSourceOther;
  }
  return payload;
};

/**
 * Create a user
 * @param {NewCreatedUser} userBody
 * @returns {Promise<IUserDoc>}
 */
export const createUser = async (userBody: NewCreatedUser): Promise<IUserDoc> => {
  if (await User.isEmailTaken(userBody.email)) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Email already taken');
  }

  if (userBody.role === 'student' && userBody.rollNumber) {
    if (await User.isRollNumberTaken(userBody.rollNumber)) {
      throw new ApiError(httpStatus.BAD_REQUEST, 'Roll number already taken');
    }
  }

  // branchAccess only applies to admin/aqsd
  const payload = normalizeAdmission({ ...userBody });
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

  if (userBody.role === 'student' && userBody.rollNumber) {
    if (await User.isRollNumberTaken(userBody.rollNumber)) {
      throw new ApiError(httpStatus.BAD_REQUEST, 'Roll number already taken');
    }
  }

  // For registration, set isActive to true
  const userData = normalizeAdmission({
    ...userBody,
    isActive: true,
  });

  return User.create(userData);
};

type EnrollableUser = {
  _id: mongoose.Types.ObjectId;
  toJSON?: () => Record<string, unknown>;
};

/**
 * Classes a student is actually enrolled in, including the courses they opted for.
 * Read from the class documents so the list stays correct even if the user record is stale.
 */
const attachEnrolledClasses = async (students: EnrollableUser[]): Promise<Record<string, unknown>[]> => {
  if (students.length === 0) return [];

  const studentIds = students.map((student) => student._id);
  const studentIdSet = new Set(studentIds.map((id) => id.toString()));

  const classes = (await Classes.find({
    $or: [{ students: { $in: studentIds } }, { 'studentsInClass.user': { $in: studentIds } }],
  })
    .select('name branch academicYear status defaultWeekdays defaultStartTime defaultEndTime students studentsInClass teachers')
    .populate({ path: 'teachers', select: 'name' })
    .lean()) as Array<{
    _id: mongoose.Types.ObjectId;
    name: string;
    branch?: string;
    academicYear?: string;
    status?: string;
    defaultWeekdays?: string[];
    defaultStartTime?: string;
    defaultEndTime?: string;
    students?: mongoose.Types.ObjectId[];
    studentsInClass?: Array<{ user?: mongoose.Types.ObjectId; course?: mongoose.Types.ObjectId }>;
    teachers?: Array<{ _id?: mongoose.Types.ObjectId; name?: string } | mongoose.Types.ObjectId>;
  }>;

  const courseIds = new Set<string>();
  classes.forEach((cls) => {
    (cls.studentsInClass ?? []).forEach((entry) => {
      const userId = entry.user?.toString();
      if (userId && studentIdSet.has(userId) && entry.course) {
        courseIds.add(entry.course.toString());
      }
    });
  });

  const courses =
    courseIds.size > 0
      ? await Course.find({ _id: { $in: [...courseIds] } })
          .select('name instrument')
          .lean()
      : [];
  const courseById = new Map(courses.map((course) => [course._id.toString(), course]));

  const byStudent = new Map<string, Record<string, unknown>[]>();
  classes.forEach((cls) => {
    const memberIds = new Set<string>();
    (cls.students ?? []).forEach((studentId) => memberIds.add(studentId.toString()));
    (cls.studentsInClass ?? []).forEach((entry) => {
      if (entry.user) memberIds.add(entry.user.toString());
    });

    memberIds.forEach((studentId) => {
      if (!studentIdSet.has(studentId)) return;

      const seenCourses = new Set<string>();
      const optedCourses = (cls.studentsInClass ?? []).flatMap((entry) => {
        if (entry.user?.toString() !== studentId || !entry.course) return [];
        const courseId = entry.course.toString();
        if (seenCourses.has(courseId)) return [];
        seenCourses.add(courseId);
        const course = courseById.get(courseId);
        return [
          {
            id: courseId,
            ...(course?.name ? { name: course.name } : {}),
            ...(course?.instrument ? { instrument: course.instrument } : {}),
          },
        ];
      });

      const teachers = (cls.teachers ?? []).flatMap((teacher) => {
        if (!teacher || typeof teacher !== 'object' || !('name' in teacher) || !teacher.name || !teacher._id) {
          return [];
        }
        return [{ id: teacher._id.toString(), name: String(teacher.name) }];
      });

      const summary: Record<string, unknown> = {
        id: cls._id.toString(),
        name: cls.name,
        courses: optedCourses,
        ...(cls.branch ? { branch: cls.branch } : {}),
        ...(cls.academicYear ? { academicYear: cls.academicYear } : {}),
        ...(cls.status ? { status: cls.status } : {}),
        ...(cls.defaultWeekdays?.length ? { defaultWeekdays: cls.defaultWeekdays } : {}),
        ...(cls.defaultStartTime ? { defaultStartTime: cls.defaultStartTime } : {}),
        ...(cls.defaultEndTime ? { defaultEndTime: cls.defaultEndTime } : {}),
        ...(teachers.length > 0 ? { teachers } : {}),
      };

      const bucket = byStudent.get(studentId) ?? [];
      bucket.push(summary);
      byStudent.set(studentId, bucket);
    });
  });

  return students.map((student) => {
    const userObj = student.toJSON ? student.toJSON() : { id: student._id.toString() };
    const enrolled = byStudent.get(student._id.toString()) ?? [];
    enrolled.sort((a, b) => String(a['name']).localeCompare(String(b['name'])));
    return { ...userObj, enrolledClasses: enrolled };
  });
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

  if (transformedFilter['role'] === 'student' && users.results.length > 0) {
    users.results = (await attachEnrolledClasses(
      users.results as unknown as EnrollableUser[]
    )) as unknown as typeof users.results;
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

  if (updateBody.emergencyContact) {
    const current = user.emergencyContact;
    updateBody.emergencyContact = {
      name: updateBody.emergencyContact.name ?? current?.name ?? '',
      relationship: updateBody.emergencyContact.relationship ?? current?.relationship ?? '',
      phone: updateBody.emergencyContact.phone ?? current?.phone ?? '',
      email: updateBody.emergencyContact.email ?? current?.email ?? '',
    };
  }

  Object.assign(user, updateBody);
  if (updateBody.dateOfJoining) {
    user.enrollmentDate = updateBody.dateOfJoining;
  }
  if (updateBody.referralSource && updateBody.referralSource !== 'other') {
    user.referralSourceOther = '';
  }
  if (user.role === 'student') {
    user.isCompleteProfile = isStudentProfileComplete(user);
    if (user.isProfileCardComplete && !profileCardStillValid(user)) {
      user.isProfileCardComplete = false;
    }
  }
  if (!['admin', 'aqsd'].includes(nextRole)) {
    user.set('branchAccess', undefined);
  }
  await user.save();
  return user;
};

/**
 * Upload an image and set it as the user's profile picture
 * @param {mongoose.Types.ObjectId} userId
 * @param {Express.Multer.File} file
 * @returns {Promise<IUserDoc>}
 */
export const updateProfilePictureById = async (
  userId: mongoose.Types.ObjectId,
  file: Express.Multer.File
): Promise<IUserDoc> => {
  const user = await getUserById(userId);
  if (!user) {
    throw new ApiError(httpStatus.NOT_FOUND, 'User not found');
  }

  const uploadResult = await uploadService.uploadFile({
    file,
    folder: 'johnson-academy/profile-pictures',
    tags: ['profile', userId.toString()],
    useUniqueFileName: true,
    imageOnly: true,
  });

  try {
    user.profilePicture = uploadResult.url;
    if (user.role === 'student' && user.isProfileCardComplete && !profileCardStillValid(user)) {
      user.isProfileCardComplete = false;
    }
    await user.save();
    return user;
  } catch (error) {
    await uploadService.deleteFile(uploadResult.fileId).catch(() => undefined);
    throw error;
  }
};

export type ProfileCardInput = {
  motherName?: string;
  fatherName?: string;
  guardians?: { name?: string | null; relation?: string | null }[];
};

/**
 * Save the post-admission profile card. A picture must already be on the profile.
 * Mother and father are required only when the student is 15 or younger.
 */
export const completeStudentProfileCard = async (
  userId: mongoose.Types.ObjectId,
  input: ProfileCardInput
): Promise<IUserDoc> => {
  const user = await getUserById(userId);
  if (!user) {
    throw new ApiError(httpStatus.NOT_FOUND, 'User not found');
  }
  if (user.role !== 'student') {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Profile card is only for students');
  }
  if (!isStudentProfileComplete(user)) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Submit admission details before updating the profile card');
  }
  if (!user.profilePicture?.trim()) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Profile picture is required');
  }

  if (requiresParentDetails(user.dateOfBirth)) {
    const motherName = input.motherName?.trim() ?? '';
    const fatherName = input.fatherName?.trim() ?? '';
    if (!motherName) {
      throw new ApiError(httpStatus.BAD_REQUEST, "Mother's name is required");
    }
    if (!fatherName) {
      throw new ApiError(httpStatus.BAD_REQUEST, "Father's name is required");
    }
    if (motherName.length > 120 || fatherName.length > 120) {
      throw new ApiError(httpStatus.BAD_REQUEST, 'Parent name is too long');
    }

    const parsed = parseGuardians(input.guardians);
    if (!parsed.ok) {
      throw new ApiError(httpStatus.BAD_REQUEST, parsed.message);
    }

    user.motherName = motherName;
    user.fatherName = fatherName;
    user.guardians = parsed.guardians as IGuardian[];
  }

  user.isProfileCardComplete = true;
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

  // Fee history must outlive the account; such students are deactivated instead
  if (await StudentPackage.exists({ studentId: userId })) {
    throw new ApiError(
      httpStatus.CONFLICT,
      'This student has fee records and cannot be deleted. Deactivate the student instead.'
    );
  }

  // One session cannot run operations concurrently. Parallel writes abort the
  // transaction and surface as NoSuchTransaction (code 251).
  const session = await mongoose.startSession();

  try {
    await session.withTransaction(async () => {
      const studentProgress = await StudentProgress.deleteMany({ studentId: userId }, { session });
      const studentAttendance = await StudentAttendance.deleteMany({ studentId: userId }, { session });
      const mrt = await MRT.deleteMany({ studentId: userId }, { session });
      const tokens = await Token.deleteMany({ user: userId }, { session });
      const classesUpdated = await Classes.updateMany(
        { students: userId },
        { $pull: { students: userId } },
        { session }
      );
      const teacherClassesPulledFrom = await Classes.updateMany(
        { teachers: userId },
        { $pull: { teachers: userId } },
        { session }
      );
      const teacherLegacyFieldUnset = await Classes.updateMany(
        { teacherId: userId },
        { $unset: { teacherId: 1 } },
        { session }
      );

      await user.deleteOne({ session });

      console.log(`Cascade deletion results for user ${userId}:`, {
        studentProgress: studentProgress.deletedCount,
        studentAttendance: studentAttendance.deletedCount,
        mrt: mrt.deletedCount,
        tokens: tokens.deletedCount,
        classesUpdated: classesUpdated.modifiedCount,
        teacherClassesPulledFrom: teacherClassesPulledFrom.modifiedCount,
        teacherLegacyFieldUnset: teacherLegacyFieldUnset.modifiedCount,
      });
    });

    return user;
  } catch (error) {
    console.error(`Error during cascade deletion for user ${userId}:`, error);
    if (error instanceof ApiError) {
      throw error;
    }
    throw new ApiError(httpStatus.INTERNAL_SERVER_ERROR, 'Failed to delete user and related records');
  } finally {
    await session.endSession();
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
export const getUserByStudentId = async (
  studentId: string
): Promise<{ rollNumber?: string | null } | null> => {
  const user = await User.findOne({ _id: studentId, isActive: true })
    .populate('classes')
    .populate('courses')
    .populate('progress');
  if (!user) return null;
  const [withClasses] = await attachEnrolledClasses([user]);
  return (withClasses ?? null) as { rollNumber?: string | null } | null;
};

/**
 * Get user by teacher ID
 * @param {string} teacherId
 * @returns {Promise<IUserDoc | null>}
 */
export const getUserByTeacherId = async (teacherId: string): Promise<IUserDoc | null> => {
  return User.findOne({ _id: teacherId, role: 'teacher', isActive: true });
};
