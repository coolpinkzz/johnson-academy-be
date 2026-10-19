import mongoose, { PipelineStage } from 'mongoose';
import httpStatus from 'http-status';
import Classes from '../classes/classes.model';
import { IClasses } from '../classes/classes.interfaces';
import ApiError from '../errors/ApiError';
import StudentProgress from '../studentProgress/studentProgress.model';
import User from '../user/user.model';
import Course from '../course/course.model';
import MRT from './mrt.model';
import {
  AppliedReportingFilters,
  BranchLeaderboardRow,
  InstrumentLeaderboardRow,
  LeaderboardSortField,
  MonthComparison,
  MonthLeaderboardRow,
  MonthSortField,
  REPORTING_NOTES,
  RecordSortField,
  ReportFact,
  ReportStatus,
  ReportingEnrollment,
  ReportingFilterInput,
  ReportingFilterOptions,
  ReportingRecord,
  SortOrder,
  TeacherLeaderboardRow,
  UNASSIGNED_BRANCH,
  UNASSIGNED_TEACHER_ID,
} from './mrt.reporting.interfaces';
import {
  ReportingValidationError,
  aggregateByBranch,
  aggregateByInstrument,
  aggregateByMonth,
  aggregateByTeacher,
  buildFilterOptions,
  buildMonthComparison,
  buildReportFacts,
  describeAppliedFilters,
  enumerateMonths,
  paginateFacts,
  resolveMonthRange,
  resolveReportingBranches,
  shiftMonth,
  sortLeaderboard,
  sortMonths,
  summarizeFacts,
} from './mrt.reporting.util';

export interface ReportingActor {
  role?: string;
  branchAccess?: number[];
}

export interface ReportingQuery {
  branch?: string;
  teacherId?: string;
  instrument?: string;
  month?: string;
  monthFrom?: string;
  monthTo?: string;
}

export interface MrtReportingDashboard {
  filters: AppliedReportingFilters;
  notes: readonly string[];
  options: ReportingFilterOptions;
  summary: ReturnType<typeof summarizeFacts>;
  comparison: MonthComparison;
  branches: BranchLeaderboardRow[];
  teachers: TeacherLeaderboardRow[];
  months: MonthLeaderboardRow[];
  instruments: InstrumentLeaderboardRow[];
}

export interface MrtReportingRecords {
  filters: AppliedReportingFilters;
  results: ReportingRecord[];
  page: number;
  limit: number;
  totalPages: number;
  totalResults: number;
}

interface RawReport {
  _id: mongoose.Types.ObjectId;
  month?: string;
  createdAt?: Date;
  totalScore?: number;
  averageScore?: number;
}

interface RawEnrollmentRow {
  studentId: mongoose.Types.ObjectId;
  studentName?: string;
  rollNumber?: string | null;
  classId: mongoose.Types.ObjectId;
  className?: string;
  branch?: string | null;
  teachers?: mongoose.Types.ObjectId[];
  teacherId?: mongoose.Types.ObjectId | null;
  courseId: mongoose.Types.ObjectId;
  courseName?: string;
  instrument?: string | null;
  enrolledAt?: Date;
  reports?: RawReport[];
}

interface ReportingContext {
  applied: AppliedReportingFilters;
  filters: ReportingFilterInput;
  rangeMonths: string[];
  enrollments: ReportingEnrollment[];
  teacherNames: Map<string, string>;
  options: ReportingFilterOptions;
}

const toReportingError = (error: unknown): Error => {
  if (error instanceof ReportingValidationError) {
    return new ApiError(error.statusCode, error.message);
  }
  if (error instanceof Error) return error;
  return new ApiError(httpStatus.INTERNAL_SERVER_ERROR, 'MRT reporting failed');
};

const buildClassBranchQuery = (branches: string[]): mongoose.FilterQuery<IClasses> => {
  const concrete = branches.filter((branch) => branch !== UNASSIGNED_BRANCH);
  const wantsUnassigned = branches.includes(UNASSIGNED_BRANCH);
  const clauses: mongoose.FilterQuery<IClasses>[] = [];
  if (concrete.length > 0) {
    clauses.push({ branch: { $in: concrete } });
  }
  if (wantsUnassigned) {
    clauses.push({ branch: { $in: [null, ''] } });
    clauses.push({ branch: { $exists: false } });
  }
  const only = clauses[0];
  if (clauses.length === 1 && only) return only;
  return { $or: clauses };
};

