import { Request, Response } from 'express';
import httpStatus from 'http-status';
import catchAsync from '../utils/catchAsync';
import ApiError from '../errors/ApiError';
import { staffRoles } from '../../config/roles';
import { IUserDoc } from '../user/user.interfaces';
import { LeaderboardSortField, MonthSortField, RecordSortField, ReportStatus, SortOrder } from './mrt.reporting.interfaces';
import * as reportingService from './mrt.reporting.service';

const requireStaff = (req: Request): IUserDoc => {
  if (!req.user) {
    throw new ApiError(httpStatus.UNAUTHORIZED, 'Please authenticate');
  }
  if (!(staffRoles as readonly string[]).includes(req.user.role)) {
    throw new ApiError(httpStatus.FORBIDDEN, 'Forbidden');
  }
  return req.user;
};

const readString = (value: unknown): string | undefined => {
  if (typeof value !== 'string') return undefined;
  const trimmed = value.trim();
  return trimmed === '' ? undefined : trimmed;
};

const readNumber = (value: unknown): number | undefined => {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string' && value.trim() !== '' && Number.isFinite(Number(value))) {
    return Number(value);
  }
  return undefined;
};

const reportingQuery = (req: Request): reportingService.ReportingQuery => {
  const query: reportingService.ReportingQuery = {};
  const branch = readString(req.query['branch']);
  const teacherId = readString(req.query['teacherId']);
  const instrument = readString(req.query['instrument']);
  const month = readString(req.query['month']);
  const monthFrom = readString(req.query['monthFrom']);
  const monthTo = readString(req.query['monthTo']);
  if (branch) query.branch = branch;
  if (teacherId) query.teacherId = teacherId;
  if (instrument) query.instrument = instrument;
  if (month) query.month = month;
  if (monthFrom) query.monthFrom = monthFrom;
  if (monthTo) query.monthTo = monthTo;
  return query;
};

const actorOf = (user: IUserDoc): reportingService.ReportingActor => ({
  role: user.role,
  ...(user.branchAccess != null ? { branchAccess: user.branchAccess } : {}),
});

export const getDashboard = catchAsync(async (req: Request, res: Response) => {
  const actor = actorOf(requireStaff(req));
  res.status(httpStatus.OK).send(await reportingService.getMrtReportingDashboard(actor, reportingQuery(req)));
});

export const getSummary = catchAsync(async (req: Request, res: Response) => {
  const actor = actorOf(requireStaff(req));
  res.status(httpStatus.OK).send(await reportingService.getMrtReportingSummary(actor, reportingQuery(req)));
});

export const getBranches = catchAsync(async (req: Request, res: Response) => {
  const actor = actorOf(requireStaff(req));
  const sortBy = readString(req.query['sortBy']) as LeaderboardSortField | undefined;
  const sortOrder = readString(req.query['sortOrder']) as SortOrder | undefined;
  res.status(httpStatus.OK).send(
    await reportingService.getMrtBranchLeaderboard(actor, {
      ...reportingQuery(req),
      ...(sortBy ? { sortBy } : {}),
      ...(sortOrder ? { sortOrder } : {}),
    })
  );
});

export const getTeachers = catchAsync(async (req: Request, res: Response) => {
  const actor = actorOf(requireStaff(req));
  const sortBy = readString(req.query['sortBy']) as LeaderboardSortField | undefined;
  const sortOrder = readString(req.query['sortOrder']) as SortOrder | undefined;
  res.status(httpStatus.OK).send(
    await reportingService.getMrtTeacherLeaderboard(actor, {
      ...reportingQuery(req),
      ...(sortBy ? { sortBy } : {}),
      ...(sortOrder ? { sortOrder } : {}),
    })
  );
});

export const getMonths = catchAsync(async (req: Request, res: Response) => {
  const actor = actorOf(requireStaff(req));
  const sortBy = readString(req.query['sortBy']) as MonthSortField | undefined;
  const sortOrder = readString(req.query['sortOrder']) as SortOrder | undefined;
  res.status(httpStatus.OK).send(
    await reportingService.getMrtMonthLeaderboard(actor, {
      ...reportingQuery(req),
      ...(sortBy ? { sortBy } : {}),
      ...(sortOrder ? { sortOrder } : {}),
    })
  );
});

export const getInstruments = catchAsync(async (req: Request, res: Response) => {
  const actor = actorOf(requireStaff(req));
  const sortBy = readString(req.query['sortBy']) as LeaderboardSortField | undefined;
  const sortOrder = readString(req.query['sortOrder']) as SortOrder | undefined;
  res.status(httpStatus.OK).send(
    await reportingService.getMrtInstrumentLeaderboard(actor, {
      ...reportingQuery(req),
      ...(sortBy ? { sortBy } : {}),
      ...(sortOrder ? { sortOrder } : {}),
    })
  );
});

export const getRecords = catchAsync(async (req: Request, res: Response) => {
  const actor = actorOf(requireStaff(req));
  const search = readString(req.query['search']);
  const status = readString(req.query['status']) as ReportStatus | undefined;
  const sortBy = readString(req.query['sortBy']) as RecordSortField | undefined;
  const sortOrder = readString(req.query['sortOrder']) as SortOrder | undefined;
  const page = readNumber(req.query['page']);
  const limit = readNumber(req.query['limit']);
  res.status(httpStatus.OK).send(
    await reportingService.getMrtReportingRecords(actor, {
      ...reportingQuery(req),
      ...(search ? { search } : {}),
      ...(status ? { status } : {}),
      ...(sortBy ? { sortBy } : {}),
      ...(sortOrder ? { sortOrder } : {}),
      ...(page != null ? { page } : {}),
      ...(limit != null ? { limit } : {}),
    })
  );
});
