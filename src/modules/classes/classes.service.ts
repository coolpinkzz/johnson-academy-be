import httpStatus from 'http-status';
import mongoose from 'mongoose';
import Classes from './classes.model';
import User from '../user/user.model';
import Course from '../course/course.model';
import { findNextLevelCourse } from '../course/course.service';
import StudentProgress from '../studentProgress/studentProgress.model';
import StudentAttendance from '../studentAttendance/studentAttendance.model';
import ApiError from '../errors/ApiError';
import {
  createStudentPromotion,
  getPromotionByStudentClassAndCourse,
  getPromotionsByStudentAndClass,
} from '../studentPromotion/studentPromotion.service';
import { IStudentProgressDoc } from '../studentProgress/studentProgress.interfaces';
import { IOptions, QueryResult } from '../paginate/paginate';
import { NewCreatedClasses, UpdateClassesBody, IClassesDoc } from './classes.interfaces';
import { filterClassesByTeacher } from './classes.util';

const getObjectId = (val: mongoose.Types.ObjectId | { _id?: mongoose.Types.ObjectId } | null | undefined) => {
  if (!val) return null;
  if (typeof val === 'object' && '_id' in val && val._id) return val._id;
  return val as mongoose.Types.ObjectId;
};

/**
 * Create a class
 * @param {NewCreatedClasses} classesBody
 * @returns {Promise<IClassesDoc>}
 */
export const createClasses = async (classesBody: NewCreatedClasses): Promise<IClassesDoc> => {
  const body = classesBody as NewCreatedClasses & { teacherId?: mongoose.Types.ObjectId };
  let teacherIds: mongoose.Types.ObjectId[] = [];
  if (body.teachers && body.teachers.length > 0) {
    teacherIds = [...body.teachers];
  } else if (body.teacherId) {
    teacherIds = [body.teacherId];
  }
  const seen = new Set<string>();
  teacherIds = teacherIds.filter((id) => {
    const k = id.toString();
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });

  if (teacherIds.length === 0) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'At least one teacher is required');
  }

  for (const tid of teacherIds) {
    const teacher = await User.findById(tid);
    if (!teacher) {
      throw new ApiError(httpStatus.NOT_FOUND, 'Teacher not found');
    }
    if (teacher.role !== 'teacher') {
      throw new ApiError(httpStatus.BAD_REQUEST, 'User must be a teacher to be assigned to a class');
    }
  }

  const { teacherId: _omit, teachers: _omitT, ...rest } = body;
  const createdClass = await Classes.create({
    ...rest,
    teachers: teacherIds,
  });

  // Validate that all students exist and are students
  // if (classesBody.students && classesBody.students.length > 0) {
  //   const students = await User.find({
  //     _id: { $in: classesBody.students },
  //     role: 'student',
  //   });

  //   if (students.length !== classesBody.students.length) {
  //     const existingStudentIds = students.map((student) => student._id.toString());
  //     const missingStudentIds = classesBody.students.filter((id) => !existingStudentIds.includes(id.toString()));
  //     throw new ApiError(httpStatus.NOT_FOUND, `Students not found or not valid students: ${missingStudentIds.join(', ')}`);
  //   }
  // }

  // Create progress records and attendance records for all students added to the class and update user model
  if (createdClass.students && createdClass.students.length > 0) {
    const progressPromises = createdClass.students.map(async (studentId) => {
      // Create progress record
      const progress = await StudentProgress.createProgressForStudent(studentId, createdClass._id, createdClass.courseId);

      // Create attendance record with current date as joining date
      const attendance = await StudentAttendance.create({
        studentId,
        classId: createdClass._id,
        joiningDate: new Date(),
      });

      // Update user model to include the class, course, and progress references
      await User.findByIdAndUpdate(studentId, {
        $addToSet: {
          classes: createdClass._id,
          courses: createdClass.courseId,
          progress: progress._id,
        },
      });

      return { progress, attendance };
    });

    try {
      await Promise.all(progressPromises);
    } catch (error) {
      // Log the error but don't fail the class creation
      console.error('Failed to create progress records, attendance records, or update user model for some students:', error);
    }
  }

  return createdClass;
};