const mapEnrollment = (row: RawEnrollmentRow): ReportingEnrollment => {
  const teacherIds = new Set<string>();
  (row.teachers ?? []).forEach((teacherId) => {
    teacherIds.add(String(teacherId));
  });
  if (row.teacherId) teacherIds.add(String(row.teacherId));

  return {
    studentId: String(row.studentId),
    studentName: row.studentName?.trim() || 'Unknown student',
    rollNumber: row.rollNumber ?? null,
    classId: String(row.classId),
    className: row.className?.trim() || 'Unknown class',
    branch: row.branch ?? null,
    teacherIds: [...teacherIds],
    courseId: String(row.courseId),
    courseName: row.courseName?.trim() || 'Unknown course',
    instrument: row.instrument ?? null,
    enrolledAt: row.enrolledAt ?? null,
    reports: (row.reports ?? []).flatMap((report) => {
      if (!report.month) return [];
      return [
        {
          month: report.month,
          submittedAt: report.createdAt ?? null,
          mrtId: String(report._id),
          ...(typeof report.totalScore === 'number' ? { totalScore: report.totalScore } : {}),
          ...(typeof report.averageScore === 'number' ? { averageScore: report.averageScore } : {}),
        },
      ];
    }),
  };
};

const loadEnrollments = async (classIds: mongoose.Types.ObjectId[] | undefined): Promise<ReportingEnrollment[]> => {
  if (classIds && classIds.length === 0) return [];

  const pipeline: PipelineStage[] = [];
  if (classIds) {
    pipeline.push({ $match: { classId: { $in: classIds } } });
  }
  pipeline.push(
    {
      $lookup: {
        from: Classes.collection.collectionName,
        let: { classId: '$classId' },
        pipeline: [
          { $match: { $expr: { $eq: ['$_id', '$$classId'] } } },
          { $project: { name: 1, branch: 1, teachers: 1, teacherId: 1 } },
        ],
        as: 'classDoc',
      },
    },
    { $unwind: '$classDoc' },
    {
      $lookup: {
        from: User.collection.collectionName,
        let: { studentId: '$studentId' },
        pipeline: [
          { $match: { $expr: { $eq: ['$_id', '$$studentId'] } } },
          { $project: { name: 1, rollNumber: 1, isActive: 1, role: 1 } },
        ],
        as: 'student',
      },
    },
    { $unwind: '$student' },
    { $match: { 'student.role': 'student', 'student.isActive': { $ne: false } } },
    {
      $lookup: {
        from: Course.collection.collectionName,
        let: { courseId: '$courseId' },
        pipeline: [{ $match: { $expr: { $eq: ['$_id', '$$courseId'] } } }, { $project: { name: 1, instrument: 1 } }],
        as: 'course',
      },
    },
    { $unwind: '$course' },
    {
      $lookup: {
        from: MRT.collection.collectionName,
        let: { studentId: '$studentId', classId: '$classId', courseId: '$courseId' },
        pipeline: [
          {
            $match: {
              $expr: {
                $and: [
                  { $eq: ['$studentId', '$$studentId'] },
                  { $eq: ['$classId', '$$classId'] },
                  { $eq: ['$courseId', '$$courseId'] },
                ],
              },
            },
          },
          { $project: { month: 1, createdAt: 1, totalScore: 1, averageScore: 1 } },
        ],
        as: 'reports',
      },
    },
    {
      $project: {
        studentId: 1,
        classId: 1,
        courseId: 1,
        enrolledAt: '$createdAt',
        studentName: '$student.name',
        rollNumber: '$student.rollNumber',
        className: '$classDoc.name',
        branch: '$classDoc.branch',
        teachers: '$classDoc.teachers',
        teacherId: '$classDoc.teacherId',
        courseName: '$course.name',
        instrument: '$course.instrument',
        reports: 1,
      },
    }
  );

  const rows = await StudentProgress.aggregate<RawEnrollmentRow>(pipeline).exec();
  return rows.map(mapEnrollment);
};

