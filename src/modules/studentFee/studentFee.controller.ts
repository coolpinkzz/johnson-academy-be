import { Request, Response } from 'express';
import mongoose from 'mongoose';
import catchAsync from '../utils/catchAsync';
import * as studentFeeService from './studentFee.service';
import * as googleSheetsService from './googleSheets.service';

const recordedBy = (req: Request) => ({ id: req.user.id, name: req.user.name });

export const getStudentFees = catchAsync(async (req: Request, res: Response) => {
  const result = await studentFeeService.getStudentFees(new mongoose.Types.ObjectId(req.params['studentId']));
  res.send(result);
});

export const createPackage = catchAsync(async (req: Request, res: Response) => {
  const result = await studentFeeService.createPackage(req.body, recordedBy(req));
  await googleSheetsService.syncSheetsAfterWrite();
  res.status(201).send(result);
});

export const updatePackage = catchAsync(async (req: Request, res: Response) => {
  const result = await studentFeeService.updatePackage(new mongoose.Types.ObjectId(req.params['packageId']), req.body);
  await googleSheetsService.syncSheetsAfterWrite();
  res.send(result);
});

export const cancelPackage = catchAsync(async (req: Request, res: Response) => {
  const result = await studentFeeService.cancelPackage(
    new mongoose.Types.ObjectId(req.params['packageId']),
    req.body.reason
  );
  await googleSheetsService.syncSheetsAfterWrite();
  res.send(result);
});

export const addPayment = catchAsync(async (req: Request, res: Response) => {
  const result = await studentFeeService.addPayment(
    new mongoose.Types.ObjectId(req.params['packageId']),
    req.body,
    recordedBy(req)
  );
  await googleSheetsService.syncSheetsAfterWrite();
  res.send(result);
});

export const voidPayment = catchAsync(async (req: Request, res: Response) => {
  const result = await studentFeeService.voidPayment(new mongoose.Types.ObjectId(req.params['paymentId']), req.body.reason);
  await googleSheetsService.syncSheetsAfterWrite();
  res.send(result);
});

export const getSpreadsheetLink = catchAsync(async (_req: Request, res: Response) => {
  res.send(await googleSheetsService.getSpreadsheetLink());
});
