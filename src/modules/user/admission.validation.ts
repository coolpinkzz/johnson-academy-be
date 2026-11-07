import Joi from 'joi';
import { GENDERS, REFERRAL_SOURCES } from './admission.constants';

const phoneNumber = Joi.string()
  .trim()
  .pattern(/^\+?[\d\s-()]+$/)
  .messages({
    'string.pattern.base': '{{#label}} must be a valid phone number',
  });

/** Keeps the base rules and only changes whether the field may be omitted. */
const requiredForStudent = (schema: Joi.AnySchema) =>
  schema.when('role', {
    is: 'student',
    then: Joi.required(),
    otherwise: Joi.forbidden(),
  });

/**
 * Admission details collected when a student is created.
 * Required for role `student`. Rejected for every other role.
 */
export const studentAdmissionCreateFields = {
  dateOfBirth: requiredForStudent(
    Joi.date().max('now').messages({
      'date.max': 'Date of birth must not be in the future',
    })
  ),
  occupation: requiredForStudent(Joi.string().trim().min(1).max(120)),
  whatsappNumber: requiredForStudent(phoneNumber),
  gender: requiredForStudent(Joi.string().valid(...GENDERS)),
  address: requiredForStudent(Joi.string().trim().min(1).max(500)),
  referralSource: requiredForStudent(Joi.string().valid(...REFERRAL_SOURCES)),
  referralSourceOther: Joi.when('role', {
    is: 'student',
    then: Joi.when('referralSource', {
      is: 'other',
      then: Joi.string().trim().min(1).max(200).required(),
      otherwise: Joi.string().trim().max(200).allow('').optional(),
    }),
    otherwise: Joi.forbidden(),
  }),
  dateOfJoining: requiredForStudent(
    Joi.date().min(Joi.ref('dateOfBirth')).messages({
      'date.min': 'Date of joining must be on or after date of birth',
    })
  ),
};

/** Optional on update so existing students can still be edited. */
export const studentAdmissionUpdateFields = {
  dateOfBirth: Joi.date().max('now').messages({
    'date.max': 'Date of birth must not be in the future',
  }),
  occupation: Joi.string().trim().min(1).max(120),
  whatsappNumber: phoneNumber,
  gender: Joi.string().valid(...GENDERS),
  address: Joi.string().trim().min(1).max(500),
  referralSource: Joi.string().valid(...REFERRAL_SOURCES),
  referralSourceOther: Joi.string().trim().max(200).allow('').when('referralSource', {
    is: 'other',
    then: Joi.required(),
    otherwise: Joi.optional(),
  }),
  dateOfJoining: Joi.date().when('dateOfBirth', {
    is: Joi.exist(),
    then: Joi.date().min(Joi.ref('dateOfBirth')).messages({
      'date.min': 'Date of joining must be on or after date of birth',
    }),
    otherwise: Joi.date(),
  }),
};
