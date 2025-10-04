import Joi from 'joi';
import { password } from '../validate/custom.validation';
import { roles } from '../../config/roles';

const registerBody = {
  email: Joi.string().required().email(),
  password: Joi.string().required().custom(password),
  name: Joi.string().required(),
  role: Joi.string()
    .required()
    .valid(...roles),
  rollNumber: Joi.string()
    .pattern(/^JA\/[A-Z]{3}\/\d{4}$/)
    .when('role', {
      is: 'student',
      then: Joi.required(),
      otherwise: Joi.optional(),
    }),
  profilePicture: Joi.string().uri().allow('').optional(),
  phoneNumber: Joi.string()
    .pattern(/^\+?[\d\s-()]+$/)
    .optional(),
  address: Joi.object({
    street: Joi.string(),
    city: Joi.string(),
    state: Joi.string(),
    zipCode: Joi.string(),
    country: Joi.string(),
  }).optional(),
  emergencyContact: Joi.object({
    name: Joi.string(),
    relationship: Joi.string(),
    phone: Joi.string().pattern(/^\+?[\d\s-()]+$/),
    email: Joi.string().email(),
  }).optional(),
};

export const register = {
  body: Joi.object().keys(registerBody),
};

export const login = {
  body: Joi.object().keys({
    email: Joi.string().required(),
    password: Joi.string().required(),
  }),
};

export const logout = {
  body: Joi.object().keys({
    refreshToken: Joi.string().required(),
  }),
};

export const refreshTokens = {
  body: Joi.object().keys({
    refreshToken: Joi.string().required(),
  }),
};

export const forgotPassword = {
  body: Joi.object().keys({
    email: Joi.string().email().required(),
  }),
};

export const resetPassword = {
  query: Joi.object().keys({
    token: Joi.string().required(),
  }),
  body: Joi.object().keys({
    password: Joi.string().required().custom(password),
  }),
};

export const verifyEmail = {
  query: Joi.object().keys({
    token: Joi.string().required(),
  }),
};
