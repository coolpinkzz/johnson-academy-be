import Joi from 'joi';
import { objectId } from '../validate/custom.validation';
import { NewCreatedClasses } from './classes.interfaces';

const createClassesBody: Record<keyof NewCreatedClasses, any> = {
  name: Joi.string().required(),
  teacherId: Joi.string().required(),
  courseId: Joi.string().required(),
  students: Joi.array().items(Joi.string()).optional(),
};

export const createClasses = {
  body: Joi.object().keys(createClassesBody),
};

export const getClasses = {
  query: Joi.object().keys({
    teacherId: Joi.string().custom(objectId),
    courseId: Joi.string().custom(objectId),
    name: Joi.string(),
    sortBy: Joi.string(),
    projectBy: Joi.string(),
    limit: Joi.number().integer(),
    page: Joi.number().integer(),
  }),
};

export const getClass = {
  params: Joi.object().keys({
    classesId: Joi.string().custom(objectId).required(),
  }),
};

export const getClassesByTeacher = {
  params: Joi.object().keys({
    teacherId: Joi.string().custom(objectId).required(),
  }),
};

export const getClassesByCourse = {
  params: Joi.object().keys({
    courseId: Joi.string().custom(objectId).required(),
  }),
};

export const getClassesByStudent = {
  params: Joi.object().keys({
    studentId: Joi.string().custom(objectId).required(),
  }),
};

export const updateClasses = {
  params: Joi.object().keys({
    classesId: Joi.string().custom(objectId).required(),
  }),
  body: Joi.object()
    .keys({
      name: Joi.string(),
      teacherId: Joi.string().custom(objectId),
      courseId: Joi.string().custom(objectId),
      students: Joi.array().items(Joi.string().custom(objectId)),
    })
    .min(1),
};

export const deleteClasses = {
  params: Joi.object().keys({
    classesId: Joi.string().custom(objectId).required(),
  }),
};

export const bulkAddStudentsToClass = {
  params: Joi.object().keys({
    classesId: Joi.string().custom(objectId).required(),
  }),
  body: Joi.object().keys({
    studentIds: Joi.array().items(Joi.string().custom(objectId)).min(1).required(),
  }),
};
