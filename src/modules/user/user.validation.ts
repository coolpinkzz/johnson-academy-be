import Joi from 'joi';
import { password, objectId } from '../validate/custom.validation';
import { NewCreatedUser } from './user.interfaces';

const createUserBody: Record<keyof Omit<NewCreatedUser, 'classes' | 'courses' | 'progress'>, any> = {
  email: Joi.string().required().email(),
  password: Joi.string().required().custom(password),
  name: Joi.string().required(),
  role: Joi.string().required().valid('admin', 'teacher', 'student'),
  roleNumber: Joi.string()
    .pattern(/^JA\/[A-Z]{3}\/\d{6}$/)
    .optional(),
  studentId: Joi.string().when('role', {
    is: 'student',
    then: Joi.required(),
    otherwise: Joi.forbidden(),
  }),
  teacherId: Joi.string().when('role', {
    is: 'teacher',
    then: Joi.required(),
    otherwise: Joi.forbidden(),
  }),
  department: Joi.string().when('role', {
    is: Joi.string().valid('teacher', 'admin'),
    then: Joi.required(),
    otherwise: Joi.optional(),
  }),
  gradeLevel: Joi.string().when('role', {
    is: 'student',
    then: Joi.required(),
    otherwise: Joi.optional(),
  }),
  subjects: Joi.array().items(Joi.string()),
  enrollmentDate: Joi.date().when('role', {
    is: 'student',
    then: Joi.required(),
    otherwise: Joi.optional(),
  }),
  graduationDate: Joi.date(),
  isActive: Joi.boolean(),
  profilePicture: Joi.string().uri(),
  phoneNumber: Joi.string().pattern(/^\+?[\d\s-()]+$/),
  address: Joi.object({
    street: Joi.string(),
    city: Joi.string(),
    state: Joi.string(),
    zipCode: Joi.string(),
    country: Joi.string(),
  }),
  emergencyContact: Joi.object({
    name: Joi.string(),
    relationship: Joi.string(),
    phone: Joi.string().pattern(/^\+?[\d\s-()]+$/),
    email: Joi.string().email(),
  }),
};

export const createUser = {
  body: Joi.object().keys(createUserBody),
};

export const getUsers = {
  query: Joi.object().keys({
    name: Joi.string().allow(''),
    role: Joi.string().valid('admin', 'teacher', 'student'),
    department: Joi.string(),
    gradeLevel: Joi.string(),
    isActive: Joi.boolean(),
    sortBy: Joi.string(),
    projectBy: Joi.string(),
    limit: Joi.number().integer(),
    page: Joi.number().integer(),
  }),
};

export const getUser = {
  params: Joi.object().keys({
    userId: Joi.string().custom(objectId),
  }),
};

export const updateUser = {
  params: Joi.object().keys({
    userId: Joi.required().custom(objectId),
  }),
  body: Joi.object()
    .keys({
      email: Joi.string().email(),
      password: Joi.string().custom(password),
      name: Joi.string(),
      role: Joi.string().valid('admin', 'teacher', 'student'),
      roleNumber: Joi.string().pattern(/^JA\/[A-Z]{3}\/\d{6}$/),
      studentId: Joi.string(),
      teacherId: Joi.string(),
      department: Joi.string(),
      gradeLevel: Joi.string(),
      subjects: Joi.array().items(Joi.string()),
      enrollmentDate: Joi.date(),
      graduationDate: Joi.date(),
      isActive: Joi.boolean(),
      profilePicture: Joi.string().uri(),
      phoneNumber: Joi.string().pattern(/^\+?[\d\s-()]+$/),
      address: Joi.object({
        street: Joi.string(),
        city: Joi.string(),
        state: Joi.string(),
        zipCode: Joi.string(),
        country: Joi.string(),
      }),
      emergencyContact: Joi.object({
        name: Joi.string(),
        relationship: Joi.string(),
        phone: Joi.string().pattern(/^\+?[\d\s-()]+$/),
        email: Joi.string().email(),
      }),
    })
    .min(1),
};

export const deleteUser = {
  params: Joi.object().keys({
    userId: Joi.string().custom(objectId),
  }),
};

export const getUsersByRole = {
  query: Joi.object().keys({
    role: Joi.string().required().valid('admin', 'teacher', 'student'),
  }),
};

export const getStudentsByGradeLevel = {
  query: Joi.object().keys({
    gradeLevel: Joi.string().required(),
  }),
};

export const getTeachersByDepartment = {
  query: Joi.object().keys({
    department: Joi.string().required(),
  }),
};
