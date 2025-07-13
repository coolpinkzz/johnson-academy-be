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
  return Course.create(courseBody);
};

/**
 * Query for courses
 * @param {Object} filter - Mongo filter
 * @param {Object} options - Query options
 * @returns {Promise<QueryResult>}
 */
export const queryCourses = async (filter: Record<string, any>, options: IOptions): Promise<QueryResult> => {
  const courses = await Course.paginate(filter, options);
  return courses;
};

/**
 * Get course by id
 * @param {mongoose.Types.ObjectId} id
 * @returns {Promise<ICourseDoc | null>}
 */
export const getCourseById = async (id: mongoose.Types.ObjectId): Promise<ICourseDoc | null> => {
  return Course.findById(id).populate({
    path: 'syllabus',
    populate: [
      { path: 'theory' },
      { path: 'technical' },
      { path: 'learning' }
    ]
  });
};

/**
 * Get course by name
 * @param {string} name
 * @returns {Promise<ICourseDoc | null>}
 */
export const getCourseByName = async (name: string): Promise<ICourseDoc | null> => Course.findOne({ name });

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
  const course = await getCourseById(courseId);
  if (!course) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Course not found');
  }
  Object.assign(course, updateBody);
  await course.save();
  return course;
};

/**
 * Delete course by id
 * @param {mongoose.Types.ObjectId} courseId
 * @returns {Promise<ICourseDoc | null>}
 */
export const deleteCourseById = async (courseId: mongoose.Types.ObjectId): Promise<ICourseDoc | null> => {
  const course = await getCourseById(courseId);
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
  return Course.find({ syllabus: syllabusId });
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
  const course = await getCourseById(courseId);
  if (!course) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Course not found');
  }
  
  if (!course.syllabus?.includes(syllabusId)) {
    course.syllabus?.push(syllabusId);
    await course.save();
  }
  
  return course;
};

/**
 * Remove syllabus from course
 * @param {mongoose.Types.ObjectId} courseId
 * @param {mongoose.Types.ObjectId} syllabusId
 * @returns {Promise<ICourseDoc | null>}
 */
export const removeSyllabusFromCourse = async (
  courseId: mongoose.Types.ObjectId,
  syllabusId: mongoose.Types.ObjectId
): Promise<ICourseDoc | null> => {
  const course = await getCourseById(courseId);
  if (!course) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Course not found');
  }
  
  course.syllabus = course.syllabus?.filter(id => !id.equals(syllabusId)) || [];
  await course.save();
  
  return course;
};

/**
 * Get all courses with populated syllabus
 * @returns {Promise<ICourseDoc[]>}
 */
export const getAllCoursesWithSyllabus = async (): Promise<ICourseDoc[]> => {
  return Course.find().populate('syllabus');
};
