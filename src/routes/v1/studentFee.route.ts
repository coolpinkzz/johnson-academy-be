import express, { Router } from 'express';
import { validate } from '../../modules/validate';
import { auth } from '../../modules/auth';
import { studentFeeController, studentFeeValidation } from '../../modules/studentFee';

const router: Router = express.Router();

router
  .route('/packages')
  .get(auth('getStudentFees'), validate(studentFeeValidation.listPackages), studentFeeController.listPackages)
  .post(auth('manageStudentFees'), validate(studentFeeValidation.createPackage), studentFeeController.createPackage);

router
  .route('/packages/:packageId')
  .patch(auth('manageStudentFees'), validate(studentFeeValidation.updatePackage), studentFeeController.updatePackage);

router
  .route('/packages/:packageId/cancel')
  .post(auth('manageStudentFees'), validate(studentFeeValidation.cancelPackage), studentFeeController.cancelPackage);

router
  .route('/packages/:packageId/payments')
  .post(auth('manageStudentFees'), validate(studentFeeValidation.addPayment), studentFeeController.addPayment);

router
  .route('/payments/:paymentId/void')
  .post(auth('manageStudentFees'), validate(studentFeeValidation.voidPayment), studentFeeController.voidPayment);

router
  .route('/students/without-package')
  .get(
    auth('getStudentFees'),
    validate(studentFeeValidation.listStudentsWithoutPackage),
    studentFeeController.listStudentsWithoutPackage
  );

router
  .route('/students/:studentId')
  .get(auth('getStudentFees'), validate(studentFeeValidation.getStudentFees), studentFeeController.getStudentFees);

router
  .route('/students/:studentId/history')
  .get(
    auth('getStudentFees'),
    validate(studentFeeValidation.getStudentFeeHistory),
    studentFeeController.getStudentFeeHistory
  );

export default router;