/**
 * Query for classes
 * @param {Object} filter - Mongo filter
 * @param {Object} options - Query options
 * @returns {Promise<QueryResult>}
 */
export const queryClasses = async (filter: Record<string, any>, options: IOptions): Promise<QueryResult> => {
  const mongoFilter: Record<string, any> = { ...filter };
  const teacherQueryId = mongoFilter['teacherId'] as string | undefined;
  const teachersQueryId = mongoFilter['teachers'] as string | undefined;
  if (teacherQueryId) {
    delete mongoFilter['teacherId'];
    Object.assign(mongoFilter, filterClassesByTeacher(new mongoose.Types.ObjectId(teacherQueryId)));
  } else if (teachersQueryId) {
    delete mongoFilter['teachers'];
    Object.assign(mongoFilter, filterClassesByTeacher(new mongoose.Types.ObjectId(teachersQueryId)));
  }

  // Ensure course/students and nested studentsInClass refs are populated (like getClassesByTeacherId)
  const requiredPopulate = ['courseId', 'students', 'studentsInClass.user', 'studentsInClass.course'];
  const existingPopulate = (options.populate || '')
    .split(',')
    .map((p) => p.trim())
    .filter(Boolean);

  const populateSet = new Set(existingPopulate);
  requiredPopulate.forEach((p) => populateSet.add(p));
  options.populate = Array.from(populateSet).join(',');

  // Set default sort to latest to oldest if no sort is specified
  if (!options.sortBy) {
    options.sortBy = 'createdAt:desc';
  }

  const classes = await Classes.paginate(mongoFilter, options);

  await Classes.populate(classes.results, {
    path: 'teachers',
  });
  // Ensure nested population for studentsInClass (user & course), mirroring getClassesByTeacherId
  await Classes.populate(classes.results, {
    path: 'studentsInClass',
    populate: [{ path: 'user' }, { path: 'course' }],
  });

  return classes;
};

/**
 * Get class by id
 * @param {mongoose.Types.ObjectId} id
 * @returns {Promise<IClassesDoc | null>}
 */
export const getClassesById = async (id: mongoose.Types.ObjectId): Promise<IClassesDoc | null> =>
  Classes.findById(id).populate('teachers').populate('courseId').populate('students');

/**
 * Get classes by teacher id
 * @param {mongoose.Types.ObjectId} teacherId
 * @returns {Promise<IClassesDoc[]>}
 */
export const getClassesByTeacherId = async (teacherId: mongoose.Types.ObjectId): Promise<IClassesDoc[]> =>
  Classes.find(filterClassesByTeacher(teacherId))
    .populate('teachers')
    .populate('courseId')
    .populate('students')
    .populate({
      path: 'studentsInClass',
      populate: [{ path: 'user' }, { path: 'course' }],
    });

/**
 * Get classes by course id
 * @param {mongoose.Types.ObjectId} courseId
 * @returns {Promise<IClassesDoc[]>}
 */
export const getClassesByCourseId = async (courseId: mongoose.Types.ObjectId): Promise<IClassesDoc[]> =>
  Classes.find({ courseId }).populate('teachers').populate('courseId').populate('students');

/**
 * Get classes by student id
 * @param {mongoose.Types.ObjectId} studentId
 * @returns {Promise<IClassesDoc[]>}
 */
