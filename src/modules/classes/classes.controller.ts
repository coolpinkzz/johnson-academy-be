import httpStatus from 'http-status';
import { Request, Response } from 'express';
import mongoose from 'mongoose';
import catchAsync from '../utils/catchAsync';
import ApiError from '../errors/ApiError';
import pick from '../utils/pick';
import { IOptions } from '../paginate/paginate';
import * as classesService from './classes.service';
import { classManagerRoles } from '../../config/roles';

const canManageClasses = (role?: string): boolean =>
  !!role && (classManagerRoles as readonly string[]).includes(role);

export const createClasses = catchAsync(async (req: Request, res: Response) => {
  if (req.user && !canManageClasses(req.user.role)) {
    throw new ApiError(httpStatus.FORBIDDEN, 'Only admin or master can create classes');
  }

  const classes = await classesService.createClasses(req.body);
  res.status(httpStatus.CREATED).send(classes);
});

export const getClasses = catchAsync(async (req: Request, res: Response) => {
  const filter = pick(req.query, ['teacherId', 'teachers', 'courseId', 'name', 'branch', 'academicYear']);
  const options: IOptions = pick(req.query, ['sortBy', 'limit', 'page', 'projectBy']);
  const result = await classesService.queryClasses(filter, options);
  res.send(result);
});

export const getClass = catchAsync(async (req: Request, res: Response) => {
  if (typeof req.params['classesId'] === 'string') {
    const classes = await classesService.getClassesById(new mongoose.Types.ObjectId(req.params['classesId']));
    if (!classes) {
      throw new ApiError(httpStatus.NOT_FOUND, 'Class not found');
    }
    res.send(classes);
  }
});

export const getClassesByTeacher = catchAsync(async (req: Request, res: Response) => {
  if (typeof req.params['teacherId'] === 'string') {
    const classes = await classesService.getClassesByTeacherId(new mongoose.Types.ObjectId(req.params['teacherId']));
    res.send(classes);
  }
});

export const getClassesByCourse = catchAsync(async (req: Request, res: Response) => {
  if (typeof req.params['courseId'] === 'string') {
    const classes = await classesService.getClassesByCourseId(new mongoose.Types.ObjectId(req.params['courseId']));
    res.send(classes);
  }
});

export const getClassesByStudent = catchAsync(async (req: Request, res: Response) => {
  if (typeof req.params['studentId'] === 'string') {
    const classes = await classesService.getClassesByStudentId(new mongoose.Types.ObjectId(req.params['studentId']));
    res.send(classes);
  }
});

export const updateClasses = catchAsync(async (req: Request, res: Response) => {
  if (req.user && !canManageClasses(req.user.role)) {
    throw new ApiError(httpStatus.FORBIDDEN, 'Only admin or master can update classes');
  }

  if (typeof req.params['classesId'] === 'string') {
    const classes = await classesService.updateClassesById(new mongoose.Types.ObjectId(req.params['classesId']), req.body);
    res.send(classes);
  }
});

export const deleteClasses = catchAsync(async (req: Request, res: Response) => {
  if (req.user && !canManageClasses(req.user.role)) {
    throw new ApiError(httpStatus.FORBIDDEN, 'Only admin or master can delete classes');
  }

  if (typeof req.params['classesId'] === 'string') {
    await classesService.deleteClassesById(new mongoose.Types.ObjectId(req.params['classesId']));
    res.status(httpStatus.NO_CONTENT).send();
  }
});

export const getAllClasses = catchAsync(async (_req: Request, res: Response) => {
  const classes = await classesService.getAllClasses();
  res.send(classes);
});

export const getStudentsByClass = catchAsync(async (req: Request, res: Response) => {
  if (typeof req.params['classesId'] === 'string') {
    const students = await classesService.getStudentsByClassId(new mongoose.Types.ObjectId(req.params['classesId']));
    res.send(students);
  }
});

export const bulkAddStudentsToClass = catchAsync(async (req: Request, res: Response) => {
  if (req.user && !canManageClasses(req.user.role)) {
    throw new ApiError(httpStatus.FORBIDDEN, 'Only admin or master can bulk add students to classes');
  }

  if (typeof req.params['classesId'] === 'string') {
    const { studentIds } = req.body;

    if (!Array.isArray(studentIds) || studentIds.length === 0) {
      throw new ApiError(httpStatus.BAD_REQUEST, 'studentIds must be a non-empty array');
    }

    const classes = await classesService.bulkAddStudentsToClass(
      new mongoose.Types.ObjectId(req.params['classesId']),
      studentIds.map((id: string) => new mongoose.Types.ObjectId(id))
    );

    res.status(httpStatus.OK).send(classes);
  }
});

export const addSingleStudentToClass = catchAsync(async (req: Request, res: Response) => {
  const classesId = req.params['classesId'];
  if (typeof classesId === 'string') {
    const { studentId, courseId } = req.body;
    const classes = await classesService.addSingleStudentToClass(
      new mongoose.Types.ObjectId(classesId),
      studentId,
      courseId
    );
    res.status(httpStatus.OK).send(classes);
  }
});

export const getStudentPromotionsInClass = catchAsync(async (req: Request, res: Response) => {
  const classesId = req.params['classesId'];
  const studentId = req.params['studentId'];
  if (typeof classesId === 'string' && typeof studentId === 'string') {
    const promotions = await classesService.getStudentPromotionsInClass(
      new mongoose.Types.ObjectId(classesId),
      new mongoose.Types.ObjectId(studentId)
    );
    res.send(promotions);
  }
});

export const promoteStudentInClass = catchAsync(async (req: Request, res: Response) => {
  const classesId = req.params['classesId'];
  if (typeof classesId === 'string') {
    const { studentId, courseId } = req.body;
    const result = await classesService.promoteStudentInClass(
      new mongoose.Types.ObjectId(classesId),
      new mongoose.Types.ObjectId(studentId),
      new mongoose.Types.ObjectId(courseId),
      req.user?._id
    );

    res.status(result.alreadyPromoted ? httpStatus.OK : httpStatus.CREATED).send(result);
  }
});

export const removeStudentFromClass = catchAsync(async (req: Request, res: Response) => {
  if (req.user && !canManageClasses(req.user.role)) {
    throw new ApiError(httpStatus.FORBIDDEN, 'Only admin or master can remove students from classes');
  }

  const classesId = req.params['classesId'];
  if (typeof classesId === 'string') {
    const { studentId, courseId } = req.body;
    const classes = await classesService.removeStudentCourseFromClass(
      new mongoose.Types.ObjectId(classesId),
      new mongoose.Types.ObjectId(studentId),
      new mongoose.Types.ObjectId(courseId)
    );
    res.status(httpStatus.OK).send(classes);
  }
});

export const transferStudentToClass = catchAsync(async (req: Request, res: Response) => {
  if (req.user && !canManageClasses(req.user.role)) {
    throw new ApiError(httpStatus.FORBIDDEN, 'Only admin or master can transfer students between classes');
  }

  const classesId = req.params['classesId'];
  if (typeof classesId === 'string') {
    const { studentId, targetClassId } = req.body;
    const result = await classesService.transferStudentToClass(
      new mongoose.Types.ObjectId(classesId),
      new mongoose.Types.ObjectId(studentId),
      new mongoose.Types.ObjectId(targetClassId)
    );
    res.status(httpStatus.OK).send(result);
  }
});
