import express from 'express';
import auth from '../../modules/auth/auth.middleware';
import validate from '../../modules/validate/validate.middleware';
import * as mrtValidation from '../../modules/mrt/mrt.validation';
import * as mrtController from '../../modules/mrt/mrt.controller';
import * as reportingController from '../../modules/mrt/mrt.reporting.controller';
import * as reportingValidation from '../../modules/mrt/mrt.reporting.validation';

const router = express.Router();

router.post('/', auth('manageMRT'), validate(mrtValidation.createMRT), mrtController.createMRT);

router.get(
  '/reporting/dashboard',
  auth('getMRT'),
  validate(reportingValidation.getMrtReportingDashboard),
  reportingController.getDashboard
);
router.get(
  '/reporting/summary',
  auth('getMRT'),
  validate(reportingValidation.getMrtReportingSummary),
  reportingController.getSummary
);
router.get(
  '/reporting/branches',
  auth('getMRT'),
  validate(reportingValidation.getMrtBranchLeaderboard),
  reportingController.getBranches
);
router.get(
  '/reporting/teachers',
  auth('getMRT'),
  validate(reportingValidation.getMrtTeacherLeaderboard),
  reportingController.getTeachers
);
router.get(
  '/reporting/months',
  auth('getMRT'),
  validate(reportingValidation.getMrtMonthLeaderboard),
  reportingController.getMonths
);
router.get(
  '/reporting/instruments',
  auth('getMRT'),
  validate(reportingValidation.getMrtInstrumentLeaderboard),
  reportingController.getInstruments
);
router.get(
  '/reporting/records',
  auth('getMRT'),
  validate(reportingValidation.getMrtReportingRecords),
  reportingController.getRecords
);

router.get('/', mrtController.getMRTs);

/**
 * @route GET /v1/mrt/:mrtId
 * @desc Get MRT by ID
 * @access Public
 */
router.get('/:mrtId', validate(mrtValidation.getMRT), mrtController.getMRT);

/**
 * @route PATCH /v1/mrt/:mrtId
 * @desc Update MRT by ID
 * @access Private (Teacher/Admin only)
 */
router.patch('/:mrtId', auth('manageMRT'), validate(mrtValidation.updateMRT), mrtController.updateMRT);

/**
 * @route DELETE /v1/mrt/:mrtId
 * @desc Delete MRT by ID
 * @access Private (Teacher/Admin only)
 */
router.delete('/:mrtId', auth('manageMRT'), validate(mrtValidation.deleteMRT), mrtController.deleteMRT);

/**
 * @route GET /v1/mrt/student/:studentId
 * @desc Get MRT records by student ID
 * @access Public
 */
router.get('/student/:studentId', validate(mrtValidation.getMRTsByStudent), mrtController.getMRTsByStudent);

/**
 * @route GET /v1/mrt/class/:classId
 * @desc Get MRT records by class ID
 * @access Public
 */
router.get('/class/:classId', validate(mrtValidation.getMRTsByClass), mrtController.getMRTsByClass);

/**
 * @route GET /v1/mrt/month/:month
 * @desc Get MRT records by month
 * @access Public
 */
router.get('/month/:month', validate(mrtValidation.getMRTsByMonth), mrtController.getMRTsByMonth);

/**
 * @route GET /v1/mrt/student/:studentId/class/:classId/month/:month
 * @desc Get MRT by student, class, course, and month
 * @access Public
 */
router.get(
  '/student/:studentId/class/:classId/month/:month',
  validate(mrtValidation.getMRTByStudentClassMonth),
  mrtController.getMRTByStudentClassMonth
);

export default router;