export const getClassesByStudentId = async (studentId: mongoose.Types.ObjectId): Promise<any[]> => {
  const classes = await Classes.find({ students: studentId })
    .populate('teachers')
    .populate({
      path: 'students',
      match: { _id: studentId },
    });

  // Collect all course IDs from studentsInClass for this student
  const courseIds = [
    ...new Set(
      classes.flatMap((cls) =>
        (cls.studentsInClass ?? [])
          .filter((s) => s.user?.toString() === studentId.toString())
          .map((s) => s.course)
          .filter(Boolean)
      )
    ),
  ] as mongoose.Types.ObjectId[];

  // Batch fetch courses for studentsInClass
  const courses = courseIds.length > 0 ? await Course.find({ _id: { $in: courseIds } }).lean() : [];
  const courseMap = new Map(courses.map((c: any) => [c._id.toString(), c]));

  // Transform the result: expose all courses for the student in each class
  return classes.map((cls) => {
    const transformedClass = cls.toObject({
      virtuals: true,
      versionKey: false,
    }) as any;

    const studentEntries = (cls.studentsInClass ?? []).filter(
      (s) => s.user?.toString() === studentId.toString()
    );

    const studentCourses = studentEntries
      .map((entry) => {
        const courseRef = entry.course;
        const courseIdStr = courseRef?.toString?.() ?? String(courseRef);
        return courseMap.get(courseIdStr) ?? courseRef;
      })
      .filter(Boolean);

    transformedClass.courses = studentCourses;
    // Backward compatibility: courseId is the most recently added course (last entry)
    transformedClass.courseId =
      studentCourses.length > 0 ? studentCourses[studentCourses.length - 1] : null;

    delete transformedClass.studentsInClass;

    if (transformedClass.students && Array.isArray(transformedClass.students) && transformedClass.students.length > 0) {
      // Since we're only matching one student, take the first one
      transformedClass.students = transformedClass.students[0];
    } else {
      // If no students found, set to null or empty object
      transformedClass.students = null;
    }
    return transformedClass;
  });
};

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
  // add proper logs
  const classes = await getClassesById(classesId);
  if (!classes) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Class not found');
  }

  const patch = { ...updateBody } as UpdateClassesBody & { teacherId?: mongoose.Types.ObjectId };
  if (patch.teacherId && (!patch.teachers || patch.teachers.length === 0)) {
    patch.teachers = [patch.teacherId];
  }
  delete patch.teacherId;

  // Validate teachers if it's being updated
  if (patch.teachers && patch.teachers.length > 0) {
    for (const tid of patch.teachers) {
      const teacher = await User.findById(tid);
      if (!teacher) {
        throw new ApiError(httpStatus.NOT_FOUND, 'Teacher not found');
      }
      if (teacher.role !== 'teacher') {
        throw new ApiError(httpStatus.BAD_REQUEST, 'User must be a teacher to be assigned to a class');
      }
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
      role: 'student',
    });

    if (students.length !== updateBody.students.length) {
      const existingStudentIds = students.map((student) => student._id.toString());
      const missingStudentIds = updateBody.students.filter((id) => !existingStudentIds.includes(id.toString()));
      throw new ApiError(httpStatus.NOT_FOUND, `Students not found or not valid students: ${missingStudentIds.join(', ')}`);
    }
  }

  // Handle student updates and user model synchronization
  if (updateBody.students) {
    const currentStudentIds = classes.students.map((student) => student.toString());
    const newStudentIds = updateBody.students.map((id) => id.toString());

    // Find students to add (new students not in current list)
    const studentsToAdd = newStudentIds.filter((id) => !currentStudentIds.includes(id));

    // Find students to remove (current students not in new list)
    const studentsToRemove = currentStudentIds.filter((id) => !newStudentIds.includes(id));

    // Remove class from users who are no longer in the class
    if (studentsToRemove.length > 0) {
      await User.updateMany({ _id: { $in: studentsToRemove } }, { $pull: { classes: classesId } });
    }

    // Add class to new students and create progress records and attendance records
    if (studentsToAdd.length > 0) {
      // Extract courseId - handle both populated object and ObjectId
      const courseId =
        classes.courseId && typeof classes.courseId === 'object' && classes.courseId._id
          ? classes.courseId._id
          : classes.courseId;

      const progressPromises = studentsToAdd.map(async (studentId) => {
        // Create progress record
        const progress = await StudentProgress.createProgressForStudent(
          new mongoose.Types.ObjectId(studentId),
          classesId,
          courseId
        );

        // Create attendance record with current date as joining date
        const attendance = await StudentAttendance.create({
          studentId: new mongoose.Types.ObjectId(studentId),
          classId: classesId,
          joiningDate: new Date(),
        });

        // Update user model to include the class, course, and progress references
        await User.findByIdAndUpdate(studentId, {
          $addToSet: {
            classes: classesId,
            courses: courseId,
            progress: progress._id,
          },
        });

        return { progress, attendance };
      });

      try {
        await Promise.all(progressPromises);
      } catch (error) {
        console.error(
          'Failed to create progress records, attendance records, or update user model for some students:',
          error
        );
      }
    }
  }

  Object.assign(classes, patch);
  await classes.save();
  return classes;
};

