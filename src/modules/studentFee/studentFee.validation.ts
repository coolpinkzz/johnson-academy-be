import Joi from 'joi';
import { objectId } from '../validate/custom.validation';
import { BRANCH_QUERY_VALUES } from '../user/rollNumber.util';
import {
  MAX_PACKAGE_DURATION_MONTHS,
  PACKAGE_LIST_SORT_FIELDS,
  PAYMENT_METHODS,
  PAYMENT_STATUSES,
  PAYMENT_TYPES,
  RENEWAL_STATUSES,
} from './studentFee.interfaces';

const ymd = Joi.string()
  .pattern(/^\d{4}-\d{2}-\d{2}$/)
  .messages({ 'string.pattern.base': 'Date must be YYYY-MM-DD' });

const rupees = Joi.number().integer().strict();
const notes = Joi.string().trim().allow('').max(500);
const reason = Joi.string().trim().min(3).max(500).required();
const durationMonths = Joi.number().integer().min(1).max(MAX_PACKAGE_DURATION_MONTHS);

const paymentFields = {
  amount: rupees.min(1).required(),
  method: Joi.string()
    .valid(...PAYMENT_METHODS)
    .required(),
  reference: Joi.string().trim().allow('').max(100),
  paidAt: ymd,
  notes,
};

const paginationQuery = {
  limit: Joi.number().integer().min(1).max(100),
  page: Joi.number().integer().min(1),
};

const studentIdParams = {
  params: Joi.object().keys({
    studentId: Joi.string().custom(objectId).required(),
  }),
};

const packageIdParam = Joi.object().keys({
  packageId: Joi.string().custom(objectId).required(),
});

export const listPackages = {
  query: Joi.object().keys({
    search: Joi.string().trim().allow('').max(100),
    courseId: Joi.string().custom(objectId),
    renewalStatus: Joi.string().valid(...RENEWAL_STATUSES),
    withinDays: Joi.number().integer().min(1).max(365),
    paymentStatus: Joi.string().valid(...PAYMENT_STATUSES),
    branch: Joi.string().valid(...BRANCH_QUERY_VALUES),
    sortBy: Joi.string().pattern(new RegExp(`^(${PACKAGE_LIST_SORT_FIELDS.join('|')}):(asc|desc)$`)),
    ...paginationQuery,
  }),
};

export const listStudentsWithoutPackage = {
  query: Joi.object().keys({
    name: Joi.string().trim().allow('').max(100),
    rollNumber: Joi.string().trim().max(50),
    branch: Joi.string().valid(...BRANCH_QUERY_VALUES),
    sortBy: Joi.string().pattern(/^(name|rollNumber):(asc|desc)$/),
    ...paginationQuery,
  }),
};

export const getStudentFees = studentIdParams;

export const getStudentFeeHistory = {
  ...studentIdParams,
  query: Joi.object().keys(paginationQuery),
};

export const createPackage = {
  body: Joi.object().keys({
    studentId: Joi.string().custom(objectId).required(),
    courseId: Joi.string().custom(objectId).required(),
    startDate: ymd.required(),
    durationMonths: durationMonths.required(),
    endDate: ymd,
    amount: rupees.min(0).required(),
    renewalOfId: Joi.string().custom(objectId),
    notes,
    initialPayment: Joi.object().keys(paymentFields),
  }),
};

export const updatePackage = {
  params: packageIdParam,
  body: Joi.object()
    .keys({
      startDate: ymd,
      durationMonths,
      endDate: ymd,
      amount: rupees.min(0),
      notes,
    })
    .min(1),
};

export const cancelPackage = {
  params: packageIdParam,
  body: Joi.object().keys({ reason }),
};

export const addPayment = {
  params: packageIdParam,
  body: Joi.object().keys({
    type: Joi.string().valid(...PAYMENT_TYPES),
    ...paymentFields,
  }),
};

export const voidPayment = {
  params: Joi.object().keys({
    paymentId: Joi.string().custom(objectId).required(),
  }),
  body: Joi.object().keys({ reason }),
};
