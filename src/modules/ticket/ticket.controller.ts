import httpStatus from 'http-status';
import { Request, Response } from 'express';
import mongoose from 'mongoose';
import catchAsync from '../utils/catchAsync';
import ApiError from '../errors/ApiError';
import * as ticketService from './ticket.service';
import { TicketStatus } from './ticket.interfaces';

const actorFromRequest = (req: Request): { id: string; role: string } => {
  if (!req.user) {
    throw new ApiError(httpStatus.UNAUTHORIZED, 'Please authenticate');
  }
  return { id: req.user._id.toString(), role: req.user.role };
};

const ticketIdFromRequest = (req: Request): mongoose.Types.ObjectId => {
  if (typeof req.params['ticketId'] !== 'string') {
    throw new ApiError(httpStatus.BAD_REQUEST, 'ticketId is required');
  }
  return new mongoose.Types.ObjectId(req.params['ticketId']);
};

export const createTicket = catchAsync(async (req: Request, res: Response) => {
  const actor = actorFromRequest(req);
  if (actor.role !== 'student') {
    throw new ApiError(httpStatus.FORBIDDEN, 'Only students can raise a concern');
  }

  const ticket = await ticketService.createTicket(req.user._id, req.body.subject, req.body.description);
  res.status(httpStatus.CREATED).send(ticket);
});

export const getTickets = catchAsync(async (req: Request, res: Response) => {
  const actor = actorFromRequest(req);
  const result = await ticketService.queryTickets({
    actor,
    ...(typeof req.query['status'] === 'string' ? { status: req.query['status'] as TicketStatus } : {}),
    ...(typeof req.query['assigneeId'] === 'string' ? { assigneeId: req.query['assigneeId'] } : {}),
    ...(String(req.query['unassigned']) === 'true' ? { unassigned: true } : {}),
    ...(typeof req.query['search'] === 'string' ? { search: req.query['search'] } : {}),
    ...(typeof req.query['sortBy'] === 'string' ? { sortBy: req.query['sortBy'] } : {}),
    ...(req.query['limit'] != null ? { limit: Number(req.query['limit']) } : {}),
    ...(req.query['page'] != null ? { page: Number(req.query['page']) } : {}),
  });
  res.send(result);
});

export const getTicket = catchAsync(async (req: Request, res: Response) => {
  const ticket = await ticketService.getTicketById(ticketIdFromRequest(req), actorFromRequest(req));
  res.send(ticket);
});

export const getTicketStats = catchAsync(async (_req: Request, res: Response) => {
  const stats = await ticketService.getTicketStats();
  res.send(stats);
});

export const getAssignees = catchAsync(async (_req: Request, res: Response) => {
  const assignees = await ticketService.getTicketAssignees();
  res.send(assignees);
});

export const updateAssignment = catchAsync(async (req: Request, res: Response) => {
  const ticket = await ticketService.assignTicket(ticketIdFromRequest(req), actorFromRequest(req), req.body.assigneeId);
  res.send(ticket);
});

export const updateStatus = catchAsync(async (req: Request, res: Response) => {
  const ticket = await ticketService.updateTicketStatus(ticketIdFromRequest(req), actorFromRequest(req), req.body.status);
  res.send(ticket);
});

export const addComment = catchAsync(async (req: Request, res: Response) => {
  const ticket = await ticketService.addTicketComment(ticketIdFromRequest(req), actorFromRequest(req), req.body.body);
  res.send(ticket);
});
