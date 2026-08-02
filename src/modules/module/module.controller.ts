import httpStatus from 'http-status';
import { Request, Response } from 'express';
import mongoose from 'mongoose';
import catchAsync from '../utils/catchAsync';
import ApiError from '../errors/ApiError';
import pick from '../utils/pick';
import { IOptions } from '../paginate/paginate';
import * as moduleService from './module.service';
import { contentManagerRoles } from '../../config/roles';

const canManageContent = (role?: string): boolean =>
  !!role && (contentManagerRoles as readonly string[]).includes(role);

export const createModule = catchAsync(async (req: Request, res: Response) => {
  if (req.user && !canManageContent(req.user.role)) {
    throw new ApiError(httpStatus.FORBIDDEN, 'Only admin, aqsd, or master can create modules');
  }

  const module = await moduleService.createModule(req.body);
  res.status(httpStatus.CREATED).send(module);
});

export const createModulesBulk = catchAsync(async (req: Request, res: Response) => {
  if (req.user && !canManageContent(req.user.role)) {
    throw new ApiError(httpStatus.FORBIDDEN, 'Only admin, aqsd, or master can create modules');
  }

  const modules = await moduleService.createModulesBulk(req.body);
  res.status(httpStatus.CREATED).send(modules);
});

export const getModules = catchAsync(async (req: Request, res: Response) => {
  const filter = pick(req.query, ['title', 'type', 'syllabusId']);
  const options: IOptions = pick(req.query, ['sortBy', 'limit', 'page', 'projectBy']);
  const result = await moduleService.queryModules(filter, options);
  res.send(result);
});

export const getModule = catchAsync(async (req: Request, res: Response) => {
  if (typeof req.params['moduleId'] === 'string') {
    const module = await moduleService.getModuleByIdWithSyllabus(new mongoose.Types.ObjectId(req.params['moduleId']));
    if (!module) {
      throw new ApiError(httpStatus.NOT_FOUND, 'Module not found');
    }
    res.send(module);
  }
});

export const updateModule = catchAsync(async (req: Request, res: Response) => {
  if (req.user && !canManageContent(req.user.role)) {
    throw new ApiError(httpStatus.FORBIDDEN, 'Only admin, aqsd, or master can update modules');
  }

  if (typeof req.params['moduleId'] === 'string') {
    const module = await moduleService.updateModuleById(new mongoose.Types.ObjectId(req.params['moduleId']), req.body);
    res.send(module);
  }
});

export const deleteModule = catchAsync(async (req: Request, res: Response) => {
  if (req.user && !canManageContent(req.user.role)) {
    throw new ApiError(httpStatus.FORBIDDEN, 'Only admin, aqsd, or master can delete modules');
  }

  if (typeof req.params['moduleId'] === 'string') {
    await moduleService.deleteModuleById(new mongoose.Types.ObjectId(req.params['moduleId']));
    res.status(httpStatus.NO_CONTENT).send();
  }
});

export const getModulesBySyllabus = catchAsync(async (req: Request, res: Response) => {
  if (typeof req.params['syllabusId'] === 'string') {
    const modules = await moduleService.getModulesBySyllabusId(new mongoose.Types.ObjectId(req.params['syllabusId']));
    res.send(modules);
  }
});

export const getModulesByType = catchAsync(async (req: Request, res: Response) => {
  const { type } = req.params;
  if (type && ['theory', 'technical', 'learning', 'others'].includes(type)) {
    const modules = await moduleService.getModulesByType(type as 'theory' | 'technical' | 'learning' | 'others');
    res.send(modules);
  } else {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Invalid module type');
  }
});
