import Joi from 'joi';
import { objectId } from '../validate/custom.validation';
import { NewCreatedAssignment } from './assignment.interfaces';

const createAssignmentBody: Record<keyof NewCreatedAssignment, any> = {
  title: Joi.string().required(),
  description: Joi.string().required(),
  attachments: Joi.array().items(Joi.string()).optional(),
  status: Joi.string().valid('assigned', 'submitted', 'graded').optional(),
  students: Joi.array().items(Joi.string().custom(objectId)).optional(),
  classId: Joi.string().custom(objectId).required(),
  teacherId: Joi.string().custom(objectId).required(),
  submissions: Joi.array()
    .items(
      Joi.object({
        student: Joi.string().custom(objectId).required(),
        submittedAt: Joi.date().optional(),
        fileUrl: Joi.string().optional(),
        grade: Joi.number().integer().min(1).max(5).optional(),
        feedback: Joi.string().optional(),
      })
    )
    .optional(),
  dueDate: Joi.date().required(),
  createdBy: Joi.string().custom(objectId).required(),
};

export const createAssignment = {
  body: Joi.object().keys(createAssignmentBody),
};

export const getAssignments = {
  query: Joi.object().keys({
    students: Joi.string().custom(objectId),
    classId: Joi.string().custom(objectId),
    teacherId: Joi.string().custom(objectId),
    status: Joi.string().valid('assigned', 'submitted', 'graded'),
    title: Joi.string(),
    sortBy: Joi.string(),
    projectBy: Joi.string(),
    limit: Joi.number().integer(),
    page: Joi.number().integer(),
  }),
};

export const getAssignment = {
  params: Joi.object().keys({
    assignmentId: Joi.string().custom(objectId).required(),
  }),
};

export const getAssignmentsByStudent = {
  params: Joi.object().keys({
    studentId: Joi.string().custom(objectId).required(),
  }),
};

export const getAssignmentsByClass = {
  params: Joi.object().keys({
    classId: Joi.string().custom(objectId).required(),
  }),
};

export const getAssignmentsByTeacher = {
  params: Joi.object().keys({
    teacherId: Joi.string().custom(objectId).required(),
  }),
};

export const updateAssignment = {
  params: Joi.object().keys({
    assignmentId: Joi.string().custom(objectId).required(),
  }),
  body: Joi.object()
    .keys({
      title: Joi.string(),
      description: Joi.string(),
      attachments: Joi.array().items(Joi.string()),
      status: Joi.string().valid('assigned', 'submitted', 'graded'),
      students: Joi.array().items(Joi.string().custom(objectId)),
      classId: Joi.string().custom(objectId),
      teacherId: Joi.string().custom(objectId),
      dueDate: Joi.date(),
      submissions: Joi.array().items(
        Joi.object({
          student: Joi.string().custom(objectId).required(),
          submittedAt: Joi.date().optional(),
          fileUrl: Joi.string().optional(),
          grade: Joi.number().integer().min(1).max(5).optional(),
          feedback: Joi.string().optional(),
        })
      ),
    })
    .min(1),
};

export const deleteAssignment = {
  params: Joi.object().keys({
    assignmentId: Joi.string().custom(objectId).required(),
  }),
};

export const submitAssignment = {
  params: Joi.object().keys({
    assignmentId: Joi.string().custom(objectId).required(),
  }),
  body: Joi.object().keys({
    fileUrl: Joi.string().required(),
  }),
};

export const gradeAssignment = {
  params: Joi.object().keys({
    assignmentId: Joi.string().custom(objectId).required(),
  }),
  body: Joi.object().keys({
    studentId: Joi.string().custom(objectId).required(),
    grade: Joi.number().integer().min(1).max(5).required(),
    feedback: Joi.string().optional(),
  }),
};

export const updateSubmission = {
  params: Joi.object().keys({
    assignmentId: Joi.string().custom(objectId).required(),
  }),
  body: Joi.object().keys({
    studentId: Joi.string().custom(objectId).required(),
    fileUrl: Joi.string().optional(),
    grade: Joi.number().integer().min(1).max(5).optional(),
    feedback: Joi.string().optional(),
  }),
};

export const getAssignmentsByClassAndStudent = {
  params: Joi.object().keys({
    classId: Joi.string().custom(objectId).required(),
    studentId: Joi.string().custom(objectId).required(),
  }),
};
