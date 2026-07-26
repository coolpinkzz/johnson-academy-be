import Joi from 'joi';
import { objectId } from '../validate/custom.validation';

const scoreMessages = (label: string) => ({
  'number.base': `${label} must be a number`,
  'number.integer': `${label} must be an integer`,
  'number.min': `${label} must be at least 2`,
  'number.max': `${label} must be at most 5`,
  'any.required': `${label} is required`,
});

const requiredScore = (label: string) =>
  Joi.number().integer().min(2).max(5).required().messages(scoreMessages(label));

const optionalScore = (label: string) =>
  Joi.number().integer().min(2).max(5).optional().messages(scoreMessages(label));

export const createMRT = {
  body: Joi.object().keys({
    month: Joi.string()
      .required()
      .pattern(/^(0[1-9]|1[0-2])-\d{4}$|^\d{4}-(0[1-9]|1[0-2])$/)
      .message('Month must be in format MM-YYYY or YYYY-MM'),
    classId: Joi.string().custom(objectId).required(),
    studentId: Joi.string().custom(objectId).required(),
    courseId: Joi.string().custom(objectId).required(),
    regularity: requiredScore('Regularity'),
    learningSpeed: requiredScore('Learning Speed'),
    theory: requiredScore('Theory'),
    technicalExercises: requiredScore('Technical Exercises'),
    repertoireRhythmSense: requiredScore('Repertoire (Rhythm Sense)'),
    repertoireDynamics: requiredScore('Repertoire (Dynamics)'),
    remarks: Joi.string().max(500).optional(),
  }),
};

export const getMRT = {
  params: Joi.object().keys({
    mrtId: Joi.string().custom(objectId).required(),
  }),
};

export const updateMRT = {
  params: Joi.object().keys({
    mrtId: Joi.string().custom(objectId).required(),
  }),
  body: Joi.object()
    .keys({
      regularity: optionalScore('Regularity'),
      learningSpeed: optionalScore('Learning Speed'),
      theory: optionalScore('Theory'),
      technicalExercises: optionalScore('Technical Exercises'),
      repertoireRhythmSense: optionalScore('Repertoire (Rhythm Sense)'),
      repertoireDynamics: optionalScore('Repertoire (Dynamics)'),
      remarks: Joi.string().max(500).optional(),
    })
    .min(1), // At least one field must be provided
};

export const deleteMRT = {
  params: Joi.object().keys({
    mrtId: Joi.string().custom(objectId).required(),
  }),
};

export const getMRTsByStudent = {
  params: Joi.object().keys({
    studentId: Joi.string().custom(objectId).required(),
  }),
  query: Joi.object().keys({
    courseId: Joi.string().custom(objectId).optional(),
    limit: Joi.number().integer().min(1).max(100).default(10),
    page: Joi.number().integer().min(1).default(1),
    sortBy: Joi.string().valid('month', 'createdAt', 'updatedAt').default('month'),
    sortOrder: Joi.string().valid('asc', 'desc').default('desc'),
  }),
};

export const getMRTsByClass = {
  params: Joi.object().keys({
    classId: Joi.string().custom(objectId).required(),
  }),
  query: Joi.object().keys({
    courseId: Joi.string().custom(objectId).optional(),
    limit: Joi.number().integer().min(1).max(100).default(10),
    page: Joi.number().integer().min(1).default(1),
    sortBy: Joi.string().valid('month', 'studentId', 'createdAt').default('month'),
    sortOrder: Joi.string().valid('asc', 'desc').default('desc'),
  }),
};

export const getMRTsByMonth = {
  params: Joi.object().keys({
    month: Joi.string()
      .required()
      .pattern(/^(0[1-9]|1[0-2])-\d{4}$|^\d{4}-(0[1-9]|1[0-2])$/)
      .message('Month must be in format MM-YYYY or YYYY-MM'),
  }),
  query: Joi.object().keys({
    limit: Joi.number().integer().min(1).max(100).default(10),
    page: Joi.number().integer().min(1).default(1),
    sortBy: Joi.string().valid('classId', 'studentId', 'createdAt').default('classId'),
    sortOrder: Joi.string().valid('asc', 'desc').default('asc'),
  }),
};

export const getMRTByStudentClassMonth = {
  params: Joi.object().keys({
    studentId: Joi.string().custom(objectId).required(),
    classId: Joi.string().custom(objectId).required(),
    month: Joi.string()
      .required()
      .pattern(/^(0[1-9]|1[0-2])-\d{4}$|^\d{4}-(0[1-9]|1[0-2])$/)
      .message('Month must be in format MM-YYYY or YYYY-MM'),
  }),
  query: Joi.object().keys({
    courseId: Joi.string().custom(objectId).required(),
  }),
};
