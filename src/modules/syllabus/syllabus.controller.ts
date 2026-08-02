import httpStatus from 'http-status';
import { Request, Response } from 'express';
import mongoose from 'mongoose';
import catchAsync from '../utils/catchAsync';
import ApiError from '../errors/ApiError';
import pick from '../utils/pick';
import { IOptions } from '../paginate/paginate';
import * as syllabusService from './syllabus.service';
import { contentManagerRoles } from '../../config/roles';

const canManageContent = (role?: string): boolean =>
  !!role && (contentManagerRoles as readonly string[]).includes(role);

export const createSyllabus = catchAsync(async (req: Request, res: Response) => {
  if (req.user && !canManageContent(req.user.role)) {
    throw new ApiError(httpStatus.FORBIDDEN, 'Only admin, aqsd, or master can create syllabi');
  }

  const syllabus = await syllabusService.createSyllabus(req.body);
  res.status(httpStatus.CREATED).send(syllabus);
});

export const getSyllabi = catchAsync(async (req: Request, res: Response) => {
  const filter = pick(req.query, ['courseId', 'title']);
  const options: IOptions = pick(req.query, ['sortBy', 'limit', 'page', 'projectBy']);
  const result = await syllabusService.querySyllabi(filter, options);
  res.send(result);
});

export const getSyllabus = catchAsync(async (req: Request, res: Response) => {
  if (typeof req.params['syllabusId'] === 'string') {
    const syllabus = await syllabusService.getSyllabusById(new mongoose.Types.ObjectId(req.params['syllabusId']));
    if (!syllabus) {
      throw new ApiError(httpStatus.NOT_FOUND, 'Syllabus not found');
    }
    res.send(syllabus);
  }
});

export const getSyllabusByCourse = catchAsync(async (req: Request, res: Response) => {
  if (typeof req.params['courseId'] === 'string') {
    const syllabus = await syllabusService.getSyllabusByCourseId(new mongoose.Types.ObjectId(req.params['courseId']));
    if (!syllabus) {
      throw new ApiError(httpStatus.NOT_FOUND, 'Syllabus not found for this course');
    }
    res.send(syllabus);
  }
});

export const updateSyllabus = catchAsync(async (req: Request, res: Response) => {
  if (req.user && !canManageContent(req.user.role)) {
    throw new ApiError(httpStatus.FORBIDDEN, 'Only admin, aqsd, or master can update syllabi');
  }

  if (typeof req.params['syllabusId'] === 'string') {
    const syllabus = await syllabusService.updateSyllabusById(
      new mongoose.Types.ObjectId(req.params['syllabusId']),
      req.body
    );
    res.send(syllabus);
  }
});

export const deleteSyllabus = catchAsync(async (req: Request, res: Response) => {
  if (req.user && !canManageContent(req.user.role)) {
    throw new ApiError(httpStatus.FORBIDDEN, 'Only admin, aqsd, or master can delete syllabi');
  }

  if (typeof req.params['syllabusId'] === 'string') {
    await syllabusService.deleteSyllabusById(new mongoose.Types.ObjectId(req.params['syllabusId']));
    res.status(httpStatus.NO_CONTENT).send();
  }
});

export const getAllSyllabi = catchAsync(async (_req: Request, res: Response) => {
  const syllabi = await syllabusService.getAllSyllabi();
  res.send(syllabi);
});

// export const bulkAddModulesToSyllabus = catchAsync(async (req: Request, res: Response) => {
//   // Check if user is admin - only admins can bulk add modules
//   if (req.user && req.user.role !== 'admin') {
//     throw new ApiError(httpStatus.FORBIDDEN, 'Only admins can bulk add modules to syllabi');
//   }

//   const { category, moduleIds } = req.body;

//   if (typeof req.params['syllabusId'] === 'string') {
//     const syllabus = await syllabusService.bulkAddModulesToSyllabus(
//       new mongoose.Types.ObjectId(req.params['syllabusId']),
//       category,
//       moduleIds.map((id: string) => new mongoose.Types.ObjectId(id))
//     );
//     res.send(syllabus);
//   }
// });

// export const bulkAddModulesToMultipleSyllabi = catchAsync(async (req: Request, res: Response) => {
//   // Check if user is admin - only admins can bulk add modules
//   if (req.user && req.user.role !== 'admin') {
//     throw new ApiError(httpStatus.FORBIDDEN, 'Only admins can bulk add modules to syllabi');
//   }

//   const { bulkData } = req.body;

//   const processedData = bulkData.map((item: any) => ({
//     syllabusId: new mongoose.Types.ObjectId(item.syllabusId),
//     category: item.category,
//     moduleIds: item.moduleIds.map((id: string) => new mongoose.Types.ObjectId(id)),
//   }));

//   const syllabi = await syllabusService.bulkAddModulesToMultipleSyllabi(processedData);
//   res.send(syllabi);
// });
