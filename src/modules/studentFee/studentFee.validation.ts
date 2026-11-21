import Joi from 'joi';
import { objectId } from '../validate/custom.validation';

const dateKey = Joi.string()
  .pattern(/^\d{4}-\d{2}-\d{2}$/)
  .custom((value: string, helpers) => {
    const date = new Date(`${value}T00:00:00.000Z`);
    if (Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== value) {
      return helpers.error('string.pattern.base');
    }
    return value;
  });
const payment = Joi.object({
  type: Joi.string().valid('payment', 'refund'),
  amount: Joi.number().integer().min(1).required(),
  method: Joi.string().valid('upi', 'card', 'card_machine', 'cash', 'bank_transfer', 'cheque', 'other').required(),
  reference: Joi.string().max(100).allow(''),
  paidAt: dateKey,
  notes: Joi.string().max(500).allow(''),
});

export const getStudentFees = {
  params: Joi.object({ studentId: Joi.string().custom(objectId).required() }),
};

export const createPackage = {
  body: Joi.object({
    studentId: Joi.string().custom(objectId).required(),
    courseId: Joi.string().required(),
    startDate: dateKey.required(),
    durationMonths: Joi.number().integer().min(1).max(36).required(),
    endDate: dateKey,
    amount: Joi.number().integer().min(0).required(),
    renewalOfId: Joi.string().custom(objectId),
    notes: Joi.string().max(500).allow(''),
    initialPayment: payment,
  }),
};

export const updatePackage = {
  params: Joi.object({ packageId: Joi.string().custom(objectId).required() }),
  body: Joi.object({
    startDate: dateKey,
    durationMonths: Joi.number().integer().min(1).max(36),
    endDate: dateKey,
    amount: Joi.number().integer().min(0),
    notes: Joi.string().max(500).allow(''),
  }).min(1),
};

export const cancelPackage = {
  params: Joi.object({ packageId: Joi.string().custom(objectId).required() }),
  body: Joi.object({ reason: Joi.string().trim().min(3).max(500).required() }),
};

export const addPayment = {
  params: Joi.object({ packageId: Joi.string().custom(objectId).required() }),
  body: payment,
};

export const voidPayment = {
  params: Joi.object({ paymentId: Joi.string().custom(objectId).required() }),
  body: Joi.object({ reason: Joi.string().trim().min(3).max(500).required() }),
};
