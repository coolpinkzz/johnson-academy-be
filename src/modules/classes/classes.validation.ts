import Joi from 'joi';
import { objectId } from '../validate/custom.validation';
import { BRANCH_QUERY_VALUES } from '../user/rollNumber.util';
import { CLASS_WEEKDAYS } from './classes.interfaces';

const teachersJoi = Joi.array().items(Joi.string().custom(objectId));

const hhMm = Joi.string().pattern(/^([01]\d|2[0-3]):([0-5]\d)$/).messages({
  'string.pattern.base': 'Time must be in HH:mm 24-hour format',
});

const scheduleDefaultsFields = {
  defaultWeekdays: Joi.array()
    .items(Joi.string().valid(...CLASS_WEEKDAYS))
    .unique()
    .optional(),
  defaultStartTime: hhMm.optional(),
  defaultEndTime: hhMm.optional(),
};

const optionalMetaFields = {
  branch: Joi.string()
    .valid(...BRANCH_QUERY_VALUES)
    .optional(),
  academicYear: Joi.string().trim().max(32).optional(),
  notes: Joi.string().trim().allow('').optional(),
  sessionCapacity: Joi.number().integer().min(1).optional(),
};

const assertScheduleTimesBothPresent = (value: Record<string, unknown>, helpers: Joi.CustomHelpers) => {
  const start = value['defaultStartTime'] as string | undefined;
  const end = value['defaultEndTime'] as string | undefined;
  if (start == null && end == null) return value;
  if (start == null || end == null) {
    return helpers.message({ custom: 'defaultStartTime and defaultEndTime must both be provided' });
  }
  const [sh, sm] = start.split(':').map(Number);
  const [eh, em] = end.split(':').map(Number);
  if (sh! * 60 + sm! >= eh! * 60 + em!) {
    return helpers.message({ custom: 'defaultStartTime must be before defaultEndTime' });
  }
  return value;
};

/** On update, only validate the pair when both times are in the payload; service merges with existing. */
const assertScheduleTimesIfBothInPayload = (value: Record<string, unknown>, helpers: Joi.CustomHelpers) => {
  const hasStart = Object.prototype.hasOwnProperty.call(value, 'defaultStartTime');
  const hasEnd = Object.prototype.hasOwnProperty.call(value, 'defaultEndTime');
  if (hasStart && hasEnd) {
    return assertScheduleTimesBothPresent(value, helpers);
  }
  return value;
};

const createClassesBody = {
  name: Joi.string().required(),
  teachers: teachersJoi,
  teacherId: Joi.string().custom(objectId),
  courseId: Joi.string().custom(objectId).optional(),
  students: Joi.array().items(Joi.string().custom(objectId)).optional(),
  studentsInClass: Joi.array()
    .items(
      Joi.object({
        user: Joi.string().custom(objectId),
        course: Joi.string().custom(objectId),
      })
    )
    .optional(),
  ...optionalMetaFields,
  ...scheduleDefaultsFields,
};

export const createClasses = {
  body: Joi.object()
    .keys(createClassesBody)
    .custom((value, helpers) => {
      const hasTeachers = Array.isArray(value.teachers) && value.teachers.length > 0;
      if (!(hasTeachers || value.teacherId)) {
        return helpers.message({ custom: 'Provide teachers (non-empty array) or legacy teacherId' });
      }
      return assertScheduleTimesBothPresent(value, helpers);
    }),
};

export const getClasses = {
  query: Joi.object().keys({
    teacherId: Joi.string().custom(objectId),
    teachers: Joi.string().custom(objectId),
    courseId: Joi.string().custom(objectId),
    name: Joi.string(),
    branch: Joi.string().valid(...BRANCH_QUERY_VALUES),
    academicYear: Joi.string(),
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
      studentsInClass: Joi.array()
        .items(
          Joi.object({
            user: Joi.string().custom(objectId).required(),
            course: Joi.string().custom(objectId).required(),
          })
        )
        .optional(),
      ...optionalMetaFields,
      ...scheduleDefaultsFields,
    })
    .min(1)
    .custom((value, helpers) => assertScheduleTimesIfBothInPayload(value, helpers)),
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
