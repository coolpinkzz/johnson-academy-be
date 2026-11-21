import Joi from 'joi';
import { password, objectId } from '../validate/custom.validation';

const createUserBody: Record<string, any> = {
  email: Joi.string().required().email(),
  password: Joi.string().required().custom(password),
  name: Joi.string().required(),
  role: Joi.string().required().valid('user', 'student', 'teacher', 'admin', 'master', 'aqsd'),
  rollNumber: Joi.string().allow(''),
  branch: Joi.string().allow(''),
  phoneNumber: Joi.string().allow(''),
  whatsappNumber: Joi.string().allow(''),
  profilePicture: Joi.string().allow(''),
  dateOfBirth: Joi.string().allow(''),
  occupation: Joi.string().allow(''),
  gender: Joi.string().allow(''),
  address: Joi.string().allow(''),
  referralSource: Joi.string().allow(''),
  referralSourceOther: Joi.string().allow(''),
  dateOfJoining: Joi.string().allow(''),
  motherName: Joi.string().allow(''),
  fatherName: Joi.string().allow(''),
  guardians: Joi.array().items(
    Joi.object({
      name: Joi.string().required(),
      relation: Joi.string().required(),
    })
  ),
  courses: Joi.array().items(
    Joi.object({
      id: Joi.string().required(),
      name: Joi.string().required(),
      instrument: Joi.string().allow(''),
    })
  ),
  emergencyContact: Joi.object({
    name: Joi.string().allow(''),
    relationship: Joi.string().allow(''),
    phone: Joi.string().allow(''),
    email: Joi.string().email().allow(''),
  }),
  isCompleteProfile: Joi.boolean(),
  isProfileCardComplete: Joi.boolean(),
};

export const createUser = {
  body: Joi.object().keys(createUserBody),
};

export const getUsers = {
  query: Joi.object().keys({
    name: Joi.string(),
    role: Joi.string(),
    feeProfileStatus: Joi.string().valid('expired', 'expiring', 'active', 'upcoming', 'none'),
    branch: Joi.string(),
    rollNumber: Joi.string(),
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
      role: Joi.string().valid('user', 'student', 'teacher', 'admin', 'master', 'aqsd'),
      isActive: Joi.boolean(),
      rollNumber: Joi.string().allow(''),
      branch: Joi.string().allow(''),
      phoneNumber: Joi.string().allow(''),
      whatsappNumber: Joi.string().allow(''),
      profilePicture: Joi.string().allow(''),
      dateOfBirth: Joi.string().allow(''),
      occupation: Joi.string().allow(''),
      gender: Joi.string().allow(''),
      address: Joi.string().allow(''),
      referralSource: Joi.string().allow(''),
      referralSourceOther: Joi.string().allow(''),
      dateOfJoining: Joi.string().allow(''),
      motherName: Joi.string().allow(''),
      fatherName: Joi.string().allow(''),
      guardians: Joi.array().items(
        Joi.object({
          name: Joi.string().required(),
          relation: Joi.string().required(),
        })
      ),
      courses: Joi.array().items(
        Joi.object({
          id: Joi.string().required(),
          name: Joi.string().required(),
          instrument: Joi.string().allow(''),
        })
      ),
      emergencyContact: Joi.object({
        name: Joi.string().allow(''),
        relationship: Joi.string().allow(''),
        phone: Joi.string().allow(''),
        email: Joi.string().email().allow(''),
      }),
      isCompleteProfile: Joi.boolean(),
      isProfileCardComplete: Joi.boolean(),
    })
    .min(1),
};

export const deleteUser = {
  params: Joi.object().keys({
    userId: Joi.string().custom(objectId),
  }),
};

export const getDeletionHistory = {
  query: Joi.object().keys({
    role: Joi.string().valid('student', 'teacher'),
  }),
};

export const restoreUser = {
  params: Joi.object().keys({
    userId: Joi.string().custom(objectId),
  }),
};
