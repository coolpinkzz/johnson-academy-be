import Joi from 'joi';
import { objectId } from '../validate/custom.validation';

export const createStudentAttendanceBody = {
  studentId: Joi.string().custom(objectId).required(),
  classId: Joi.string().custom(objectId).required(),
  presentDates: Joi.array().items(Joi.date()),
  absentDates: Joi.array().items(Joi.date()),
  joiningDate: Joi.date(),
  lastDate: Joi.date(),
  classesInOneWeek: Joi.array().items(
    Joi.string().valid('Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday')
  ),
};

export const getStudentAttendance = {
  query: Joi.object().keys({
    studentId: Joi.string().custom(objectId),
    classId: Joi.string().custom(objectId),
    sortBy: Joi.string(),
    projectBy: Joi.string(),
    limit: Joi.number().integer(),
    page: Joi.number().integer(),
  }),
};

export const getStudentAttendanceById = {
  params: Joi.object().keys({
    attendanceId: Joi.string().custom(objectId),
  }),
};

export const updateStudentAttendance = {
  params: Joi.object().keys({
    attendanceId: Joi.string().custom(objectId).required(),
  }),
  body: Joi.object()
    .keys({
      studentId: Joi.string().custom(objectId),
      classId: Joi.string().custom(objectId),
      presentDates: Joi.array().items(Joi.date()),
      absentDates: Joi.array().items(Joi.date()),
      joiningDate: Joi.date(),
      lastDate: Joi.date(),
      classesInOneWeek: Joi.array().items(
        Joi.string().valid('Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday')
      ),
    })
    .min(1),
};

export const deleteStudentAttendance = {
  params: Joi.object().keys({
    attendanceId: Joi.string().custom(objectId),
  }),
};

export const getStudentAttendanceByStudentAndClass = {
  params: Joi.object().keys({
    studentId: Joi.string().custom(objectId).required(),
    classId: Joi.string().custom(objectId).required(),
  }),
};

export const getAttendanceByStudent = {
  params: Joi.object().keys({
    studentId: Joi.string().custom(objectId).required(),
  }),
};

export const getAttendanceByClass = {
  params: Joi.object().keys({
    classId: Joi.string().custom(objectId).required(),
  }),
};

export const markAttendancePresent = {
  params: Joi.object().keys({
    attendanceId: Joi.string().custom(objectId).required(),
  }),
  body: Joi.object().keys({
    studentId: Joi.string().custom(objectId).required(),
    classId: Joi.string().custom(objectId).required(),
    date: Joi.date().required(),
  }),
};

export const markAttendanceAbsent = {
  params: Joi.object().keys({
    attendanceId: Joi.string().custom(objectId).required(),
  }),
  body: Joi.object().keys({
    studentId: Joi.string().custom(objectId).required(),
    classId: Joi.string().custom(objectId).required(),
    date: Joi.date().required(),
  }),
};

export const clearAttendanceForDate = {
  params: Joi.object().keys({
    attendanceId: Joi.string().custom(objectId).required(),
  }),
  body: Joi.object().keys({
    studentId: Joi.string().custom(objectId).required(),
    classId: Joi.string().custom(objectId).required(),
    date: Joi.date().required(),
  }),
};