/**
 * Delete class by id
 * Cleans up related records: StudentProgress, StudentAttendance, and User refs (classes, courses, progress)
 * @param {mongoose.Types.ObjectId} classesId
 * @returns {Promise<IClassesDoc | null>}
 */
export const deleteClassesById = async (classesId: mongoose.Types.ObjectId): Promise<IClassesDoc | null> => {
  const classes = await getClassesById(classesId);
  if (!classes) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Class not found');
  }

  // Build student -> course map from studentsInClass (each student can have their own course)
  const studentCourseMap = new Map<string, mongoose.Types.ObjectId>();
  const studentsInClass = (classes.studentsInClass ?? []) as { user: mongoose.Types.ObjectId; course: mongoose.Types.ObjectId }[];
  for (const entry of studentsInClass) {
    const userId = entry.user?.toString?.() ?? entry.user;
    const courseId = entry.course && (typeof entry.course === 'object' && entry.course._id ? entry.course._id : entry.course);
    if (userId && courseId) studentCourseMap.set(userId, courseId);
  }

  // Get all progress records for this class and remove from User model
  const progressRecords = await StudentProgress.find({ classId: classesId }).lean();
  const studentsWithProgress = new Set<string>();

  for (const progress of progressRecords) {
    const progressCourseId = progress.courseId;
    const progressId = progress._id;
    const studentId = progress.studentId;
    studentsWithProgress.add(studentId.toString());

    const pullOp: Record<string, unknown> = {
      classes: classesId,
      progress: progressId,
    };
    if (progressCourseId) pullOp['courses'] = progressCourseId;

    await User.findByIdAndUpdate(studentId, { $pull: pullOp });
  }

  // For students in class without progress record, still remove class/course refs (use studentsInClass for course)
  const classStudents = (classes.students ?? []) as mongoose.Types.ObjectId[];
  for (const studentId of classStudents) {
    if (studentsWithProgress.has(studentId.toString())) continue;

    const pullOp: Record<string, unknown> = { classes: classesId };
    const courseId = studentCourseMap.get(studentId.toString());
    if (courseId) pullOp['courses'] = courseId;

    await User.findByIdAndUpdate(studentId, { $pull: pullOp });
  }

  // Delete StudentProgress for this class
  await StudentProgress.deleteMany({ classId: classesId });

  // Delete StudentAttendance for this class
  await StudentAttendance.deleteMany({ classId: classesId });

  await classes.deleteOne();
  return classes;
};

/**
 * Get all classes with populated references
 * @returns {Promise<IClassesDoc[]>}
 */
