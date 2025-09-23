import Joi from 'joi';
import { objectId } from '../validate/custom.validation';
import { NewCreatedSyllabus } from './syllabus.interfaces';

const createSyllabusBody: Record<keyof NewCreatedSyllabus, any> = {
  courseId: Joi.string().custom(objectId).required(),
  title: Joi.string().required(),
  description: Joi.string().required(),
};

export const createSyllabus = {
  body: Joi.object().keys(createSyllabusBody),
};

export const getSyllabi = {
  query: Joi.object().keys({
    courseId: Joi.string().custom(objectId),
    title: Joi.string(),
    sortBy: Joi.string(),
    projectBy: Joi.string(),
    limit: Joi.number().integer(),
    page: Joi.number().integer(),
  }),
};

export const getSyllabus = {
  params: Joi.object().keys({
    syllabusId: Joi.string().custom(objectId).required(),
  }),
};

export const getSyllabusByCourse = {
  params: Joi.object().keys({
    courseId: Joi.string().custom(objectId).required(),
  }),
};

export const updateSyllabus = {
  params: Joi.object().keys({
    syllabusId: Joi.string().custom(objectId).required(),
  }),
  body: Joi.object()
    .keys({
      courseId: Joi.string().custom(objectId),
      title: Joi.string(),
      description: Joi.string(),
      theory: Joi.array().items(Joi.string().custom(objectId)),
      technical: Joi.array().items(Joi.string().custom(objectId)),
      learning: Joi.array().items(Joi.string().custom(objectId)),
      others: Joi.array().items(Joi.string().custom(objectId)),
    })
    .min(1),
};

export const deleteSyllabus = {
  params: Joi.object().keys({
    syllabusId: Joi.string().custom(objectId).required(),
  }),
};

export const bulkAddModulesToSyllabus = {
  params: Joi.object().keys({
    syllabusId: Joi.string().custom(objectId).required(),
  }),
  body: Joi.object().keys({
    category: Joi.string().valid('theory', 'technical', 'learning', 'others').required(),
    moduleIds: Joi.array().items(Joi.string().custom(objectId)).min(1).required(),
  }),
};

export const bulkAddModulesToMultipleSyllabi = {
  body: Joi.object().keys({
    bulkData: Joi.array()
      .items(
        Joi.object().keys({
          syllabusId: Joi.string().custom(objectId).required(),
          category: Joi.string().valid('theory', 'technical', 'learning', 'others').required(),
          moduleIds: Joi.array().items(Joi.string().custom(objectId)).min(1).required(),
        })
      )
      .min(1)
      .required(),
  }),
};