const loadTeacherNames = async (enrollments: ReportingEnrollment[]): Promise<Map<string, string>> => {
  const ids = [...new Set(enrollments.flatMap((enrollment) => enrollment.teacherIds))];
  if (ids.length === 0) return new Map();
  const teachers = await User.find({ _id: { $in: ids } })
    .select({ name: 1 })
    .lean<Array<{ _id: mongoose.Types.ObjectId; name?: string }>>();
  return new Map(teachers.map((teacher) => [String(teacher._id), teacher.name?.trim() || 'Unknown teacher']));
};

const dimensionFilters = (contextBranches: string[] | undefined, query: ReportingQuery): ReportingFilterInput => {
  const filters: ReportingFilterInput = {};
  if (contextBranches) filters.branches = contextBranches;
  if (query.teacherId) filters.teacherId = query.teacherId;
  if (query.instrument) filters.instrument = query.instrument;
  return filters;
};

const loadContext = async (actor: ReportingActor, query: ReportingQuery, now: Date): Promise<ReportingContext> => {
  const branchResolution = resolveReportingBranches(actor, query.branch);
  const range = resolveMonthRange(query, now);
  const applied = describeAppliedFilters(branchResolution, {
    ...(query.branch ? { branch: query.branch } : {}),
    ...(query.teacherId ? { teacherId: query.teacherId } : {}),
    ...(query.instrument ? { instrument: query.instrument } : {}),
    monthFrom: range.monthFrom,
    monthTo: range.monthTo,
  });
  const filters = dimensionFilters(branchResolution.branches, query);

  let classIds: mongoose.Types.ObjectId[] | undefined;
  if (branchResolution.branches) {
    classIds =
      branchResolution.branches.length === 0
        ? []
        : await Classes.find(buildClassBranchQuery(branchResolution.branches)).distinct('_id');
  }

  const enrollments = await loadEnrollments(classIds);
  const teacherNames = await loadTeacherNames(enrollments);
  return {
    applied,
    filters,
    rangeMonths: enumerateMonths(range.monthFrom, range.monthTo),
    enrollments,
    teacherNames,
    options: buildFilterOptions(enrollments, teacherNames, now),
  };
};

const factsFor = (context: ReportingContext, months: string[]): ReportFact[] =>
  buildReportFacts(context.enrollments, context.filters, months);

const buildDashboard = (context: ReportingContext): MrtReportingDashboard => {
  const facts = factsFor(context, context.rangeMonths);
  const currentFacts = facts.filter((fact) => fact.month === context.applied.monthTo);
  const previousMonth = shiftMonth(context.applied.monthTo, -1);
  const previousFacts = factsFor(context, [previousMonth]);

  return {
    filters: context.applied,
    notes: REPORTING_NOTES,
    options: context.options,
    summary: summarizeFacts(facts),
    comparison: buildMonthComparison(context.applied.monthTo, currentFacts, previousFacts),
    branches: sortLeaderboard(aggregateByBranch(facts), 'completionPercentage', 'desc', (row) => row.branchName),
    teachers: sortLeaderboard(
      aggregateByTeacher(facts, context.teacherNames),
      'completionPercentage',
      'desc',
      (row) => row.teacherName
    ),
    months: sortMonths(aggregateByMonth(facts, context.rangeMonths), 'month', 'asc'),
    instruments: sortLeaderboard(aggregateByInstrument(facts), 'completionPercentage', 'desc', (row) => row.instrument),
  };
};

export const getMrtReportingDashboard = async (
  actor: ReportingActor,
  query: ReportingQuery,
  now: Date = new Date()
): Promise<MrtReportingDashboard> => {
  try {
    const context = await loadContext(actor, query, now);
    return buildDashboard(context);
  } catch (error) {
    throw toReportingError(error);
  }
};

export const getMrtBranchLeaderboard = async (
  actor: ReportingActor,
  query: ReportingQuery & { sortBy?: LeaderboardSortField; sortOrder?: SortOrder },
  now: Date = new Date()
): Promise<{ filters: AppliedReportingFilters; results: BranchLeaderboardRow[] }> => {
  const dashboard = await getMrtReportingDashboard(actor, query, now);
  return {
    filters: dashboard.filters,
    results: sortLeaderboard(
      dashboard.branches,
      query.sortBy ?? 'completionPercentage',
      query.sortOrder ?? 'desc',
      (row) => row.branchName
    ),
  };
};