export const getAllClasses = async (): Promise<IClassesDoc[]> => {
  return Classes.find().populate('teachers').populate('courseId').populate('students');
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
    role: 'student',
  });

  if (students.length !== studentIds.length) {
    const existingStudentIds = students.map((student) => student._id.toString());
    const missingStudentIds = studentIds.filter((id) => !existingStudentIds.includes(id.toString()));
    throw new ApiError(httpStatus.NOT_FOUND, `Students not found or not valid students: ${missingStudentIds.join(', ')}`);
  }

  // Check for duplicate students (students already in the class)
  const existingStudentIds = classes.students.map((student) => student.toString());
  const newStudentIds = studentIds.filter((id) => !existingStudentIds.includes(id.toString()));

  if (newStudentIds.length === 0) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'All students are already enrolled in this class');
  }

  // Add new students to the class
  const updatedClasses = await Classes.findByIdAndUpdate(
    classesId,
    { $addToSet: { students: { $each: newStudentIds } } },
    { new: true }
  )
    .populate('teachers')
    .populate('courseId')
    .populate('students');

  // Create progress records and attendance records for newly added students and update user model
  if (newStudentIds.length > 0) {
    // Extract courseId - handle both populated object and ObjectId
    const courseId =
      classes.courseId && typeof classes.courseId === 'object' && classes.courseId._id
        ? classes.courseId._id
        : classes.courseId;

    const progressPromises = newStudentIds.map(async (studentId) => {
      // Create progress record
      const progress = await StudentProgress.createProgressForStudent(studentId, classesId, courseId);

      // Create attendance record with current date as joining date
      const attendance = await StudentAttendance.create({
        studentId: new mongoose.Types.ObjectId(studentId),
        classId: classesId,
        joiningDate: new Date(),
      });

      // Update user model to include the class, course, and progress references
      await User.findByIdAndUpdate(studentId, {
        $addToSet: {
          classes: classesId,
          courses: courseId,
          progress: progress._id,
        },
      });

      return { progress, attendance };
    });

    try {
      await Promise.all(progressPromises);
    } catch (error) {
      // Log the error but don't fail the student addition
      console.error('Failed to create progress records, attendance records, or update user model for some students:', error);
    }
  }

  return updatedClasses;
};

/**
 * Get students by class id
 * @param {mongoose.Types.ObjectId} classesId
 * @returns {Promise<any[]>}
 */
export const getStudentsByClassId = async (classesId: mongoose.Types.ObjectId): Promise<any[]> => {
  const classes = await Classes.findById(classesId).populate({
    path: 'students',
    select: 'name email role gradeLevel profilePicture createdAt',
  });

  if (!classes) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Class not found');
  }

  return classes.students || [];
};

//addSingleStudentToClass

export const addSingleStudentToClass = async (
  classesId: mongoose.Types.ObjectId,
  studentId: mongoose.Types.ObjectId,
  courseId: mongoose.Types.ObjectId
): Promise<any | null> => {
  const classes = await getClassesById(classesId);
  if (!classes) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Class not found');
  }

  // Validate that the student exists and is a student
  const student = await User.findById(studentId);
  if (!student) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Student not found');
  }
  if (student.role !== 'student') {
    throw new ApiError(httpStatus.BAD_REQUEST, 'User must be a student to be added to a class');
  }

  // Validate that the course exists
  const course = await Course.findById(courseId);
  if (!course) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Course not found');
  }

  // Check if the student is already enrolled in this course in the class
  const existingEnrollment = classes.studentsInClass?.find(
    (entry) =>
      entry.user.toString() === studentId.toString() && entry.course.toString() === courseId.toString()
  );
  if (existingEnrollment) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Student is already enrolled in this course in the class');
  }

  const existingProgress = await StudentProgress.findOne({ studentId, classId: classesId, courseId });
  if (existingProgress) {
    throw new ApiError(httpStatus.CONFLICT, 'Progress record already exists for this student, class, and course');
  }

  const isNewToClass = !(classes.students ?? []).some((s) => {
    const sid = getObjectId(s as mongoose.Types.ObjectId);
    return sid?.toString() === studentId.toString();
  });

  // Add the student to the class also add to students array
  const updatedClasses = await Classes.findByIdAndUpdate(
    classesId,
    { $addToSet: { studentsInClass: { user: studentId, course: courseId }, students: studentId } },
    { new: true }
  );

  const progress = await StudentProgress.createProgressForStudent(studentId, classesId, courseId);

  let attendance = await StudentAttendance.findOne({ studentId, classId: classesId });
  if (!attendance) {
    attendance = await StudentAttendance.create({
      studentId: new mongoose.Types.ObjectId(studentId),
      classId: classesId,
      joiningDate: new Date(),
    });
  }

  if (isNewToClass) {
    await User.findByIdAndUpdate(studentId, {
      $addToSet: { classes: classesId, courses: courseId, progress: progress._id },
    });
  } else {
    await User.findByIdAndUpdate(studentId, {
      $addToSet: { courses: courseId, progress: progress._id },
    });
  }

  return { updatedClasses, progress, attendance };
};

