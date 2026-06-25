import httpStatus from 'http-status';
import { Request, Response } from 'express';
import mongoose from 'mongoose';
import catchAsync from '../utils/catchAsync';
import ApiError from '../errors/ApiError';
import * as appVersionService from './appVersion.service';
import { AppPlatform } from './appVersion.interfaces';

export const checkVersion = catchAsync(async (req: Request, res: Response) => {
  const platform = req.query['platform'] as AppPlatform;
  const version = req.query['version'] as string;

  const result = await appVersionService.checkVersion(platform, version);

  res.set('Cache-Control', 'public, max-age=300');
  res.send(result);
});

export const createAppVersion = catchAsync(async (req: Request, res: Response) => {
  const config = await appVersionService.createAppVersion(req.body);
  res.status(httpStatus.CREATED).send(config);
});

export const getAppVersions = catchAsync(async (_req: Request, res: Response) => {
  const configs = await appVersionService.getAppVersions();
  res.send(configs);
});

export const getAppVersion = catchAsync(async (req: Request, res: Response) => {
  if (typeof req.params['appVersionId'] === 'string') {
    const config = await appVersionService.getAppVersionById(new mongoose.Types.ObjectId(req.params['appVersionId']));
    if (!config) {
      throw new ApiError(httpStatus.NOT_FOUND, 'App version config not found');
    }
    res.send(config);
  }
});

export const updateAppVersion = catchAsync(async (req: Request, res: Response) => {
  if (typeof req.params['appVersionId'] === 'string') {
    const config = await appVersionService.updateAppVersionById(
      new mongoose.Types.ObjectId(req.params['appVersionId']),
      req.body
    );
    res.send(config);
  }
});

export const deleteAppVersion = catchAsync(async (req: Request, res: Response) => {
  if (typeof req.params['appVersionId'] === 'string') {
    await appVersionService.deleteAppVersionById(new mongoose.Types.ObjectId(req.params['appVersionId']));
    res.status(httpStatus.NO_CONTENT).send();
  }
});
