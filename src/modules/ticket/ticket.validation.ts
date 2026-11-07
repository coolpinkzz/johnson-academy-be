import Joi from 'joi';
import { objectId } from '../validate/custom.validation';
import { TICKET_STATUSES } from './ticket.interfaces';

export const createTicket = {
  body: Joi.object().keys({
    subject: Joi.string().trim().min(3).max(120).required(),
    description: Joi.string().trim().min(10).max(4000).required(),
  }),
};

export const getTickets = {
  query: Joi.object().keys({
    status: Joi.string().valid(...TICKET_STATUSES),
    assigneeId: Joi.string().custom(objectId),
    unassigned: Joi.boolean(),
    search: Joi.string().trim().max(80).allow(''),
    sortBy: Joi.string(),
    limit: Joi.number().integer(),
    page: Joi.number().integer(),
  }),
};

export const getTicket = {
  params: Joi.object().keys({
    ticketId: Joi.string().custom(objectId).required(),
  }),
};

export const updateAssignment = {
  params: Joi.object().keys({
    ticketId: Joi.string().custom(objectId).required(),
  }),
  body: Joi.object().keys({
    assigneeId: Joi.string().custom(objectId).allow(null).required(),
  }),
};

export const updateStatus = {
  params: Joi.object().keys({
    ticketId: Joi.string().custom(objectId).required(),
  }),
  body: Joi.object().keys({
    status: Joi.string()
      .valid(...TICKET_STATUSES)
      .required(),
  }),
};

export const addComment = {
  params: Joi.object().keys({
    ticketId: Joi.string().custom(objectId).required(),
  }),
  body: Joi.object().keys({
    body: Joi.string().trim().min(1).max(2000).required(),
  }),
};
