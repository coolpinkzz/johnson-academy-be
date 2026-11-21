import express, { Router } from 'express';
import { auth } from '../../modules/auth';
import { validate } from '../../modules/validate';
import { studentFeeController, studentFeeValidation } from '../../modules/studentFee';

const router: Router = express.Router();

router.get('/sheets/link', auth('getStudentFees'), studentFeeController.getSpreadsheetLink);

router.get(
  '/students/:studentId',
  auth('getStudentFees'),
  validate(studentFeeValidation.getStudentFees),
  studentFeeController.getStudentFees
);
router.post(
  '/packages',
  auth('manageStudentFees'),
  validate(studentFeeValidation.createPackage),
  studentFeeController.createPackage
);
router.patch(
  '/packages/:packageId',
  auth('manageStudentFees'),
  validate(studentFeeValidation.updatePackage),
  studentFeeController.updatePackage
);
router.post(
  '/packages/:packageId/cancel',
  auth('manageStudentFees'),
  validate(studentFeeValidation.cancelPackage),
  studentFeeController.cancelPackage
);
router.post(
  '/packages/:packageId/payments',
  auth('manageStudentFees'),
  validate(studentFeeValidation.addPayment),
  studentFeeController.addPayment
);
router.post(
  '/payments/:paymentId/void',
  auth('manageStudentFees'),
  validate(studentFeeValidation.voidPayment),
  studentFeeController.voidPayment
);

export default router;
