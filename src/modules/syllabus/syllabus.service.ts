import httpStatus from 'http-status';
import mongoose from 'mongoose';
import Syllabus from './syllabus.model';
import Course from '../course/course.model';
import ApiError from '../errors/ApiError';
import { IOptions, QueryResult } from '../paginate/paginate';
import { NewCreatedSyllabus, UpdateSyllabusBody, ISyllabusDoc } from './syllabus.interfaces';
import Module from '../module/module.model';

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
  
  // Validate module IDs if provided
  const allModuleIds = [
    ...(syllabusBody.theory || []),
    ...(syllabusBody.technical || []),
    ...(syllabusBody.learning || [])
  ];
  
  if (allModuleIds.length > 0) {
    const existingModules = await Module.find({
      _id: { $in: allModuleIds }
    });
    
    if (existingModules.length !== allModuleIds.length) {
      const existingModuleIds = existingModules.map(module => module._id.toString());
      const missingModuleIds = allModuleIds.filter(id => !existingModuleIds.includes(id.toString()));
      throw new ApiError(httpStatus.NOT_FOUND, `Modules not found: ${missingModuleIds.join(', ')}`);
    }
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
  const syllabi = await Syllabus.paginate(filter, options);
  return syllabi;
};

/**
 * Get syllabus by id
 * @param {mongoose.Types.ObjectId} id
 * @returns {Promise<ISyllabusDoc | null>}
 */
export const getSyllabusById = async (id: mongoose.Types.ObjectId): Promise<ISyllabusDoc | null> => 
  Syllabus.findById(id).populate('courseId').populate('theory').populate('technical').populate('learning');

/**
 * Get syllabus by course id
 * @param {mongoose.Types.ObjectId} courseId
 * @returns {Promise<ISyllabusDoc | null>}
 */
export const getSyllabusByCourseId = async (courseId: mongoose.Types.ObjectId): Promise<ISyllabusDoc | null> => 
  Syllabus.findOne({ courseId }).populate('courseId').populate('theory').populate('technical').populate('learning');

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
  const syllabus = await getSyllabusById(syllabusId);
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
  
  // Validate module IDs if they're being updated
  const allModuleIds = [
    ...(updateBody.theory || []),
    ...(updateBody.technical || []),
    ...(updateBody.learning || [])
  ];
  
  if (allModuleIds.length > 0) {
    const existingModules = await Module.find({
      _id: { $in: allModuleIds }
    });
    
    if (existingModules.length !== allModuleIds.length) {
      const existingModuleIds = existingModules.map(module => module._id.toString());
      const missingModuleIds = allModuleIds.filter(id => !existingModuleIds.includes(id.toString()));
      throw new ApiError(httpStatus.NOT_FOUND, `Modules not found: ${missingModuleIds.join(', ')}`);
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
  const syllabus = await getSyllabusById(syllabusId);
  if (!syllabus) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Syllabus not found');
  }
  await syllabus.deleteOne();
  return syllabus;
};

/**
 * Get all syllabi with populated references
 * @returns {Promise<ISyllabusDoc[]>}
 */
export const getAllSyllabi = async (): Promise<ISyllabusDoc[]> => {
  return Syllabus.find()
    .populate('courseId')
    .populate('theory')
    .populate('technical')
    .populate('learning');
}; 

/**
 * Bulk add modules to syllabus by category
 * @param {mongoose.Types.ObjectId} syllabusId
 * @param {string} category - 'theory', 'technical', or 'learning'
 * @param {mongoose.Types.ObjectId[]} moduleIds
 * @returns {Promise<ISyllabusDoc | null>}
 */
export const bulkAddModulesToSyllabus = async (
  syllabusId: mongoose.Types.ObjectId,
  category: 'theory' | 'technical' | 'learning',
  moduleIds: mongoose.Types.ObjectId[]
): Promise<ISyllabusDoc | null> => {
  const syllabus = await getSyllabusById(syllabusId);
  if (!syllabus) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Syllabus not found');
  }

  // Validate that the category is valid
  if (!['theory', 'technical', 'learning'].includes(category)) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Invalid category. Must be one of: theory, technical, learning');
  }

  // Validate that all module IDs exist
  if (moduleIds.length > 0) {
    const existingModules = await Module.find({
      _id: { $in: moduleIds }
    });
    
    if (existingModules.length !== moduleIds.length) {
      const existingModuleIds = existingModules.map(module => module._id.toString());
      const missingModuleIds = moduleIds.filter(id => !existingModuleIds.includes(id.toString()));
      throw new ApiError(httpStatus.NOT_FOUND, `Modules not found: ${missingModuleIds.join(', ')}`);
    }
  }

  // Check for duplicate module IDs in the category
  const existingModuleIds = syllabus[category].map(id => id.toString());
  const newModuleIds = moduleIds.filter(id => !existingModuleIds.includes(id.toString()));
  
  if (newModuleIds.length === 0) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'All provided module IDs already exist in this category');
  }

  // Add new module IDs to the category
  syllabus[category] = [...syllabus[category], ...newModuleIds];
  await syllabus.save();
  
  return getSyllabusById(syllabusId);
};

/**
 * Bulk add modules to multiple syllabi by category
 * @param {Array<{syllabusId: mongoose.Types.ObjectId, category: string, moduleIds: mongoose.Types.ObjectId[]}>} bulkData
 * @returns {Promise<ISyllabusDoc[]>}
 */
export const bulkAddModulesToMultipleSyllabi = async (
  bulkData: Array<{
    syllabusId: mongoose.Types.ObjectId;
    category: 'theory' | 'technical' | 'learning';
    moduleIds: mongoose.Types.ObjectId[];
  }>
): Promise<ISyllabusDoc[]> => {
  const results: ISyllabusDoc[] = [];
  const errors: string[] = [];

  for (const data of bulkData) {
    try {
      const result = await bulkAddModulesToSyllabus(data.syllabusId, data.category, data.moduleIds);
      if (result) {
        results.push(result);
      }
    } catch (error) {
      if (error instanceof ApiError) {
        errors.push(`Syllabus ${data.syllabusId}: ${error.message}`);
      } else {
        errors.push(`Syllabus ${data.syllabusId}: Unknown error`);
      }
    }
  }

  if (errors.length > 0) {
    throw new ApiError(httpStatus.BAD_REQUEST, `Some operations failed: ${errors.join('; ')}`);
  }

  return results;
}; 