import httpStatus from 'http-status';
import mongoose from 'mongoose';
import Classes from './classes.model';
import User from '../user/user.model';
import Course from '../course/course.model';
import StudentProgress from '../studentProgress/studentProgress.model';
import StudentAttendance from '../studentAttendance/studentAttendance.model';
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
      role: 'student',
    });

    if (students.length !== classesBody.students.length) {
      const existingStudentIds = students.map((student) => student._id.toString());
      const missingStudentIds = classesBody.students.filter((id) => !existingStudentIds.includes(id.toString()));
      throw new ApiError(httpStatus.NOT_FOUND, `Students not found or not valid students: ${missingStudentIds.join(', ')}`);
    }
  }

  const createdClass = await Classes.create(classesBody);

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
  // Ensure course is populated if not already specified
  if (!options.populate) {
    options.populate = 'courseId';
  } else if (!options.populate.includes('courseId')) {
    options.populate += ',courseId';
  }

  // Set default sort to latest to oldest if no sort is specified
  if (!options.sortBy) {
    options.sortBy = 'createdAt:desc';
  }

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
export const getClassesByStudentId = async (studentId: mongoose.Types.ObjectId): Promise<any[]> => {
  const classes = await Classes.find({ students: studentId })
    .populate('teacherId')
    .populate('courseId')
    .populate({
      path: 'students',
      match: { _id: studentId },
    });

  // Transform the result to make students a single object instead of array
  return classes.map((cls) => {
    const transformedClass = cls.toObject({
      virtuals: true, // This preserves virtual fields like 'id'
      versionKey: false, // This removes the __v field
    }) as any;

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
      const progressPromises = studentsToAdd.map(async (studentId) => {
        // Create progress record
        const progress = await StudentProgress.createProgressForStudent(
          new mongoose.Types.ObjectId(studentId),
          classesId,
          classes.courseId
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
            courses: classes.courseId,
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

  // Remove class from all students' classes array
  if (classes.students && classes.students.length > 0) {
    await User.updateMany({ _id: { $in: classes.students } }, { $pull: { classes: classesId } });
  }

  await classes.deleteOne();
  return classes;
};

/**
 * Get all classes with populated references
 * @returns {Promise<IClassesDoc[]>}
 */
export const getAllClasses = async (): Promise<IClassesDoc[]> => {
  return Classes.find().populate('teacherId').populate('courseId').populate('students');
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
    .populate('teacherId')
    .populate('courseId')
    .populate('students');

  // Create progress records and attendance records for newly added students and update user model
  if (newStudentIds.length > 0) {
    const progressPromises = newStudentIds.map(async (studentId) => {
      // Create progress record
      const progress = await StudentProgress.createProgressForStudent(studentId, classesId, classes.courseId);

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
          courses: classes.courseId,
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