/**
 * Backfill studentsInClass entries from existing StudentProgress records for a student.
 */
const ensureStudentsInClassFromProgress = async (
  classesId: mongoose.Types.ObjectId,
  studentId: mongoose.Types.ObjectId,
  session: mongoose.ClientSession
): Promise<void> => {
  const progressRecords = await StudentProgress.find({ studentId, classId: classesId }).session(session).lean();

  for (const progress of progressRecords) {
    const courseId = getObjectId(progress.courseId as mongoose.Types.ObjectId);
    if (!courseId) continue;

    const exists = await Classes.exists({
      _id: classesId,
      studentsInClass: { $elemMatch: { user: studentId, course: courseId } },
    }).session(session);

    if (!exists) {
      await Classes.updateOne(
        { _id: classesId },
        { $push: { studentsInClass: { user: studentId, course: courseId } } },
        { session }
      );
    }
  }
};

/**
 * Promote a student to the next course within the same class.
 * Resolves the target course from the current course's instrument and level (level + 1).
 * Preserves existing course enrollment and progress; adds a new course assignment.
 */
export const promoteStudentInClass = async (
  classesId: mongoose.Types.ObjectId,
  studentId: mongoose.Types.ObjectId,
  currentCourseId: mongoose.Types.ObjectId,
  promotedBy?: mongoose.Types.ObjectId
): Promise<{
  promotion: Awaited<ReturnType<typeof createStudentPromotion>> | null;
  progress: IStudentProgressDoc;
  previousProgress: IStudentProgressDoc[];
  alreadyPromoted: boolean;
  currentCourseId: mongoose.Types.ObjectId;
  targetCourseId: mongoose.Types.ObjectId;
}> => {
  const classes = await getClassesById(classesId);
  if (!classes) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Class not found');
  }

  const student = await User.findById(studentId);
  if (!student) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Student not found');
  }
  if (student.role !== 'student') {
    throw new ApiError(httpStatus.BAD_REQUEST, 'User must be a student');
  }
  if (!student.isActive) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Student is not active');
  }

  const isInClass =
    (classes.students ?? []).some((s) => getObjectId(s as mongoose.Types.ObjectId)?.toString() === studentId.toString()) ||
    (classes.studentsInClass ?? []).some((entry) => entry.user.toString() === studentId.toString());

  if (!isInClass) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Student is not enrolled in this class');
  }

  const currentCourse = await Course.findById(currentCourseId);
  if (!currentCourse) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Current course not found');
  }

  const enrolledInCurrentCourse =
    (await StudentProgress.findByStudentClassAndCourse(studentId, classesId, currentCourseId)) !== null ||
    (classes.studentsInClass ?? []).some(
      (entry) =>
        entry.user.toString() === studentId.toString() && entry.course.toString() === currentCourseId.toString()
    );

  if (!enrolledInCurrentCourse) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Student is not enrolled in the specified course in this class');
  }

  const targetCourse = await findNextLevelCourse(currentCourseId);
  const targetCourseId = targetCourse._id;

  if (targetCourseId.equals(currentCourseId)) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Student is already at the highest available course level');
  }

  const existingProgressForTarget = await StudentProgress.findByStudentClassAndCourse(
    studentId,
    classesId,
    targetCourseId
  );
  if (existingProgressForTarget) {
    const existingPromotion = await getPromotionByStudentClassAndCourse(studentId, classesId, targetCourseId);
    const allProgress = await StudentProgress.findAllByStudentAndClass(studentId, classesId);
    return {
      promotion: existingPromotion,
      progress: existingProgressForTarget,
      previousProgress: allProgress.filter((p) => !p.courseId.equals(targetCourseId)),
      alreadyPromoted: true,
      currentCourseId,
      targetCourseId,
    };
  }

  const previousProgress = await StudentProgress.findAllByStudentAndClass(studentId, classesId);
  if (previousProgress.length === 0) {
    throw new ApiError(
      httpStatus.BAD_REQUEST,
      'Student has no existing course enrollment in this class. Use add-student to enroll first.'
    );
  }

  const alreadyInStudentsInClass = (classes.studentsInClass ?? []).some(
    (entry) =>
      entry.user.toString() === studentId.toString() && entry.course.toString() === targetCourseId.toString()
  );
  if (alreadyInStudentsInClass) {
    throw new ApiError(httpStatus.CONFLICT, 'Student is already assigned to the next level course in the class');
  }

  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    await ensureStudentsInClassFromProgress(classesId, studentId, session);

    await Classes.findByIdAndUpdate(
      classesId,
      { $push: { studentsInClass: { user: studentId, course: targetCourseId } } },
      { session }
    );

    const progress = await StudentProgress.createProgressForStudent(studentId, classesId, targetCourseId, session);

    await User.findByIdAndUpdate(
      studentId,
      { $addToSet: { courses: targetCourseId, progress: progress._id } },
      { session }
    );

    const promotion = await createStudentPromotion(
      {
        studentId,
        classId: classesId,
        targetCourseId,
        ...(promotedBy ? { promotedBy } : {}),
      },
      session
    );

    await session.commitTransaction();

    return {
      promotion,
      progress,
      previousProgress,
      alreadyPromoted: false,
      currentCourseId,
      targetCourseId,
    };
  } catch (error) {
    await session.abortTransaction();
    throw error;
  } finally {
    session.endSession();
  }
};

