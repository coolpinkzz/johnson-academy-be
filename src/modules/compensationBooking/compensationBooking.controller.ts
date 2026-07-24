import httpStatus from 'http-status';
import { Request, Response } from 'express';
import mongoose from 'mongoose';
import catchAsync from '../utils/catchAsync';
import ApiError from '../errors/ApiError';
import pick from '../utils/pick';
import { IOptions } from '../paginate/paginate';
import * as compensationBookingService from './compensationBooking.service';
import { ICompensationBookingDoc } from './compensationBooking.interfaces';

const resolveId = (value: unknown): string => {
  if (!value) return '';
  if (typeof value === 'object' && value !== null && '_id' in value) {
    return String((value as { _id: unknown })._id);
  }
  return String(value);
};

const assertStudentOwnsBooking = (actorId: string, booking: ICompensationBookingDoc) => {
  if (resolveId(booking.studentId) !== actorId) {
    throw new ApiError(httpStatus.FORBIDDEN, 'Forbidden');
  }
};

export const listAvailableClasses = catchAsync(async (req: Request, res: Response) => {
  const date = String(req.query['date']);
  const branch = req.query['branch'] ? String(req.query['branch']) : undefined;
  const exclude: mongoose.Types.ObjectId[] = [];

  if (typeof req.query['excludeClassId'] === 'string') {
    exclude.push(new mongoose.Types.ObjectId(req.query['excludeClassId']));
  }
  if (typeof req.query['homeClassId'] === 'string') {
    exclude.push(new mongoose.Types.ObjectId(req.query['homeClassId']));
  }

  const result = await compensationBookingService.listAvailableClasses({
    date,
    ...(branch ? { branch } : {}),
    ...(exclude.length > 0 ? { excludeClassIds: exclude } : {}),
  });
  res.send(result);
});

export const getClassAvailability = catchAsync(async (req: Request, res: Response) => {
  if (typeof req.params['classId'] !== 'string') {
    throw new ApiError(httpStatus.BAD_REQUEST, 'classId is required');
  }
  const result = await compensationBookingService.getAvailabilityForClass(
    new mongoose.Types.ObjectId(req.params['classId']),
    String(req.query['date'])
  );
  res.send(result);
});

export const createBooking = catchAsync(async (req: Request, res: Response) => {
  const actor = req.user;
  if (!actor) {
    throw new ApiError(httpStatus.UNAUTHORIZED, 'Please authenticate');
  }

  let studentId: mongoose.Types.ObjectId;
  if (actor.role === 'student') {
    studentId = actor._id;
    if (req.body.studentId && resolveId(req.body.studentId) !== actor._id.toString()) {
      throw new ApiError(httpStatus.FORBIDDEN, 'Students can only book compensation for themselves');
    }
  } else {
    if (!req.body.studentId) {
      throw new ApiError(httpStatus.BAD_REQUEST, 'studentId is required');
    }
    studentId = new mongoose.Types.ObjectId(req.body.studentId);
  }

  const booking = await compensationBookingService.createCompensationBooking({
    studentId,
    homeClassId: new mongoose.Types.ObjectId(req.body.homeClassId),
    targetClassId: new mongoose.Types.ObjectId(req.body.targetClassId),
    date: req.body.date,
    bookedBy: actor._id,
    ...(req.body.notes ? { notes: req.body.notes } : {}),
  });

  res.status(httpStatus.CREATED).send(booking);
});

export const getBookings = catchAsync(async (req: Request, res: Response) => {
  const actor = req.user;
  if (!actor) {
    throw new ApiError(httpStatus.UNAUTHORIZED, 'Please authenticate');
  }

  const filter = pick(req.query, ['studentId', 'homeClassId', 'targetClassId', 'date', 'status']);
  if (actor.role === 'student') {
    filter['studentId'] = actor._id.toString();
  }

  const options: IOptions = pick(req.query, ['sortBy', 'limit', 'page', 'projectBy']);
  const result = await compensationBookingService.queryCompensationBookings(filter, options);
  res.send(result);
});

export const getBooking = catchAsync(async (req: Request, res: Response) => {
  const actor = req.user;
  if (!actor) {
    throw new ApiError(httpStatus.UNAUTHORIZED, 'Please authenticate');
  }
  if (typeof req.params['bookingId'] !== 'string') {
    throw new ApiError(httpStatus.BAD_REQUEST, 'bookingId is required');
  }

  const booking = await compensationBookingService.getCompensationBookingById(
    new mongoose.Types.ObjectId(req.params['bookingId'])
  );
  if (!booking) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Compensation booking not found');
  }

  if (actor.role === 'student') {
    assertStudentOwnsBooking(actor._id.toString(), booking);
  }

  res.send(booking);
});

export const cancelBooking = catchAsync(async (req: Request, res: Response) => {
  const actor = req.user;
  if (!actor) {
    throw new ApiError(httpStatus.UNAUTHORIZED, 'Please authenticate');
  }
  if (typeof req.params['bookingId'] !== 'string') {
    throw new ApiError(httpStatus.BAD_REQUEST, 'bookingId is required');
  }

  const bookingId = new mongoose.Types.ObjectId(req.params['bookingId']);
  const existing = await compensationBookingService.getCompensationBookingById(bookingId);
  if (!existing) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Compensation booking not found');
  }

  if (actor.role === 'student') {
    assertStudentOwnsBooking(actor._id.toString(), existing);
  }

  const booking = await compensationBookingService.cancelCompensationBooking(bookingId, actor._id);
  res.send(booking);
});
