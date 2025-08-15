import Joi from 'joi';
import { objectId } from '../validate/custom.validation';

export const createMRT = {
  body: Joi.object().keys({
    month: Joi.string()
      .required()
      .pattern(/^(0[1-9]|1[0-2])-\d{4}$|^\d{4}-(0[1-9]|1[0-2])$/)
      .message('Month must be in format MM-YYYY or YYYY-MM'),
    classId: Joi.string().custom(objectId).required(),
    studentId: Joi.string().custom(objectId).required(),
    sptAndFileSubmission: Joi.number().integer().min(0).max(100).required().messages({
      'number.base': 'SPT & File Submission must be a number',
      'number.integer': 'SPT & File Submission must be an integer',
      'number.min': 'SPT & File Submission must be at least 0',
      'number.max': 'SPT & File Submission must be at most 100',
      'any.required': 'SPT & File Submission is required',
    }),
    regularity: Joi.number().integer().min(0).max(100).required().messages({
      'number.base': 'Regularity must be a number',
      'number.integer': 'Regularity must be an integer',
      'number.min': 'Regularity must be at least 0',
      'number.max': 'Regularity must be at most 100',
      'any.required': 'Regularity is required',
    }),
    learningSpeed: Joi.number().integer().min(0).max(100).required().messages({
      'number.base': 'Learning Speed must be a number',
      'number.integer': 'Learning Speed must be an integer',
      'number.min': 'Learning Speed must be at least 0',
      'number.max': 'Learning Speed must be at most 100',
      'any.required': 'Learning Speed is required',
    }),
    songLearning: Joi.number().integer().min(0).max(100).required().messages({
      'number.base': 'Song Learning must be a number',
      'number.integer': 'Song Learning must be an integer',
      'number.min': 'Song Learning must be at least 0',
      'number.max': 'Song Learning must be at most 100',
      'any.required': 'Song Learning is required',
    }),
    assignment: Joi.number().integer().min(0).max(100).required().messages({
      'number.base': 'Assignment must be a number',
      'number.integer': 'Assignment must be an integer',
      'number.min': 'Assignment must be at least 0',
      'number.max': 'Assignment must be at most 100',
      'any.required': 'Assignment is required',
    }),
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
      sptAndFileSubmission: Joi.number().integer().min(0).max(100).optional().messages({
        'number.base': 'SPT & File Submission must be a number',
        'number.integer': 'SPT & File Submission must be an integer',
        'number.min': 'SPT & File Submission must be at least 0',
        'number.max': 'SPT & File Submission must be at most 100',
      }),
      regularity: Joi.number().integer().min(0).max(100).optional().messages({
        'number.base': 'Regularity must be a number',
        'number.integer': 'Regularity must be an integer',
        'number.min': 'Regularity must be at least 0',
        'number.max': 'Regularity must be at most 100',
      }),
      learningSpeed: Joi.number().integer().min(0).max(100).optional().messages({
        'number.base': 'Learning Speed must be a number',
        'number.integer': 'Learning Speed must be an integer',
        'number.min': 'Learning Speed must be at least 0',
        'number.max': 'Learning Speed must be at most 100',
      }),
      songLearning: Joi.number().integer().min(0).max(100).optional().messages({
        'number.base': 'Song Learning must be a number',
        'number.integer': 'Song Learning must be an integer',
        'number.min': 'Song Learning must be at least 0',
        'number.max': 'Song Learning must be at most 100',
      }),
      assignment: Joi.number().integer().min(0).max(100).optional().messages({
        'number.base': 'Assignment must be a number',
        'number.integer': 'Assignment must be an integer',
        'number.min': 'Assignment must be at least 0',
        'number.max': 'Assignment must be at most 100',
      }),
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
