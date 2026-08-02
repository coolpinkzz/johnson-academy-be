import httpStatus from 'http-status';
import { Request, Response } from 'express';
import mongoose from 'mongoose';
import catchAsync from '../utils/catchAsync';
import ApiError from '../errors/ApiError';
import pick from '../utils/pick';
import { IOptions } from '../paginate/paginate';
import * as courseService from './course.service';
import { contentManagerRoles } from '../../config/roles';

const canManageContent = (role?: string): boolean =>
  !!role && (contentManagerRoles as readonly string[]).includes(role);

export const createCourse = catchAsync(async (req: Request, res: Response) => {
  if (req.user && !canManageContent(req.user.role)) {
    throw new ApiError(httpStatus.FORBIDDEN, 'Only admin, aqsd, or master can create courses');
  }

  const course = await courseService.createCourse(req.body);
  res.status(httpStatus.CREATED).send(course);
});

export const getCourses = catchAsync(async (req: Request, res: Response) => {
  const filter = pick(req.query, ['name', 'instrument']);
  const options: IOptions = pick(req.query, ['sortBy', 'limit', 'page', 'projectBy']);
  const result = await courseService.queryCourses(filter, options);
  res.send(result);
});

export const getCourse = catchAsync(async (req: Request, res: Response) => {
  if (typeof req.params['courseId'] === 'string') {
    const course = await courseService.getCourseById(new mongoose.Types.ObjectId(req.params['courseId']));
    if (!course) {
      throw new ApiError(httpStatus.NOT_FOUND, 'Course not found');
    }
    res.send(course);
  }
});

export const updateCourse = catchAsync(async (req: Request, res: Response) => {
  if (req.user && !canManageContent(req.user.role)) {
    throw new ApiError(httpStatus.FORBIDDEN, 'Only admin, aqsd, or master can update courses');
  }

  if (typeof req.params['courseId'] === 'string') {
    const course = await courseService.updateCourseById(new mongoose.Types.ObjectId(req.params['courseId']), req.body);
    res.send(course);
  }
});

export const deleteCourse = catchAsync(async (req: Request, res: Response) => {
  if (req.user && !canManageContent(req.user.role)) {
    throw new ApiError(httpStatus.FORBIDDEN, 'Only admin, aqsd, or master can delete courses');
  }

  if (typeof req.params['courseId'] === 'string') {
    await courseService.deleteCourseById(new mongoose.Types.ObjectId(req.params['courseId']));
    res.status(httpStatus.NO_CONTENT).send();
  }
});

// export const getAllCoursesWithSyllabus = catchAsync(async (req: Request, res: Response) => {
//   const courses = await courseService.getAllCoursesWithSyllabus();
//   res.send(courses);
// });

export const addSyllabusToCourse = catchAsync(async (req: Request, res: Response) => {
  if (req.user && !canManageContent(req.user.role)) {
    throw new ApiError(httpStatus.FORBIDDEN, 'Only admin, aqsd, or master can add syllabus to courses');
  }

  const { courseId, syllabusId } = req.params;
  if (typeof courseId === 'string' && typeof syllabusId === 'string') {
    const course = await courseService.addSyllabusToCourse(
      new mongoose.Types.ObjectId(courseId),
      new mongoose.Types.ObjectId(syllabusId)
    );
    res.send(course);
  }
});

export const removeSyllabusFromCourse = catchAsync(async (req: Request, res: Response) => {
  if (req.user && !canManageContent(req.user.role)) {
    throw new ApiError(httpStatus.FORBIDDEN, 'Only admin, aqsd, or master can remove syllabus from courses');
  }

  const { courseId, syllabusId } = req.params;
  if (typeof courseId === 'string' && typeof syllabusId === 'string') {
    const course = await courseService.removeSyllabusFromCourse(
      new mongoose.Types.ObjectId(courseId),
      new mongoose.Types.ObjectId(syllabusId)
    );
    res.send(course);
  }
});
