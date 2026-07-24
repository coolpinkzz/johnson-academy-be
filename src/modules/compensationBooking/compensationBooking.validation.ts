import Joi from 'joi';
import { objectId } from '../validate/custom.validation';
import { BRANCH_QUERY_VALUES } from '../user/rollNumber.util';
import { COMPENSATION_BOOKING_STATUSES } from './compensationBooking.interfaces';

const ymd = Joi.string()
  .pattern(/^\d{4}-\d{2}-\d{2}$/)
  .messages({ 'string.pattern.base': 'Date must be YYYY-MM-DD' });

export const listAvailableClasses = {
  query: Joi.object().keys({
    date: ymd.required(),
    branch: Joi.string().valid(...BRANCH_QUERY_VALUES),
    excludeClassId: Joi.string().custom(objectId),
    homeClassId: Joi.string().custom(objectId),
  }),
};

export const getClassAvailability = {
  params: Joi.object().keys({
    classId: Joi.string().custom(objectId).required(),
  }),
  query: Joi.object().keys({
    date: ymd.required(),
  }),
};

export const createBooking = {
  body: Joi.object().keys({
    studentId: Joi.string().custom(objectId),
    homeClassId: Joi.string().custom(objectId).required(),
    targetClassId: Joi.string().custom(objectId).required(),
    date: ymd.required(),
    notes: Joi.string().trim().allow('').max(500),
  }),
};

export const getBookings = {
  query: Joi.object().keys({
    studentId: Joi.string().custom(objectId),
    homeClassId: Joi.string().custom(objectId),
    targetClassId: Joi.string().custom(objectId),
    date: ymd,
    status: Joi.string().valid(...COMPENSATION_BOOKING_STATUSES),
    sortBy: Joi.string(),
    projectBy: Joi.string(),
    limit: Joi.number().integer(),
    page: Joi.number().integer(),
  }),
};

export const getBooking = {
  params: Joi.object().keys({
    bookingId: Joi.string().custom(objectId).required(),
  }),
};

export const cancelBooking = {
  params: Joi.object().keys({
    bookingId: Joi.string().custom(objectId).required(),
  }),
};
