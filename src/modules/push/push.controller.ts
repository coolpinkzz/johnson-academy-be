import httpStatus from 'http-status';
import { Request, Response } from 'express';
import catchAsync from '../utils/catchAsync';
import * as pushService from './push.service';

export const registerToken = catchAsync(async (req: Request, res: Response) => {
  const deviceToken = await pushService.registerToken(req.user.id, req.body);
  res.status(httpStatus.OK).send({
    id: deviceToken.id,
    platform: deviceToken.platform,
  });
});

export const unregisterToken = catchAsync(async (req: Request, res: Response) => {
  await pushService.unregisterToken(req.user.id, req.body.token);
  res.status(httpStatus.NO_CONTENT).send();
});