/**
 * Get promotion history for a student in a class.
 */
export const getStudentPromotionsInClass = async (
  classesId: mongoose.Types.ObjectId,
  studentId: mongoose.Types.ObjectId
) => {
  const classes = await getClassesById(classesId);
  if (!classes) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Class not found');
  }

  return getPromotionsByStudentAndClass(studentId, classesId);
};

/**
 * Remove a student's enrollment in a specific course within a class.
 * If it is their last course in the class, also removes class membership and attendance.
 */
export const removeStudentCourseFromClass = async (
  classesId: mongoose.Types.ObjectId,
  studentId: mongoose.Types.ObjectId,
  courseId: mongoose.Types.ObjectId
): Promise<IClassesDoc | null> => {
  const classes = await getClassesById(classesId);
  if (!classes) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Class not found');
  }

  const student = await User.findById(studentId);
  if (!student) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Student not found');
  }

  const progressRecord = await StudentProgress.findOne({ studentId, classId: classesId, courseId }).lean();

  const studentsInClass = (classes.studentsInClass ?? []) as {
    user: mongoose.Types.ObjectId | { _id?: mongoose.Types.ObjectId };
    course: mongoose.Types.ObjectId | { _id?: mongoose.Types.ObjectId };
  }[];
  const hasCourseInClass = studentsInClass.some((entry) => {
    const uid = getObjectId(entry.user as mongoose.Types.ObjectId);
    const cid = getObjectId(entry.course as mongoose.Types.ObjectId);
    return uid?.toString() === studentId.toString() && cid?.toString() === courseId.toString();
  });

  if (!progressRecord && !hasCourseInClass) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Student is not enrolled in this course in the class');
  }

  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    await Classes.findByIdAndUpdate(
      classesId,
      { $pull: { studentsInClass: { user: studentId, course: courseId } } },
      { session }
    );

    if (progressRecord) {
      await StudentProgress.deleteOne({ _id: progressRecord._id }, { session });
      await User.findByIdAndUpdate(
        studentId,
        { $pull: { courses: courseId, progress: progressRecord._id } },
        { session }
      );
    } else {
      await User.findByIdAndUpdate(studentId, { $pull: { courses: courseId } }, { session });
    }

    const remainingProgressCount = await StudentProgress.countDocuments(
      { studentId, classId: classesId },
      { session }
    );

    const classDoc = await Classes.findById(classesId).session(session).lean();
    const remainingInStudentsInClass = (classDoc?.studentsInClass ?? []).filter((entry) => {
      const uid = getObjectId(entry.user as mongoose.Types.ObjectId);
      return uid?.toString() === studentId.toString();
    }).length;

    const hasRemainingCourses = remainingProgressCount > 0 || remainingInStudentsInClass > 0;

    if (!hasRemainingCourses) {
      await Classes.findByIdAndUpdate(
        classesId,
        { $pull: { students: studentId, studentsInClass: { user: studentId } } },
        { session }
      );
      await User.findByIdAndUpdate(studentId, { $pull: { classes: classesId } }, { session });
      await StudentAttendance.deleteOne({ studentId, classId: classesId }, { session });
    }

    await session.commitTransaction();

    return Classes.findById(classesId).populate('teachers').populate('courseId').populate('students');
  } catch (error) {
    await session.abortTransaction();
    throw error;
  } finally {
    session.endSession();
  }
};

