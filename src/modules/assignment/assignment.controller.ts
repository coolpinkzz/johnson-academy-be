import httpStatus from 'http-status';
import { Request, Response } from 'express';
import mongoose from 'mongoose';
import catchAsync from '../utils/catchAsync';
import ApiError from '../errors/ApiError';
import pick from '../utils/pick';
import { IOptions } from '../paginate/paginate';
import * as assignmentService from './assignment.service';

export const createAssignment = catchAsync(async (req: Request, res: Response) => {
  // Set createdBy to current user if not provided
  if (!req.body.createdBy && req.user) {
    req.body.createdBy = req.user.id;
  }

  const assignment = await assignmentService.createAssignment(req.body);
  res.status(httpStatus.CREATED).send(assignment);
});

export const getAssignments = catchAsync(async (req: Request, res: Response) => {
  const filter = pick(req.query, ['students', 'classId', 'teacherId', 'status', 'title']);
  const options: IOptions = pick(req.query, ['sortBy', 'limit', 'page', 'projectBy']);
  const result = await assignmentService.queryAssignments(filter, options);
  res.send(result);
});

export const getAssignment = catchAsync(async (req: Request, res: Response) => {
  if (typeof req.params['assignmentId'] === 'string') {
    const assignment = await assignmentService.getAssignmentById(new mongoose.Types.ObjectId(req.params['assignmentId']));
    if (!assignment) {
      throw new ApiError(httpStatus.NOT_FOUND, 'Assignment not found');
    }
    res.send(assignment);
  }
});

export const getAssignmentsByStudent = catchAsync(async (req: Request, res: Response) => {
  if (typeof req.params['studentId'] === 'string') {
    const assignments = await assignmentService.getAssignmentsByStudentId(
      new mongoose.Types.ObjectId(req.params['studentId'])
    );
    res.send(assignments);
  }
});

export const getAssignmentsByClass = catchAsync(async (req: Request, res: Response) => {
  if (typeof req.params['classId'] === 'string') {
    const assignments = await assignmentService.getAssignmentsByClassId(new mongoose.Types.ObjectId(req.params['classId']));
    console.log('assignments', assignments);
    res.status(httpStatus.OK).send(assignments);
  }
});

export const getAssignmentsByTeacher = catchAsync(async (req: Request, res: Response) => {
  if (typeof req.params['teacherId'] === 'string') {
    const assignments = await assignmentService.getAssignmentsByTeacherId(
      new mongoose.Types.ObjectId(req.params['teacherId'])
    );
    res.send(assignments);
  }
});

export const updateAssignment = catchAsync(async (req: Request, res: Response) => {
  if (typeof req.params['assignmentId'] === 'string') {
    const assignment = await assignmentService.updateAssignmentById(
      new mongoose.Types.ObjectId(req.params['assignmentId']),
      req.body
    );
    res.send(assignment);
  }
});

export const deleteAssignment = catchAsync(async (req: Request, res: Response) => {
  if (typeof req.params['assignmentId'] === 'string') {
    await assignmentService.deleteAssignmentById(new mongoose.Types.ObjectId(req.params['assignmentId']));
    res.status(httpStatus.NO_CONTENT).send();
  }
});

export const getAllAssignments = catchAsync(async (_req: Request, res: Response) => {
  const assignments = await assignmentService.getAllAssignments();
  res.send(assignments);
});

export const submitAssignment = catchAsync(async (req: Request, res: Response) => {
  if (typeof req.params['assignmentId'] === 'string') {
    const { fileUrl } = req.body;
    const studentId = req.user?.id ? new mongoose.Types.ObjectId(req.user.id) : new mongoose.Types.ObjectId();

    const assignment = await assignmentService.submitAssignment(
      new mongoose.Types.ObjectId(req.params['assignmentId']),
      studentId,
      fileUrl
    );
    res.status(httpStatus.OK).send(assignment);
  }
});

export const gradeAssignment = catchAsync(async (req: Request, res: Response) => {
  if (typeof req.params['assignmentId'] === 'string') {
    const { studentId, grade, feedback } = req.body;

    const assignment = await assignmentService.gradeAssignment(
      new mongoose.Types.ObjectId(req.params['assignmentId']),
      new mongoose.Types.ObjectId(studentId),
      grade,
      feedback
    );
    res.status(httpStatus.OK).send(assignment);
  }
});

export const updateSubmission = catchAsync(async (req: Request, res: Response) => {
  if (typeof req.params['assignmentId'] === 'string') {
    const { studentId, ...updateBody } = req.body;

    const assignment = await assignmentService.updateSubmission(
      new mongoose.Types.ObjectId(req.params['assignmentId']),
      new mongoose.Types.ObjectId(studentId),
      updateBody
    );
    res.status(httpStatus.OK).send(assignment);
  }
});

export const getAssignmentsDueSoon = catchAsync(async (req: Request, res: Response) => {
  const days = req.query['days'] ? parseInt(req.query['days'] as string, 10) : 7;
  const assignments = await assignmentService.getAssignmentsDueSoon(days);
  res.send(assignments);
});

export const getOverdueAssignments = catchAsync(async (_req: Request, res: Response) => {
  const assignments = await assignmentService.getOverdueAssignments();
  res.send(assignments);
});

export const getMyAssignments = catchAsync(async (req: Request, res: Response) => {
  // Get assignments for the current user based on their role
  if (!req.user) {
    throw new ApiError(httpStatus.UNAUTHORIZED, 'User not authenticated');
  }

  let assignments;
  if (req.user.role === 'student') {
    assignments = await assignmentService.getAssignmentsByStudentId(new mongoose.Types.ObjectId(req.user.id));
  } else if (req.user.role === 'teacher') {
    assignments = await assignmentService.getAssignmentsByTeacherId(new mongoose.Types.ObjectId(req.user.id));
  } else {
    // Admin can see all assignments
    assignments = await assignmentService.getAllAssignments();
  }

  res.send(assignments);
});

export const getAssignmentsByClassAndStudent = catchAsync(async (req: Request, res: Response) => {
  if (typeof req.params['classId'] === 'string' && typeof req.params['studentId'] === 'string') {
    const assignments = await assignmentService.getAssignmentsByClassAndStudent(
      new mongoose.Types.ObjectId(req.params['classId']),
      new mongoose.Types.ObjectId(req.params['studentId'])
    );
    res.send(assignments);
  }
});
