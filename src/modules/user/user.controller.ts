import httpStatus from 'http-status';
import { Request, Response } from 'express';
import mongoose from 'mongoose';
import catchAsync from '../utils/catchAsync';
import ApiError from '../errors/ApiError';
import pick from '../utils/pick';
import { IOptions } from '../paginate/paginate';
import * as userService from './user.service';
import { staffRoles } from '../../config/roles';
import { canAccessStudentRollNumber, resolveStudentBranchScope } from './rollNumber.util';
import { IUserDoc } from './user.interfaces';

const isStaffRole = (role: unknown): role is (typeof staffRoles)[number] =>
  typeof role === 'string' && (staffRoles as readonly string[]).includes(role);

const assertCanViewStudent = (actor: IUserDoc | undefined, rollNumber?: string | null) => {
  if (!actor) {
    throw new ApiError(httpStatus.UNAUTHORIZED, 'Please authenticate');
  }
  if (!canAccessStudentRollNumber(actor, rollNumber)) {
    throw new ApiError(httpStatus.FORBIDDEN, 'You do not have access to this student branch');
  }
};

const applyStudentBranchAccess = (req: Request, filter: Record<string, any>) => {
  if (filter['role'] !== 'student') {
    return;
  }

  const requestedBranch = filter['branch'] != null ? String(filter['branch']) : undefined;
  delete filter['branch'];

  const scope = resolveStudentBranchScope(
    {
      role: req.user?.role,
      ...(req.user?.branchAccess != null ? { branchAccess: req.user.branchAccess } : {}),
    },
    requestedBranch
  );

  if (scope.type === 'none') {
    if (requestedBranch) {
      throw new ApiError(httpStatus.FORBIDDEN, 'You do not have access to this branch');
    }
    filter['branchIn'] = [];
    return;
  }

  if (scope.type === 'branches') {
    filter['branchIn'] = scope.branches;
  }
};

export const createUser = catchAsync(async (req: Request, res: Response) => {
  if (isStaffRole(req.body.role) && req.user?.role !== 'master') {
    throw new ApiError(httpStatus.FORBIDDEN, 'Only master can create admin, aqsd, or master users');
  }

  const user = await userService.createUser(req.body);
  res.status(httpStatus.CREATED).send(user);
});

export const getUsers = catchAsync(async (req: Request, res: Response) => {
  const filter = pick(req.query, ['name', 'role', 'rollNumber', 'branch']);
  applyStudentBranchAccess(req, filter);
  const options: IOptions = pick(req.query, ['sortBy', 'limit', 'page', 'projectBy']);
  const result = await userService.queryUsers(filter, options);
  res.send(result);
});

export const getUser = catchAsync(async (req: Request, res: Response) => {
  if (typeof req.params['userId'] === 'string') {
    const user = await userService.getUserById(new mongoose.Types.ObjectId(req.params['userId']));
    if (!user) {
      throw new ApiError(httpStatus.NOT_FOUND, 'User not found');
    }
    if (user.role === 'student') {
      assertCanViewStudent(req.user, user.rollNumber);
    }
    res.send(user);
  }
});

export const updateUser = catchAsync(async (req: Request, res: Response) => {
  if (typeof req.params['userId'] !== 'string') {
    return;
  }

  const targetUserId = new mongoose.Types.ObjectId(req.params['userId']);
  const actor = req.user;

  if (req.body.role !== undefined) {
    if (actor?.role !== 'master') {
      throw new ApiError(httpStatus.FORBIDDEN, 'Only master can change staff roles');
    }
    if (!isStaffRole(req.body.role)) {
      throw new ApiError(httpStatus.BAD_REQUEST, 'Role must be admin, aqsd, or master');
    }
    if (actor._id.equals(targetUserId) && req.body.role !== 'master') {
      throw new ApiError(httpStatus.BAD_REQUEST, 'You cannot change your own master role');
    }
  }

  if (req.body.branchAccess !== undefined && actor?.role !== 'master') {
    throw new ApiError(httpStatus.FORBIDDEN, 'Only master can update branch access');
  }

  const user = await userService.updateUserById(targetUserId, req.body);
  res.send(user);
});
/**
 * Delete user with cascade deletion
 * This will delete the user and all related records in other collections
 * including: StudentProgress, StudentAttendance, MRT, Token, and remove from Classes
 */
export const deleteUser = catchAsync(async (req: Request, res: Response) => {
  if (typeof req.params['userId'] === 'string') {
    await userService.deleteUserById(new mongoose.Types.ObjectId(req.params['userId']));
    res.status(httpStatus.NO_CONTENT).send();
  }
});

export const getUsersByRole = catchAsync(async (req: Request, res: Response) => {
  const { role } = req.query;
  if (typeof role === 'string') {
    const users = await userService.getUsersByRole(role);
    res.send(users);
  }
});

export const getStudentsByGradeLevel = catchAsync(async (req: Request, res: Response) => {
  const { gradeLevel } = req.query;
  if (typeof gradeLevel === 'string') {
    const students = await userService.getStudentsByGradeLevel(gradeLevel);
    res.send(students);
  }
});

export const getTeachersByDepartment = catchAsync(async (req: Request, res: Response) => {
  const { department } = req.query;
  if (typeof department === 'string') {
    const teachers = await userService.getTeachersByDepartment(department);
    res.send(teachers);
  }
});

export const getUserByStudentId = catchAsync(async (req: Request, res: Response) => {
  const { studentId } = req.params;
  if (typeof studentId === 'string') {
    const user = await userService.getUserByStudentId(studentId);
    if (!user) {
      throw new ApiError(httpStatus.NOT_FOUND, 'Student not found');
    }
    assertCanViewStudent(req.user, user.rollNumber);
    res.send(user);
  }
});

export const getUserByTeacherId = catchAsync(async (req: Request, res: Response) => {
  const { teacherId } = req.params;
  if (typeof teacherId === 'string') {
    const user = await userService.getUserByTeacherId(teacherId);
    if (!user) {
      throw new ApiError(httpStatus.NOT_FOUND, 'Teacher not found');
    }
    res.send(user);
  }
});
