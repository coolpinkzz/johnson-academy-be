import httpStatus from 'http-status';
import { Request, Response } from 'express';
import mongoose from 'mongoose';
import catchAsync from '../utils/catchAsync';
import ApiError from '../errors/ApiError';
import pick from '../utils/pick';
import { IOptions } from '../paginate/paginate';
import { IUserDoc } from '../user/user.interfaces';
import { canAccessStudentRollNumber, resolveStudentBranchScope } from '../user/rollNumber.util';
import { queryStudentAuditLogs } from '../auditLog/auditLog.service';
import * as studentFeeService from './studentFee.service';
import { PackageListFilter } from './studentFee.interfaces';

const requireActor = (req: Request): IUserDoc => {
  if (!req.user) {
    throw new ApiError(httpStatus.UNAUTHORIZED, 'Please authenticate');
  }
  return req.user;
};

const toObjectId = (value: unknown, name: string): mongoose.Types.ObjectId => {
  if (typeof value !== 'string') {
    throw new ApiError(httpStatus.BAD_REQUEST, `${name} is required`);
  }
  return new mongoose.Types.ObjectId(value);
};

const assertCanAccessStudent = (actor: IUserDoc, student: { rollNumber?: string }): void => {
  if (!canAccessStudentRollNumber(actor, student.rollNumber)) {
    throw new ApiError(httpStatus.FORBIDDEN, 'You do not have access to this student branch');
  }
};

/** Branches the actor may list; undefined = unrestricted, [] = none. */
const resolveBranchIn = (actor: IUserDoc, requestedBranch: unknown): string[] | undefined => {
  const requested = requestedBranch != null ? String(requestedBranch) : undefined;
  const scope = resolveStudentBranchScope(
    { role: actor.role, ...(actor.branchAccess != null ? { branchAccess: actor.branchAccess } : {}) },
    requested
  );
  if (scope.type === 'none') {
    if (requested) {
      throw new ApiError(httpStatus.FORBIDDEN, 'You do not have access to this branch');
    }
    return [];
  }
  return scope.type === 'branches' ? scope.branches : undefined;
};

export const listPackages = catchAsync(async (req: Request, res: Response) => {
  const actor = requireActor(req);
  const query = pick(req.query, ['search', 'courseId', 'renewalStatus', 'withinDays', 'paymentStatus']);
  const branchIn = resolveBranchIn(actor, req.query['branch']);
  const filter: PackageListFilter = {
    ...query,
    ...(query.withinDays !== undefined ? { withinDays: Number(query.withinDays) } : {}),
    ...(branchIn ? { branchIn } : {}),
  };
  const options: IOptions = pick(req.query, ['sortBy', 'limit', 'page']);
  res.send(await studentFeeService.queryLatestPackages(filter, options));
});

export const listStudentsWithoutPackage = catchAsync(async (req: Request, res: Response) => {
  const actor = requireActor(req);
  const filter = pick(req.query, ['name', 'rollNumber']);
  const branchIn = resolveBranchIn(actor, req.query['branch']);
  if (branchIn) {
    filter.branchIn = branchIn;
  }
  const options: IOptions = pick(req.query, ['sortBy', 'limit', 'page']);
  res.send(await studentFeeService.queryStudentsWithoutPackage(filter, options));
});

export const getStudentFees = catchAsync(async (req: Request, res: Response) => {
  const actor = requireActor(req);
  const studentId = toObjectId(req.params['studentId'], 'studentId');
  assertCanAccessStudent(actor, await studentFeeService.getStudentById(studentId));
  res.send(await studentFeeService.getStudentFees(studentId));
});

export const getStudentFeeHistory = catchAsync(async (req: Request, res: Response) => {
  const actor = requireActor(req);
  const studentId = toObjectId(req.params['studentId'], 'studentId');
  assertCanAccessStudent(actor, await studentFeeService.getStudentById(studentId));
  const options: IOptions = pick(req.query, ['limit', 'page']);
  res.send(await queryStudentAuditLogs(studentId, options));
});

export const createPackage = catchAsync(async (req: Request, res: Response) => {
  const actor = requireActor(req);
  assertCanAccessStudent(actor, await studentFeeService.getStudentById(toObjectId(req.body.studentId, 'studentId')));
  const pkg = await studentFeeService.createPackage(req.body, actor._id);
  res.status(httpStatus.CREATED).send(pkg);
});

export const updatePackage = catchAsync(async (req: Request, res: Response) => {
  const actor = requireActor(req);
  const packageId = toObjectId(req.params['packageId'], 'packageId');
  assertCanAccessStudent(actor, await studentFeeService.getStudentForPackage(packageId));
  res.send(await studentFeeService.updatePackage(packageId, req.body, actor._id));
});

export const cancelPackage = catchAsync(async (req: Request, res: Response) => {
  const actor = requireActor(req);
  const packageId = toObjectId(req.params['packageId'], 'packageId');
  assertCanAccessStudent(actor, await studentFeeService.getStudentForPackage(packageId));
  res.send(await studentFeeService.cancelPackage(packageId, req.body.reason, actor._id));
});

export const addPayment = catchAsync(async (req: Request, res: Response) => {
  const actor = requireActor(req);
  const packageId = toObjectId(req.params['packageId'], 'packageId');
  assertCanAccessStudent(actor, await studentFeeService.getStudentForPackage(packageId));
  const pkg = await studentFeeService.addPayment(packageId, req.body, actor._id);
  res.status(httpStatus.CREATED).send(pkg);
});

export const voidPayment = catchAsync(async (req: Request, res: Response) => {
  const actor = requireActor(req);
  const paymentId = toObjectId(req.params['paymentId'], 'paymentId');
  assertCanAccessStudent(actor, await studentFeeService.getStudentForPayment(paymentId));
  res.send(await studentFeeService.voidPayment(paymentId, req.body.reason, actor._id));
});
