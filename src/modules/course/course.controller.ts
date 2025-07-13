import httpStatus from 'http-status';
import { Request, Response } from 'express';
import mongoose from 'mongoose';
import catchAsync from '../utils/catchAsync';
import ApiError from '../errors/ApiError';
import pick from '../utils/pick';
import { IOptions } from '../paginate/paginate';
import * as courseService from './course.service';

export const createCourse = catchAsync(async (req: Request, res: Response) => {
  // Check if user is admin - only admins can create courses
  if (req.user && req.user.role !== 'admin') {
    throw new ApiError(httpStatus.FORBIDDEN, 'Only admins can create courses');
  }
  
  const course = await courseService.createCourse(req.body);
  res.status(httpStatus.CREATED).send(course);
});

export const getCourses = catchAsync(async (req: Request, res: Response) => {
  const filter = pick(req.query, ['name']);
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
  // Check if user is admin - only admins can update courses
  if (req.user && req.user.role !== 'admin') {
    throw new ApiError(httpStatus.FORBIDDEN, 'Only admins can update courses');
  }
  
  if (typeof req.params['courseId'] === 'string') {
    const course = await courseService.updateCourseById(new mongoose.Types.ObjectId(req.params['courseId']), req.body);
    res.send(course);
  }
});

export const deleteCourse = catchAsync(async (req: Request, res: Response) => {
  // Check if user is admin - only admins can delete courses
  if (req.user && req.user.role !== 'admin') {
    throw new ApiError(httpStatus.FORBIDDEN, 'Only admins can delete courses');
  }
  
  if (typeof req.params['courseId'] === 'string') {
    await courseService.deleteCourseById(new mongoose.Types.ObjectId(req.params['courseId']));
    res.status(httpStatus.NO_CONTENT).send();
  }
});



// export const getAllCoursesWithChapters = catchAsync(async (req: Request, res: Response) => {
//   const courses = await courseService.getAllCoursesWithSyllabus();
//   res.send(courses);
// });

export const addChapterToCourse = catchAsync(async (req: Request, res: Response) => {
  // Check if user is admin - only admins can add chapters
  if (req.user && req.user.role !== 'admin') {
    throw new ApiError(httpStatus.FORBIDDEN, 'Only admins can add chapters to courses');
  }
  
  const { courseId, chapterId } = req.params;
  if (typeof courseId === 'string' && typeof chapterId === 'string') {
    const course = await courseService.addSyllabusToCourse(
      new mongoose.Types.ObjectId(courseId),
      new mongoose.Types.ObjectId(chapterId)
    );
    res.send(course);
  }
});

export const removeChapterFromCourse = catchAsync(async (req: Request, res: Response) => {
  // Check if user is admin - only admins can remove chapters
  if (req.user && req.user.role !== 'admin') {
    throw new ApiError(httpStatus.FORBIDDEN, 'Only admins can remove chapters from courses');
  }
  
  const { courseId, chapterId } = req.params;
  if (typeof courseId === 'string' && typeof chapterId === 'string') {
    const course = await courseService.removeSyllabusFromCourse(
      new mongoose.Types.ObjectId(courseId),
      new mongoose.Types.ObjectId(chapterId)
    );
    res.send(course);
  }
});
