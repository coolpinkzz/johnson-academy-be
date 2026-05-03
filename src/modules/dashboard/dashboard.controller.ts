import httpStatus from 'http-status';
import { Request, Response } from 'express';
import catchAsync from '../utils/catchAsync';
import * as dashboardService from './dashboard.service';

export const getAggregates = catchAsync(async (_req: Request, res: Response) => {
  const aggregates = await dashboardService.getDashboardAggregates();
  res.status(httpStatus.OK).send(aggregates);
});
