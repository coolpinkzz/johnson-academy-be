import httpStatus from 'http-status';
import mongoose from 'mongoose';
import Course from './course.model';
import ApiError from '../errors/ApiError';
import { IOptions, QueryResult } from '../paginate/paginate';
import { NewCreatedCourse, UpdateCourseBody, ICourseDoc } from './course.interfaces';

/**
 * Create a course
 * @param {NewCreatedCourse} courseBody
 * @returns {Promise<ICourseDoc>}
 */
export const createCourse = async (courseBody: NewCreatedCourse): Promise<ICourseDoc> => {
  const course = await Course.create(courseBody);

  // Populate the created course with syllabus
  const populatedCourse = await Course.findById(course._id).populate('syllabus');

  return populatedCourse || course;
};

/**
 * Query for courses
 * @param {Object} filter - Mongo filter
 * @param {Object} options - Query options
 * @returns {Promise<QueryResult>}
 */
export const queryCourses = async (filter: Record<string, any>, options: IOptions): Promise<QueryResult> => {
  // Transform the filter to handle partial name matching
  const transformedFilter = { ...filter };

  if (transformedFilter['name']) {
    // Convert name filter to case-insensitive regex for partial matching
    transformedFilter['name'] = { $regex: transformedFilter['name'], $options: 'i' };
  }

  const courses = await Course.paginate(transformedFilter, options);

  // Populate syllabus for each course
  if (courses.results && courses.results.length > 0) {
    await Course.populate(courses.results, {
      path: 'syllabus',
    });

    // Add student count for each course
    const coursesWithStudentCount = await Promise.all(
      courses.results.map(async (course) => {
        const courseObj = course.toObject();

        // Count students from User model (students who have this course in their courses array)
        const studentCountFromUsers = await mongoose.model('User').countDocuments({
          courses: course._id,
          role: 'student',
        });

        // Count students from StudentProgress model
        const studentCountFromProgress = await mongoose.model('StudentProgress').countDocuments({
          courseId: course._id,
        });

        // Count students from Classes model
        const studentCountFromClasses = await mongoose.model('Classes').countDocuments({
          courseId: course._id,
        });

        // Use the highest count as it's the most comprehensive
        const totalStudentCount = Math.max(studentCountFromUsers, studentCountFromProgress, studentCountFromClasses);

        return {
          ...courseObj,
          studentCount: totalStudentCount,
        };
      })
    );

    courses.results = coursesWithStudentCount;
  }

  return courses;
};

/**
 * Get course by id
 * @param {mongoose.Types.ObjectId} id
 * @returns {Promise<ICourseDoc | null>}
 */
export const getCourseById = async (id: mongoose.Types.ObjectId): Promise<any> => {
  const course = await Course.findById(id).populate('syllabus');

  if (course) {
    const courseObj = course.toObject();

    // Count students from User model (students who have this course in their courses array)
    const studentCountFromUsers = await mongoose.model('User').countDocuments({
      courses: course._id,
      role: 'student',
    });

    // Count students from StudentProgress model
    const studentCountFromProgress = await mongoose.model('StudentProgress').countDocuments({
      courseId: course._id,
    });

    // Count students from Classes model
    const studentCountFromClasses = await mongoose.model('Classes').countDocuments({
      courseId: course._id,
    });

    // Use the highest count as it's the most comprehensive
    const totalStudentCount = Math.max(studentCountFromUsers, studentCountFromProgress, studentCountFromClasses);

    return {
      ...courseObj,
      studentCount: totalStudentCount,
    };
  }

  return course;
};

/**
 * Get course by name
 * @param {string} name
 * @returns {Promise<ICourseDoc | null>}
 */
export const getCourseByName = async (name: string): Promise<any> => {
  const course = await Course.findOne({ name });

  if (course) {
    await Course.populate(course, {
      path: 'syllabus',
      populate: [{ path: 'theory' }, { path: 'technical' }, { path: 'learning' }, { path: 'others' }],
    });

    const courseObj = course.toObject();

    // Count students from User model (students who have this course in their courses array)
    const studentCountFromUsers = await mongoose.model('User').countDocuments({
      courses: course._id,
      role: 'student',
    });

    // Count students from StudentProgress model
    const studentCountFromProgress = await mongoose.model('StudentProgress').countDocuments({
      courseId: course._id,
    });

    // Count students from Classes model
    const studentCountFromClasses = await mongoose.model('Classes').countDocuments({
      courseId: course._id,
    });

    // Use the highest count as it's the most comprehensive
    const totalStudentCount = Math.max(studentCountFromUsers, studentCountFromProgress, studentCountFromClasses);

    return {
      ...courseObj,
      studentCount: totalStudentCount,
    };
  }

  return course;
};

