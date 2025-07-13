import Joi from 'joi';
import { objectId } from '../validate/custom.validation';
import { NewCreatedCourse } from './course.interfaces';

const createCourseBody: Record<keyof NewCreatedCourse, any> = {
  name: Joi.string().required(),
  description: Joi.string().required(),
  image: Joi.string().optional(),
};

export const createCourse = {
  body: Joi.object().keys(createCourseBody),
};

export const getCourses = {
  query: Joi.object().keys({
    name: Joi.string(),
    sortBy: Joi.string(),
    projectBy: Joi.string(),
    limit: Joi.number().integer(),
    page: Joi.number().integer(),
  }),
};

export const getCourse = {
  params: Joi.object().keys({
    courseId: Joi.string().custom(objectId),
  }),
};

export const updateCourse = {
  params: Joi.object().keys({
    courseId: Joi.required().custom(objectId),
  }),
  body: Joi.object()
    .keys({
      name: Joi.string(),
      description: Joi.string(),
      syllabus: Joi.array().items(Joi.string().custom(objectId)).optional(),
    })
    .min(1),
};

export const deleteCourse = {
  params: Joi.object().keys({
    courseId: Joi.string().custom(objectId),
  }),
};



export const addSyllabusToCourse = {
  params: Joi.object().keys({
    courseId: Joi.string().required().custom(objectId),
    syllabusId: Joi.string().required().custom(objectId),
  }),
};

export const removeSyllabusFromCourse = {
  params: Joi.object().keys({
    courseId: Joi.string().required().custom(objectId),
    syllabusId: Joi.string().required().custom(objectId),
  }),
}; 