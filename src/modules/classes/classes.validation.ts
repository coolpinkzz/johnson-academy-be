import Joi from 'joi';
import { objectId } from '../validate/custom.validation';

const teachersJoi = Joi.array().items(Joi.string().custom(objectId));

const createClassesBody = {
  name: Joi.string().required(),
  teachers: teachersJoi,
  teacherId: Joi.string().custom(objectId),
  studentsInClass: Joi.array()
    .items(
      Joi.object({
        user: Joi.string().custom(objectId),
        course: Joi.string().custom(objectId),
      })
    )
    .optional(),
};

export const createClasses = {
  body: Joi.object()
    .keys(createClassesBody)
    .custom((value, helpers) => {
      const hasTeachers = Array.isArray(value.teachers) && value.teachers.length > 0;
      if (hasTeachers || value.teacherId) {
        return value;
      }
      return helpers.error('any.custom');
    })
    .messages({
      'any.custom': 'Provide teachers (non-empty array) or legacy teacherId',
    }),
};

export const getClasses = {
  query: Joi.object().keys({
    teacherId: Joi.string().custom(objectId),
    teachers: Joi.string().custom(objectId),
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
      teachers: Joi.array().items(Joi.string().custom(objectId)).min(1),
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

export const addSingleStudentToClass = {
  params: Joi.object().keys({
    classesId: Joi.string().custom(objectId).required(),
  }),
  body: Joi.object().keys({
    studentId: Joi.string().custom(objectId).required(),
    courseId: Joi.string().custom(objectId).required(),
  }),
};

export const getStudentPromotionsInClass = {
  params: Joi.object().keys({
    classesId: Joi.string().custom(objectId).required(),
    studentId: Joi.string().custom(objectId).required(),
  }),
};

export const promoteStudentInClass = {
  params: Joi.object().keys({
    classesId: Joi.string().custom(objectId).required(),
  }),
  body: Joi.object().keys({
    studentId: Joi.string().custom(objectId).required(),
    courseId: Joi.string().custom(objectId).required().description('Current course the student is enrolled in'),
  }),
};

export const removeStudentFromClass = {
  params: Joi.object().keys({
    classesId: Joi.string().custom(objectId).required(),
  }),
  body: Joi.object().keys({
    studentId: Joi.string().custom(objectId).required(),
    courseId: Joi.string().custom(objectId).required(),
  }),
};