/** @deprecated Use removeStudentCourseFromClass — removes all courses for a student in a class */
export const removeStudentFromClass = async (
  classesId: mongoose.Types.ObjectId,
  studentId: mongoose.Types.ObjectId
): Promise<IClassesDoc | null> => {
  const classes = await getClassesById(classesId);
  if (!classes) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Class not found');
  }

  // Check if student is present in studentsInClass (source of truth)
  const studentsInClass = (classes.studentsInClass ?? []) as {
    user: mongoose.Types.ObjectId | { _id?: mongoose.Types.ObjectId };
    course: mongoose.Types.ObjectId | { _id?: mongoose.Types.ObjectId };
  }[];
  const studentEntries = studentsInClass.filter((s) => {
    const uid = getObjectId(s.user as mongoose.Types.ObjectId);
    return uid && uid.toString() === studentId.toString();
  });

  if (studentEntries.length === 0) {
    const inStudentsArray = (classes.students ?? []).some((id) => id.toString() === studentId.toString());
    if (!inStudentsArray) {
      throw new ApiError(httpStatus.NOT_FOUND, 'Student is not enrolled in this class');
    }
  }

  const progressRecords = await StudentProgress.find({ studentId, classId: classesId }).lean();

  if (progressRecords.length > 0) {
    for (const progressRecord of progressRecords) {
      const progressCourseId = getObjectId(progressRecord.courseId as mongoose.Types.ObjectId);
      const pullOp: Record<string, unknown> = {
        progress: progressRecord._id,
      };
      if (progressCourseId) pullOp['courses'] = progressCourseId;

      await User.findByIdAndUpdate(studentId, { $pull: pullOp });
    }
  } else if (studentEntries.length > 0) {
    for (const entry of studentEntries) {
      const courseId = getObjectId(entry.course as mongoose.Types.ObjectId);
      if (courseId) {
        await User.findByIdAndUpdate(studentId, { $pull: { courses: courseId } });
      }
    }
  }

  await User.findByIdAndUpdate(studentId, { $pull: { classes: classesId } });

  await StudentProgress.deleteMany({ studentId, classId: classesId });

  // Delete StudentAttendance for this student + class
  await StudentAttendance.deleteOne({ studentId, classId: classesId });

  // Remove student from studentsInClass and students arrays on the class
  const updatedClasses = await Classes.findByIdAndUpdate(
    classesId,
    {
      $pull: {
        studentsInClass: { user: studentId },
        students: studentId,
      },
    },
    { new: true }
  )
    .populate('teachers')
    .populate('courseId')
    .populate('students');

  return updatedClasses;
};
