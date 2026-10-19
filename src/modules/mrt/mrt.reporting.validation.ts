import Joi from 'joi';
import { CLASS_BRANCH_VALUES } from '../classes/classes.interfaces';
import { objectId } from '../validate/custom.validation';
import { UNASSIGNED_BRANCH, UNASSIGNED_TEACHER_ID } from './mrt.reporting.interfaces';

const month = Joi.string()
  .pattern(/^\d{4}-(0[1-9]|1[0-2])$/)
  .message('Month must be in format YYYY-MM');

const reportingFilters = {
  branch: Joi.string().valid(...CLASS_BRANCH_VALUES, UNASSIGNED_BRANCH),
  teacherId: Joi.alternatives().try(Joi.string().valid(UNASSIGNED_TEACHER_ID), Joi.string().custom(objectId)),
  instrument: Joi.string().trim().max(80),
  month,
  monthFrom: month,
  monthTo: month,
};

const leaderboardSort = {
  sortBy: Joi.string()
    .valid(
      'name',
      'eligibleStudents',
      'expected',
      'submitted',
      'missing',
      'completionPercentage',
      'averageTotalScore',
      'averageScore'
    )
    .default('completionPercentage'),
  sortOrder: Joi.string().valid('asc', 'desc').default('desc'),
};

export const getMrtReportingDashboard = {
  query: Joi.object().keys(reportingFilters),
};

export const getMrtReportingSummary = {
  query: Joi.object().keys(reportingFilters),
};

export const getMrtBranchLeaderboard = {
  query: Joi.object().keys({
    ...reportingFilters,
    ...leaderboardSort,
  }),
};

export const getMrtTeacherLeaderboard = {
  query: Joi.object().keys({
    ...reportingFilters,
    ...leaderboardSort,
  }),
};

export const getMrtMonthLeaderboard = {
  query: Joi.object().keys({
    ...reportingFilters,
    sortBy: Joi.string().valid('month', 'expected', 'submitted', 'missing', 'completionPercentage').default('month'),
    sortOrder: Joi.string().valid('asc', 'desc').default('asc'),
  }),
};

export const getMrtInstrumentLeaderboard = {
  query: Joi.object().keys({
    ...reportingFilters,
    ...leaderboardSort,
  }),
};

export const getMrtReportingRecords = {
  query: Joi.object().keys({
    ...reportingFilters,
    search: Joi.string().trim().max(100).allow(''),
    status: Joi.string().valid('submitted', 'missing'),
    sortBy: Joi.string()
      .valid(
        'studentName',
        'rollNumber',
        'branchName',
        'className',
        'instrument',
        'month',
        'status',
        'submittedAt',
        'teacherName',
        'totalScore',
        'averageScore'
      )
      .default('month'),
    sortOrder: Joi.string().valid('asc', 'desc').default('desc'),
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(100).default(20),
  }),
};
