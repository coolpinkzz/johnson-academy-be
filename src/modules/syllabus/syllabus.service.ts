import httpStatus from 'http-status';
import mongoose from 'mongoose';
import Syllabus from './syllabus.model';
import Course from '../course/course.model';
import Module from '../module/module.model';
import ApiError from '../errors/ApiError';
import { IOptions, QueryResult } from '../paginate/paginate';
import { NewCreatedSyllabus, UpdateSyllabusBody, ISyllabusDoc } from './syllabus.interfaces';

/**
 * Create a syllabus
 * @param {NewCreatedSyllabus} syllabusBody
 * @returns {Promise<ISyllabusDoc>}
 */
export const createSyllabus = async (syllabusBody: NewCreatedSyllabus): Promise<ISyllabusDoc> => {
  // Validate that the course exists
  const course = await Course.findById(syllabusBody.courseId);
  if (!course) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Course not found');
  }

  return Syllabus.create(syllabusBody);
};

/**
 * Query for syllabi
 * @param {Object} filter - Mongo filter
 * @param {Object} options - Query options
 * @returns {Promise<QueryResult>}
 */
export const querySyllabi = async (filter: Record<string, any>, options: IOptions): Promise<QueryResult> => {
  // Transform the filter to handle partial title matching
  const transformedFilter = { ...filter };

  if (transformedFilter['title']) {
    // Convert title filter to case-insensitive regex for partial matching
    transformedFilter['title'] = { $regex: transformedFilter['title'], $options: 'i' };
  }

  const syllabi = await Syllabus.paginate(transformedFilter, options);
  return syllabi;
};

/**
 * Get syllabus by id
 * @param {mongoose.Types.ObjectId} id
 * @returns {Promise<ISyllabusDoc | null>}
 */
export const getSyllabusById = async (id: mongoose.Types.ObjectId): Promise<any> => {
  const syllabus = await Syllabus.findById(id).populate('courseId');
  return syllabus;
};

/**
 * Get syllabus by course id
 * @param {mongoose.Types.ObjectId} courseId
 * @returns {Promise<any | null>}
 */
export const getSyllabusByCourseId = async (courseId: mongoose.Types.ObjectId): Promise<any | null> => {
  const syllabus = await Syllabus.findOne({ courseId }).populate('courseId');
  return syllabus;
};

/**
 * Update syllabus by id
 * @param {mongoose.Types.ObjectId} syllabusId
 * @param {UpdateSyllabusBody} updateBody
 * @returns {Promise<ISyllabusDoc | null>}
 */
export const updateSyllabusById = async (
  syllabusId: mongoose.Types.ObjectId,
  updateBody: UpdateSyllabusBody
): Promise<ISyllabusDoc | null> => {
  const syllabus = await Syllabus.findById(syllabusId);
  if (!syllabus) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Syllabus not found');
  }

  // Validate courseId if it's being updated
  if (updateBody.courseId) {
    const course = await Course.findById(updateBody.courseId);
    if (!course) {
      throw new ApiError(httpStatus.NOT_FOUND, 'Course not found');
    }
  }

  Object.assign(syllabus, updateBody);
  await syllabus.save();
  return syllabus;
};

/**
 * Delete syllabus by id
 * @param {mongoose.Types.ObjectId} syllabusId
 * @returns {Promise<ISyllabusDoc | null>}
 */
export const deleteSyllabusById = async (syllabusId: mongoose.Types.ObjectId): Promise<ISyllabusDoc | null> => {
  const syllabus = await Syllabus.findById(syllabusId);
  if (!syllabus) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Syllabus not found');
  }
  await syllabus.deleteOne();
  return syllabus;
};

/**
 * Get all syllabi with populated references
 * @returns {Promise<any[]>}
 */
export const getAllSyllabi = async (): Promise<any[]> => {
  const syllabi = await Syllabus.find().populate('courseId');

  // Fetch modules for each syllabus and organize them by type
  const syllabiWithModules = await Promise.all(
    syllabi.map(async (syllabus) => {
      const modules = await Module.find({ syllabusId: syllabus._id });

      // Organize modules by type
      const technical = modules.filter((module) => module.type === 'technical');
      const theory = modules.filter((module) => module.type === 'theory');
      const learning = modules.filter((module) => module.type === 'learning');
      const others = modules.filter((module) => module.type === 'others');

      return {
        ...syllabus.toObject(),
        technical,
        theory,
        learning,
        others,
      };
    })
  );

  return syllabiWithModules;
};
