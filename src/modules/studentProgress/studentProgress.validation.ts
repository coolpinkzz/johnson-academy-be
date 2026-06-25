import Joi from 'joi';
import { objectId } from '../validate/custom.validation';

const moduleProgressSchema = Joi.object({
  moduleId: Joi.string().custom(objectId).required(),
  status: Joi.string().valid('completed', 'inprogress', 'upcoming').required(),
  score: Joi.number().min(0).max(100).optional(),
  startDate: Joi.date().optional(),
  endDate: Joi.date().optional(),
  dateTakenToComplete: Joi.number().min(0).optional(),
});

const syllabusProgressSchema = Joi.object({
  syllabusId: Joi.string().custom(objectId).required(),
  modules: Joi.array().items(moduleProgressSchema).required(),
});

const createStudentProgressBody: Record<string, any> = {
  studentId: Joi.string().custom(objectId).required(),
  classId: Joi.string().custom(objectId).required(),
  courseId: Joi.string().custom(objectId).required(),
  progress: Joi.number().min(0).max(100).default(0),
  syllabusProgress: Joi.array().items(syllabusProgressSchema).required(),
  totalModules: Joi.number().min(0).required(),
  completedModules: Joi.number().min(0).default(0),
  inProgressModules: Joi.number().min(0).default(0),
  upcomingModules: Joi.number().min(0).default(0),
};

const updateStudentProgressBody: Record<string, any> = {
  studentId: Joi.string().custom(objectId).optional(),
  classId: Joi.string().custom(objectId).optional(),
  courseId: Joi.string().custom(objectId).optional(),
  progress: Joi.number().min(0).max(100).optional(),
  syllabusProgress: Joi.array().items(syllabusProgressSchema).optional(),
  totalModules: Joi.number().min(0).optional(),
  completedModules: Joi.number().min(0).optional(),
  inProgressModules: Joi.number().min(0).optional(),
  upcomingModules: Joi.number().min(0).optional(),
};

const updateModuleProgressBody: Record<string, any> = {
  moduleId: Joi.string().custom(objectId).required(),
  syllabusId: Joi.string().custom(objectId).required(),
  status: Joi.string().valid('completed', 'inprogress', 'upcoming').required(),
  score: Joi.number().min(0).max(100).optional(),
};

const startModuleBody: Record<string, any> = {
  moduleId: Joi.string().custom(objectId).required(),
  syllabusId: Joi.string().custom(objectId).required(),
};

const endModuleBody: Record<string, any> = {
  moduleId: Joi.string().custom(objectId).required(),
  syllabusId: Joi.string().custom(objectId).required(),
  score: Joi.number().min(0).max(100).required(),
};

export const createStudentProgress = {
  body: Joi.object().keys(createStudentProgressBody),
};

export const getStudentProgress = {
  query: Joi.object().keys({
    studentId: Joi.string().custom(objectId).optional(),
    classId: Joi.string().custom(objectId).optional(),
    courseId: Joi.string().custom(objectId).optional(),
    progress: Joi.number().min(0).max(100).optional(),
    sortBy: Joi.string().optional(),
    limit: Joi.number().integer().optional(),
    page: Joi.number().integer().optional(),
  }),
};

export const getStudentProgressById = {
  params: Joi.object().keys({
    studentProgressId: Joi.string().custom(objectId).required(),
  }),
};

export const updateStudentProgress = {
  params: Joi.object().keys({
    studentProgressId: Joi.string().custom(objectId).required(),
  }),
  body: Joi.object().keys(updateStudentProgressBody).min(1),
};

export const updateModuleProgress = {
  params: Joi.object().keys({
    studentProgressId: Joi.string().custom(objectId).required(),
  }),
  body: Joi.object().keys(updateModuleProgressBody),
};

export const startModule = {
  params: Joi.object().keys({
    studentProgressId: Joi.string().custom(objectId).required(),
  }),
  body: Joi.object().keys(startModuleBody),
};

export const endModule = {
  params: Joi.object().keys({
    studentProgressId: Joi.string().custom(objectId).required(),
  }),
  body: Joi.object().keys(endModuleBody),
};

export const deleteStudentProgress = {
  params: Joi.object().keys({
    studentProgressId: Joi.string().custom(objectId).required(),
  }),
};

export const getStudentProgressByStudent = {
  params: Joi.object().keys({
    studentId: Joi.string().custom(objectId).required(),
  }),
};

export const getStudentProgressByClass = {
  params: Joi.object().keys({
    classId: Joi.string().custom(objectId).required(),
  }),
};

export const getStudentProgressByCourse = {
  params: Joi.object().keys({
    courseId: Joi.string().custom(objectId).required(),
  }),
};

export const getStudentProgressByStudentAndClass = {
  params: Joi.object().keys({
    studentId: Joi.string().custom(objectId).required(),
    classId: Joi.string().custom(objectId).required(),
  }),
  query: Joi.object().keys({
    courseId: Joi.string().custom(objectId).optional(),
  }),
};

export const getClassProgressStatistics = {
  params: Joi.object().keys({
    classId: Joi.string().custom(objectId).required(),
  }),
};

export const getCourseProgressStatistics = {
  params: Joi.object().keys({
    courseId: Joi.string().custom(objectId).required(),
  }),
};
