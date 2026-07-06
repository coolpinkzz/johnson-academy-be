import { Request, Response } from 'express';
import catchAsync from '../utils/catchAsync';
import pick from '../utils/pick';
import { IOptions } from '../paginate/paginate';
import * as mrtService from './mrt.service';
import httpStatus from 'http-status';
import { Types } from 'mongoose';

/**
 * Create a new MRT record
 * @route POST /v1/mrt
 * @access Private (Teacher/Admin only)
 */
export const createMRT = catchAsync(async (req: Request, res: Response) => {
  const mrt = await mrtService.createMRT(req.body, req.user.id);
  res.status(httpStatus.CREATED).send(mrt);
});

/**
 * Get MRT by ID
 * @route GET /v1/mrt/:mrtId
 * @access Public
 */
export const getMRT = catchAsync(async (req: Request, res: Response) => {
  const mrtId = req.params['mrtId'] as string;
  const mrt = await mrtService.getMRTById(new Types.ObjectId(mrtId));
  if (!mrt) {
    res.status(httpStatus.NOT_FOUND).send({
      code: httpStatus.NOT_FOUND,
      message: 'MRT not found',
    });
    return;
  }
  res.status(httpStatus.OK).send(mrt);
});

/**
 * Update MRT by ID
 * @route PATCH /v1/mrt/:mrtId
 * @access Private (Teacher/Admin only)
 */
export const updateMRT = catchAsync(async (req: Request, res: Response) => {
  const mrtId = req.params['mrtId'] as string;
  const mrt = await mrtService.updateMRTById(new Types.ObjectId(mrtId), req.body, req.user.id);
  res.status(httpStatus.OK).send(mrt);
});

/**
 * Delete MRT by ID
 * @route DELETE /v1/mrt/:mrtId
 * @access Private (Teacher/Admin only)
 */
export const deleteMRT = catchAsync(async (req: Request, res: Response) => {
  const mrtId = req.params['mrtId'] as string;
  await mrtService.deleteMRTById(new Types.ObjectId(mrtId));
  res.status(httpStatus.NO_CONTENT).send();
});

/**
 * Get all MRT records with pagination
 * @route GET /v1/mrt
 * @access Public
 */
export const getMRTs = catchAsync(async (req: Request, res: Response) => {
  const filter = pick(req.query, ['month', 'classId', 'studentId', 'courseId']);
  const options: IOptions = pick(req.query, ['sortBy', 'sortOrder', 'limit', 'page']);

  const result = await mrtService.queryMRTs(filter, options);
  res.status(httpStatus.OK).send(result);
});

/**
 * Get MRT records by student ID
 * @route GET /v1/mrt/student/:studentId
 * @access Public
 */
export const getMRTsByStudent = catchAsync(async (req: Request, res: Response) => {
  const options: IOptions = pick(req.query, ['sortBy', 'sortOrder', 'limit', 'page']);
  const studentId = req.params['studentId'] as string;
  const filter = pick(req.query, ['courseId']);
  const result = await mrtService.queryMRTs({ studentId, ...filter }, options);
  res.status(httpStatus.OK).send(result);
});

/**
 * Get MRT records by class ID
 * @access Public
 */
export const getMRTsByClass = catchAsync(async (req: Request, res: Response) => {
  const options: IOptions = pick(req.query, ['sortBy', 'sortOrder', 'limit', 'page']);
  const classId = req.params['classId'] as string;
  const filter = pick(req.query, ['courseId']);
  const result = await mrtService.queryMRTs({ classId, ...filter }, options);
  res.status(httpStatus.OK).send(result);
});

/**
 * Get MRT records by month
 * @route GET /v1/mrt/month/:month
 * @access Public
 */
export const getMRTsByMonth = catchAsync(async (req: Request, res: Response) => {
  const options: IOptions = pick(req.query, ['sortBy', 'sortOrder', 'limit', 'page']);
  const month = req.params['month'] as string;
  const result = await mrtService.getMRTsByMonth(month, options);
  res.status(httpStatus.OK).send(result);
});

/**
 * Get MRT by student, class, course, and month
 * @route GET /v1/mrt/student/:studentId/class/:classId/month/:month?courseId=
 * @access Public
 */
export const getMRTByStudentClassMonth = catchAsync(async (req: Request, res: Response) => {
  const studentId = req.params['studentId'] as string;
  const classId = req.params['classId'] as string;
  const month = req.params['month'] as string;
  const courseId = req.query['courseId'] as string;
  const mrt = await mrtService.getMRTByStudentClassMonth(studentId, classId, month, courseId);

  if (!mrt) {
    res.status(httpStatus.NOT_FOUND).send({
      code: httpStatus.NOT_FOUND,
      message: 'MRT not found for the specified student, class, course, and month',
    });
    return;
  }

  res.status(httpStatus.OK).send(mrt);
});
