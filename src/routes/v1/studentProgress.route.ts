import express from 'express';
import auth from '../../modules/auth/auth.middleware';
import validate from '../../modules/validate/validate.middleware';
import * as studentProgressValidation from '../../modules/studentProgress/studentProgress.validation';
import * as studentProgressController from '../../modules/studentProgress/studentProgress.controller';

const router = express.Router();

router
  .route('/')
  .get(
    auth('getStudentProgress'),
    validate(studentProgressValidation.getStudentProgress),
    studentProgressController.getStudentProgress
  );

router
  .route('/:studentProgressId')
  .get(
    auth('getStudentProgress'),
    validate(studentProgressValidation.getStudentProgressById),
    studentProgressController.getStudentProgressById
  )
  .patch(
    auth('manageStudentProgress'),
    validate(studentProgressValidation.updateStudentProgress),
    studentProgressController.updateStudentProgress
  )
  .delete(
    auth('manageStudentProgress'),
    validate(studentProgressValidation.deleteStudentProgress),
    studentProgressController.deleteStudentProgress
  );

router
  .route('/:studentProgressId/module')
  .patch(
    auth('manageStudentProgress'),
    validate(studentProgressValidation.updateModuleProgress),
    studentProgressController.updateModuleProgress
  );

router
  .route('/:studentProgressId/start-module')
  .post(
    auth('manageStudentProgress'),
    validate(studentProgressValidation.startModule),
    studentProgressController.startModule
  );

router
  .route('/:studentProgressId/end-module')
  .post(
    auth('manageStudentProgress'),
    validate(studentProgressValidation.endModule),
    studentProgressController.endModule
  );

router
  .route('/student/:studentId')
  .get(
    auth('getStudentProgress'),
    validate(studentProgressValidation.getStudentProgressByStudent),
    studentProgressController.getStudentProgressByStudent
  );

router
  .route('/class/:classId')
  .get(
    auth('getStudentProgress'),
    validate(studentProgressValidation.getStudentProgressByClass),
    studentProgressController.getStudentProgressByClass
  );

router
  .route('/course/:courseId')
  .get(
    auth('getStudentProgress'),
    validate(studentProgressValidation.getStudentProgressByCourse),
    studentProgressController.getStudentProgressByCourse
  );

router
  .route('/student/:studentId/class/:classId')
  .get(
    auth('getStudentProgress'),
    validate(studentProgressValidation.getStudentProgressByStudentAndClass),
    studentProgressController.getStudentProgressByStudentAndClass
  );

router
  .route('/class/:classId/statistics')
  .get(
    auth('getStudentProgress'),
    validate(studentProgressValidation.getClassProgressStatistics),
    studentProgressController.getClassProgressStatistics
  );

router
  .route('/course/:courseId/statistics')
  .get(
    auth('getStudentProgress'),
    validate(studentProgressValidation.getCourseProgressStatistics),
    studentProgressController.getCourseProgressStatistics
  );

export default router; 