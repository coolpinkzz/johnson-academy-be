import Joi from 'joi';
import { objectId } from '../validate/custom.validation';
import { NewCreatedModule } from './module.interfaces';

const moduleResourceSchema = Joi.object({
  file: Joi.string().required(),
  key: Joi.string().allow('').optional(),
});

const createModuleBody: Record<keyof NewCreatedModule, any> = {
  syllabusId: Joi.string().custom(objectId).allow('').optional(),
  type: Joi.string().valid('theory', 'technical', 'learning', 'others').required(),
  title: Joi.string().required(),
  description: Joi.string().required(),
  session: Joi.number().integer().min(1).required(),
  seq: Joi.number().integer().min(1).optional(),
  resources: Joi.array().items(moduleResourceSchema),
};

export const createModule = {
  body: Joi.object().keys(createModuleBody),
};

export const createModulesBulk = {
  body: Joi.array().items(Joi.object().keys(createModuleBody)).min(1).max(100),
};

export const getModules = {
  query: Joi.object().keys({
    title: Joi.string(),
    type: Joi.string().valid('theory', 'technical', 'learning', 'others'),
    syllabusId: Joi.string().custom(objectId),
    sortBy: Joi.string(),
    projectBy: Joi.string(),
    limit: Joi.number().integer(),
    page: Joi.number().integer(),
  }),
};

export const getModule = {
  params: Joi.object().keys({
    moduleId: Joi.string().custom(objectId),
  }),
};

export const updateModule = {
  params: Joi.object().keys({
    moduleId: Joi.string().custom(objectId).required(),
  }),
  body: Joi.object()
    .keys({
      syllabusId: Joi.string().custom(objectId),
      type: Joi.string().valid('theory', 'technical', 'learning', 'others'),
      title: Joi.string(),
      description: Joi.string(),
      session: Joi.number().integer().min(1),
      seq: Joi.number().integer().min(1),
      resources: Joi.array().items(moduleResourceSchema),
    })
    .min(1),
};

export const deleteModule = {
  params: Joi.object().keys({
    moduleId: Joi.string().custom(objectId),
  }),
};

export const getModulesBySyllabus = {
  params: Joi.object().keys({
    syllabusId: Joi.string().custom(objectId).required(),
  }),
};

export const getModulesByType = {
  params: Joi.object().keys({
    type: Joi.string().valid('theory', 'technical', 'learning', 'others').required(),
  }),
};
