import httpStatus from 'http-status';
import { Request, Response } from 'express';
import mongoose from 'mongoose';
import catchAsync from '../utils/catchAsync';
import ApiError from '../errors/ApiError';
import pick from '../utils/pick';
import { IOptions } from '../paginate/paginate';
import * as studentAttendanceService from './studentAttendance.service';

export const getStudentAttendance = catchAsync(async (req: Request, res: Response) => {
  const filter = pick(req.query, ['studentId', 'classId']);
  const options: IOptions = pick(req.query, ['sortBy', 'limit', 'page', 'projectBy']);
  const result = await studentAttendanceService.queryStudentAttendance(filter, options);
  res.send(result);
});

export const getStudentAttendanceById = catchAsync(async (req: Request, res: Response) => {
  if (typeof req.params['attendanceId'] === 'string') {
    const attendance = await studentAttendanceService.getStudentAttendanceById(
      new mongoose.Types.ObjectId(req.params['attendanceId'])
    );
    if (!attendance) {
      throw new ApiError(httpStatus.NOT_FOUND, 'Student attendance record not found');
    }
    res.send(attendance);
  }
});

export const updateStudentAttendance = catchAsync(async (req: Request, res: Response) => {
  if (typeof req.params['attendanceId'] === 'string') {
    const attendance = await studentAttendanceService.updateStudentAttendanceById(
      new mongoose.Types.ObjectId(req.params['attendanceId']),
      req.body
    );
    res.send(attendance);
  }
});

export const deleteStudentAttendance = catchAsync(async (req: Request, res: Response) => {
  if (typeof req.params['attendanceId'] === 'string') {
    await studentAttendanceService.deleteStudentAttendanceById(new mongoose.Types.ObjectId(req.params['attendanceId']));
    res.status(httpStatus.NO_CONTENT).send();
  }
});

export const getStudentAttendanceByStudentAndClass = catchAsync(async (req: Request, res: Response) => {
  const { studentId, classId } = req.params;
  if (typeof studentId === 'string' && typeof classId === 'string') {
    const attendance = await studentAttendanceService.getStudentAttendanceByStudentAndClass(
      new mongoose.Types.ObjectId(studentId),
      new mongoose.Types.ObjectId(classId)
    );
    if (!attendance) {
      throw new ApiError(httpStatus.NOT_FOUND, 'Student attendance record not found');
    }
    res.send(attendance);
  }
});

export const getAttendanceByStudent = catchAsync(async (req: Request, res: Response) => {
  const { studentId } = req.params;
  if (typeof studentId === 'string') {
    const attendance = await studentAttendanceService.getAttendanceByStudent(new mongoose.Types.ObjectId(studentId));
    res.send(attendance);
  }
});

export const getAttendanceByClass = catchAsync(async (req: Request, res: Response) => {
  const { classId } = req.params;
  if (typeof classId === 'string') {
    const attendance = await studentAttendanceService.getAttendanceByClass(new mongoose.Types.ObjectId(classId));
    res.send(attendance);
  }
});

export const markAttendancePresent = catchAsync(async (req: Request, res: Response) => {
  const { attendanceId } = req.params;
  const { studentId, classId, date } = req.body;

  if (typeof attendanceId === 'string') {
    const attendance = await studentAttendanceService.markAttendancePresent(
      new mongoose.Types.ObjectId(attendanceId),
      new mongoose.Types.ObjectId(studentId),
      new mongoose.Types.ObjectId(classId),
      new Date(date)
    );
    res.send(attendance);
  }
});

export const markAttendanceAbsent = catchAsync(async (req: Request, res: Response) => {
  const { attendanceId } = req.params;
  const { studentId, classId, date } = req.body;

  if (typeof attendanceId === 'string') {
    const attendance = await studentAttendanceService.markAttendanceAbsent(
      new mongoose.Types.ObjectId(attendanceId),
      new mongoose.Types.ObjectId(studentId),
      new mongoose.Types.ObjectId(classId),
      new Date(date)
    );
    res.send(attendance);
  }
});

export const clearAttendanceForDate = catchAsync(async (req: Request, res: Response) => {
  const { attendanceId } = req.params;
  const { studentId, classId, date } = req.body;

  if (typeof attendanceId === 'string') {
    const attendance = await studentAttendanceService.clearAttendanceForDate(
      new mongoose.Types.ObjectId(attendanceId),
      new mongoose.Types.ObjectId(studentId),
      new mongoose.Types.ObjectId(classId),
      new Date(date)
    );
    res.send(attendance);
  }
});
