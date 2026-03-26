import mongoose from 'mongoose';
import httpStatus from 'http-status';
import { IModuleDoc, NewCreatedModule, UpdateModuleBody } from './module.interfaces';
import Module from './module.model';
import Syllabus from '../syllabus/syllabus.model';
import ApiError from '../errors/ApiError';
import { QueryResult } from '../paginate/paginate';

/**
 * Create a module
 * @param {NewCreatedModule} moduleBody
 * @returns {Promise<IModuleDoc>}
 */
export const createModule = async (moduleBody: NewCreatedModule): Promise<IModuleDoc> => {
  // syllabus is optional
  return Module.create(moduleBody);
};

/**
 * Create multiple modules in bulk
 * @param {NewCreatedModule[]} moduleBodies
 * @returns {Promise<IModuleDoc[]>}
 */
export const createModulesBulk = async (moduleBodies: NewCreatedModule[]): Promise<IModuleDoc[]> => {
  if (!moduleBodies || moduleBodies.length === 0) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'No modules provided');
  }

  // Validate that all syllabi exist
  const syllabusIds = [...new Set(moduleBodies.map((module) => module.syllabusId))];
  const existingSyllabi = await Syllabus.find({
    _id: { $in: syllabusIds },
  });

  if (existingSyllabi.length !== syllabusIds.length) {
    const existingSyllabusIds = existingSyllabi.map((syllabus) => syllabus._id.toString());
    const missingSyllabusIds = syllabusIds.filter((id) => id && !existingSyllabusIds.includes(id.toString()));
    throw new ApiError(httpStatus.NOT_FOUND, `Syllabi not found: ${missingSyllabusIds.join(', ')}`);
  }

  // Create all modules
  const createdModules = await Module.insertMany(moduleBodies);
  return createdModules;
};

/**
 * Query for modules
 * @param {Object} filter - Mongo filter
 * @param {Object} options - Query options
 * @param {string} [options.sortBy] - Sort option in the format: sortField:(desc|asc)
 * @param {number} [options.limit] - Maximum number of results per page (default = 10)
 * @param {number} [options.page] - Current page (default = 1)
 * @returns {Promise<QueryResult>}
 */
export const queryModules = async (filter: Record<string, any>, options: Record<string, any>): Promise<QueryResult> => {
  // Transform the filter to handle partial title matching
  const transformedFilter = { ...filter };

  if (transformedFilter['title']) {
    // Convert title filter to case-insensitive regex for partial matching
    transformedFilter['title'] = { $regex: transformedFilter['title'], $options: 'i' };
  }

  // Default sort by seq ascending
  const paginateOptions = { sortBy: 'seq:asc', ...options };
  const modules = await Module.paginate(transformedFilter, paginateOptions);
  return modules;
};

/**
 * Get module by id
 * @param {mongoose.Types.ObjectId} id
 * @returns {Promise<IModuleDoc | null>}
 */
export const getModuleById = async (id: mongoose.Types.ObjectId): Promise<IModuleDoc | null> => {
  return Module.findById(id);
};

/**
 * Get module by id with populated syllabus
 * @param {mongoose.Types.ObjectId} id
 * @returns {Promise<IModuleDoc | null>}
 */
export const getModuleByIdWithSyllabus = async (id: mongoose.Types.ObjectId): Promise<IModuleDoc | null> => {
  return Module.findById(id).populate('syllabusId');
};

/**
 * Update module by id
 * @param {mongoose.Types.ObjectId} moduleId
 * @param {UpdateModuleBody} updateBody
 * @returns {Promise<IModuleDoc | null>}
 */
export const updateModuleById = async (
  moduleId: mongoose.Types.ObjectId,
  updateBody: UpdateModuleBody
): Promise<IModuleDoc | null> => {
  const module = await getModuleById(moduleId);
  if (!module) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Module not found');
  }

  // Validate syllabusId if it's being updated
  if (updateBody.syllabusId) {
    const syllabus = await Syllabus.findById(updateBody.syllabusId);
    if (!syllabus) {
      throw new ApiError(httpStatus.NOT_FOUND, 'Syllabus not found');
    }
  }

  Object.assign(module, updateBody);
  await module.save();
  return module;
};

/**
 * Delete module by id
 * @param {mongoose.Types.ObjectId} moduleId
 * @returns {Promise<IModuleDoc | null>}
 */
export const deleteModuleById = async (moduleId: mongoose.Types.ObjectId): Promise<IModuleDoc | null> => {
  const module = await getModuleById(moduleId);
  if (!module) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Module not found');
  }
  await module.deleteOne();
  return module;
};

/**
 * Get modules by syllabus ID
 * @param {mongoose.Types.ObjectId} syllabusId
 * @returns {Promise<IModuleDoc[]>}
 */
export const getModulesBySyllabusId = async (syllabusId: mongoose.Types.ObjectId): Promise<IModuleDoc[]> => {
  return Module.find({ syllabusId }).sort({ session: 1 });
};

/**
 * Get modules by type
 * @param {string} type
 * @returns {Promise<IModuleDoc[]>}
 */
export const getModulesByType = async (type: 'theory' | 'technical' | 'learning' | 'others'): Promise<IModuleDoc[]> => {
  return Module.find({ type }).populate('syllabusId');
};
