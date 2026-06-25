import httpStatus from 'http-status';
import { Request, Response } from 'express';
import mongoose from 'mongoose';
import catchAsync from '../utils/catchAsync';
import pick from '../utils/pick';
import { IOptions } from '../paginate/paginate';
import * as studentProgressService from './studentProgress.service';
import ApiError from '../errors/ApiError';

export const createStudentProgress = catchAsync(async (req: Request, res: Response) => {
  const studentProgress = await studentProgressService.createStudentProgress(req.body);
  res.status(httpStatus.CREATED).send(studentProgress);
});

export const getStudentProgress = catchAsync(async (req: Request, res: Response) => {
  const filter = pick(req.query, ['studentId', 'classId', 'courseId', 'progress']);
  const options: IOptions = pick(req.query, ['sortBy', 'limit', 'page', 'projectBy']);
  const result = await studentProgressService.queryStudentProgress(filter, options);
  res.send(result);
});

export const getStudentProgressById = catchAsync(async (req: Request, res: Response) => {
  if (typeof req.params['studentProgressId'] === 'string') {
    const studentProgress = await studentProgressService.getStudentProgressById(
      new mongoose.Types.ObjectId(req.params['studentProgressId'])
    );
    if (!studentProgress) {
      throw new ApiError(httpStatus.NOT_FOUND, 'Student progress not found');
    }
    res.send(studentProgress);
  }
});

export const updateStudentProgress = catchAsync(async (req: Request, res: Response) => {
  if (typeof req.params['studentProgressId'] === 'string') {
    const studentProgress = await studentProgressService.updateStudentProgressById(
      new mongoose.Types.ObjectId(req.params['studentProgressId']),
      req.body
    );
    res.send(studentProgress);
  }
});

export const updateModuleProgress = catchAsync(async (req: Request, res: Response) => {
  if (typeof req.params['studentProgressId'] === 'string') {
    const studentProgress = await studentProgressService.updateModuleProgress(
      new mongoose.Types.ObjectId(req.params['studentProgressId']),
      req.body
    );
    res.send(studentProgress);
  }
});

export const startModule = catchAsync(async (req: Request, res: Response) => {
  if (typeof req.params['studentProgressId'] === 'string') {
    const studentProgress = await studentProgressService.startModule(
      new mongoose.Types.ObjectId(req.params['studentProgressId']),
      req.body
    );
    res.send(studentProgress);
  }
});

export const endModule = catchAsync(async (req: Request, res: Response) => {
  if (typeof req.params['studentProgressId'] === 'string') {
    const studentProgress = await studentProgressService.endModule(
      new mongoose.Types.ObjectId(req.params['studentProgressId']),
      req.body
    );
    res.send(studentProgress);
  }
});

export const deleteStudentProgress = catchAsync(async (req: Request, res: Response) => {
  if (typeof req.params['studentProgressId'] === 'string') {
    await studentProgressService.deleteStudentProgressById(new mongoose.Types.ObjectId(req.params['studentProgressId']));
    res.status(httpStatus.NO_CONTENT).send();
  }
});

export const getStudentProgressByStudent = catchAsync(async (req: Request, res: Response) => {
  if (typeof req.params['studentId'] === 'string') {
    const studentProgress = await studentProgressService.getStudentProgressByStudent(
      new mongoose.Types.ObjectId(req.params['studentId'])
    );
    res.send(studentProgress);
  }
});

export const getStudentProgressByClass = catchAsync(async (req: Request, res: Response) => {
  if (typeof req.params['classId'] === 'string') {
    const studentProgress = await studentProgressService.getStudentProgressByClass(
      new mongoose.Types.ObjectId(req.params['classId'])
    );
    res.send(studentProgress);
  }
});

export const getStudentProgressByCourse = catchAsync(async (req: Request, res: Response) => {
  if (typeof req.params['courseId'] === 'string') {
    const studentProgress = await studentProgressService.getStudentProgressByCourse(
      new mongoose.Types.ObjectId(req.params['courseId'])
    );
    res.send(studentProgress);
  }
});

export const getStudentProgressByStudentAndClass = catchAsync(async (req: Request, res: Response) => {
  if (typeof req.params['studentId'] === 'string' && typeof req.params['classId'] === 'string') {
    const studentId = new mongoose.Types.ObjectId(req.params['studentId']);
    const classId = new mongoose.Types.ObjectId(req.params['classId']);
    const courseIdParam = req.query['courseId'];

    if (typeof courseIdParam === 'string') {
      const studentProgress = await studentProgressService.getStudentProgressByStudentClassAndCourse(
        studentId,
        classId,
        new mongoose.Types.ObjectId(courseIdParam)
      );
      if (!studentProgress) {
        throw new ApiError(httpStatus.NOT_FOUND, 'Student progress not found');
      }
      res.send(studentProgress);
      return;
    }

    const studentProgress = await studentProgressService.getStudentProgressByStudentAndClass(studentId, classId);
    if (Array.isArray(studentProgress) && studentProgress.length === 0) {
      throw new ApiError(httpStatus.NOT_FOUND, 'Student progress not found');
    }
    res.send(studentProgress);
  }
});

export const getClassProgressStatistics = catchAsync(async (req: Request, res: Response) => {
  if (typeof req.params['classId'] === 'string') {
    const statistics = await studentProgressService.getClassProgressStatistics(
      new mongoose.Types.ObjectId(req.params['classId'])
    );
    res.send(statistics);
  }
});

export const getCourseProgressStatistics = catchAsync(async (req: Request, res: Response) => {
  if (typeof req.params['courseId'] === 'string') {
    const statistics = await studentProgressService.getCourseProgressStatistics(
      new mongoose.Types.ObjectId(req.params['courseId'])
    );
    res.send(statistics);
  }
});