/**
 * Update course by id
 * @param {mongoose.Types.ObjectId} courseId
 * @param {UpdateCourseBody} updateBody
 * @returns {Promise<ICourseDoc | null>}
 */
export const updateCourseById = async (
  courseId: mongoose.Types.ObjectId,
  updateBody: UpdateCourseBody
): Promise<ICourseDoc | null> => {
  const course = await Course.findById(courseId);
  if (!course) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Course not found');
  }
  Object.assign(course, updateBody);
  await course.save();

  // Return populated course
  return getCourseById(courseId);
};

/**
 * Delete course by id
 * @param {mongoose.Types.ObjectId} courseId
 * @returns {Promise<ICourseDoc | null>}
 */
export const deleteCourseById = async (courseId: mongoose.Types.ObjectId): Promise<ICourseDoc | null> => {
  const course = await Course.findById(courseId);
  if (!course) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Course not found');
  }
  await course.deleteOne();
  return course;
};

/**
 * Get courses by syllabus
 * @param {mongoose.Types.ObjectId} syllabusId
 * @returns {Promise<ICourseDoc[]>}
 */
export const getCoursesBySyllabus = async (syllabusId: mongoose.Types.ObjectId): Promise<ICourseDoc[]> => {
  const courses = await Course.find({ syllabus: syllabusId });

  // Populate syllabus for each course
  if (courses.length > 0) {
    await Course.populate(courses, {
      path: 'syllabus',
    });
  }

  return courses;
};

/**
 * Add syllabus to course
 * @param {mongoose.Types.ObjectId} courseId
 * @param {mongoose.Types.ObjectId} syllabusId
 * @returns {Promise<ICourseDoc | null>}
 */
export const addSyllabusToCourse = async (
  courseId: mongoose.Types.ObjectId,
  syllabusId: mongoose.Types.ObjectId
): Promise<ICourseDoc | null> => {
  const course = await Course.findById(courseId);
  if (!course) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Course not found');
  }

  if (!course.syllabus?.includes(syllabusId)) {
    course.syllabus?.push(syllabusId);
    await course.save();
  }

  // Return populated course
  return getCourseById(courseId);
};

/**
 * Remove syllabus from course
 * @returns {Promise<ICourseDoc | null>}
 */
export const removeSyllabusFromCourse = async (
  courseId: mongoose.Types.ObjectId,
  syllabusId: mongoose.Types.ObjectId
): Promise<ICourseDoc | null> => {
  const course = await Course.findById(courseId);
  if (!course) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Course not found');
  }

  course.syllabus = course.syllabus?.filter((id: any) => !id.equals(syllabusId)) || [];
  await course.save();

  // Return populated course
  return getCourseById(courseId);
};

/**
 * Get all courses with populated syllabus
 * @returns {Promise<ICourseDoc[]>}
 */
export const getAllCoursesWithSyllabus = async (): Promise<any[]> => {
  const courses = await Course.find().populate('syllabus');

  // Populate nested fields within syllabus
  if (courses.length > 0) {
    await Course.populate(courses, {
      path: 'syllabus',
    });

    // Add student count for each course
    const coursesWithStudentCount = await Promise.all(
      courses.map(async (course) => {
        const courseObj = course.toObject();

        // Count students from User model (students who have this course in their courses array)
        const studentCountFromUsers = await mongoose.model('User').countDocuments({
          courses: course._id,
          role: 'student',
        });

        // Count students from StudentProgress model
        const studentCountFromProgress = await mongoose.model('StudentProgress').countDocuments({
          courseId: course._id,
        });

        // Count students from Classes model
        const studentCountFromClasses = await mongoose.model('Classes').countDocuments({
          courseId: course._id,
        });

        // Use the highest count as it's the most comprehensive
        const totalStudentCount = Math.max(studentCountFromUsers, studentCountFromProgress, studentCountFromClasses);

        return {
          ...courseObj,
          studentCount: totalStudentCount,
        };
      })
    );

    return coursesWithStudentCount;
  }

  return courses.map((course) => course.toObject());
};