export const getMrtTeacherLeaderboard = async (
  actor: ReportingActor,
  query: ReportingQuery & { sortBy?: LeaderboardSortField; sortOrder?: SortOrder },
  now: Date = new Date()
): Promise<{ filters: AppliedReportingFilters; results: TeacherLeaderboardRow[] }> => {
  const dashboard = await getMrtReportingDashboard(actor, query, now);
  return {
    filters: dashboard.filters,
    results: sortLeaderboard(
      dashboard.teachers,
      query.sortBy ?? 'completionPercentage',
      query.sortOrder ?? 'desc',
      (row) => row.teacherName
    ),
  };
};

export const getMrtMonthLeaderboard = async (
  actor: ReportingActor,
  query: ReportingQuery & { sortBy?: MonthSortField; sortOrder?: SortOrder },
  now: Date = new Date()
): Promise<{ filters: AppliedReportingFilters; results: MonthLeaderboardRow[] }> => {
  const dashboard = await getMrtReportingDashboard(actor, query, now);
  return {
    filters: dashboard.filters,
    results: sortMonths(dashboard.months, query.sortBy ?? 'month', query.sortOrder ?? 'asc'),
  };
};

export const getMrtInstrumentLeaderboard = async (
  actor: ReportingActor,
  query: ReportingQuery & { sortBy?: LeaderboardSortField; sortOrder?: SortOrder },
  now: Date = new Date()
): Promise<{ filters: AppliedReportingFilters; results: InstrumentLeaderboardRow[] }> => {
  const dashboard = await getMrtReportingDashboard(actor, query, now);
  return {
    filters: dashboard.filters,
    results: sortLeaderboard(
      dashboard.instruments,
      query.sortBy ?? 'completionPercentage',
      query.sortOrder ?? 'desc',
      (row) => row.instrument
    ),
  };
};

export const getMrtReportingSummary = async (actor: ReportingActor, query: ReportingQuery, now: Date = new Date()) => {
  const dashboard = await getMrtReportingDashboard(actor, query, now);
  return {
    filters: dashboard.filters,
    notes: dashboard.notes,
    summary: dashboard.summary,
    comparison: dashboard.comparison,
  };
};

const decorateRecord = (fact: ReportFact, teacherNames: ReadonlyMap<string, string>): ReportingRecord => {
  const teacherIds = fact.teacherIds.length > 0 ? fact.teacherIds : [UNASSIGNED_TEACHER_ID];
  return {
    ...fact,
    teachers: teacherIds.map((teacherId) => ({
      teacherId,
      teacherName: teacherId === UNASSIGNED_TEACHER_ID ? 'Unassigned' : teacherNames.get(teacherId) ?? 'Unknown teacher',
    })),
  };
};

export const getMrtReportingRecords = async (
  actor: ReportingActor,
  query: ReportingQuery & {
    search?: string;
    status?: ReportStatus;
    sortBy?: RecordSortField;
    sortOrder?: SortOrder;
    page?: number;
    limit?: number;
  },
  now: Date = new Date()
): Promise<MrtReportingRecords> => {
  try {
    const context = await loadContext(actor, query, now);
    const facts = factsFor(context, context.rangeMonths);
    const page = paginateFacts(facts, {
      ...(query.search ? { search: query.search } : {}),
      ...(query.status ? { status: query.status } : {}),
      sortBy: query.sortBy ?? 'month',
      sortOrder: query.sortOrder ?? 'desc',
      page: query.page ?? 1,
      limit: query.limit ?? 20,
      teacherNames: context.teacherNames,
    });
    return {
      filters: context.applied,
      results: page.results.map((fact) => decorateRecord(fact, context.teacherNames)),
      page: page.page,
      limit: page.limit,
      totalPages: page.totalPages,
      totalResults: page.totalResults,
    };
  } catch (error) {
    throw toReportingError(error);
  }
};
