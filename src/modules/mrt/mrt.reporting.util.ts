import { CLASS_BRANCH_ONLINE } from '../classes/classes.interfaces';
import { resolveStudentBranchScope } from '../user/rollNumber.util';
import {
  MAX_MONTH_OPTIONS,
  MAX_REPORTING_MONTHS,
  REPORTING_TIME_ZONE,
  UNASSIGNED_BRANCH,
  UNASSIGNED_TEACHER_ID,
  UNSPECIFIED_INSTRUMENT,
  AppliedReportingFilters,
  BranchLeaderboardRow,
  FilterOptionMonth,
  InstrumentLeaderboardRow,
  LeaderboardSortField,
  MetricSnapshot,
  MonthComparison,
  MonthLeaderboardRow,
  MonthSortField,
  PaginatedRecords,
  RecordSortField,
  ReportCountSnapshot,
  ReportFact,
  ReportingEnrollment,
  ReportingFilterInput,
  ReportingFilterOptions,
  ReportingReport,
  ReportStatus,
  SortOrder,
  TeacherLeaderboardRow,
} from './mrt.reporting.interfaces';

const YEAR_MONTH = /^(\d{4})-(0[1-9]|1[0-2])$/;
const MONTH_YEAR = /^(0[1-9]|1[0-2])-(\d{4})$/;
const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'] as const;

export class ReportingValidationError extends Error {
  statusCode: 400 | 403;

  constructor(statusCode: 400 | 403, message: string) {
    super(message);
    this.statusCode = statusCode;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export const formatBranchName = (branch: string): string => {
  if (branch === UNASSIGNED_BRANCH) return 'Unassigned';
  if (branch === CLASS_BRANCH_ONLINE) return 'Online';
  return `Branch ${branch}`;
};

export const normalizeReportingMonth = (value: string): string | null => {
  const trimmed = value.trim();
  const yearMonth = YEAR_MONTH.exec(trimmed);
  const year = yearMonth?.[1];
  const month = yearMonth?.[2];
  if (year && month) return `${year}-${month}`;

  const monthYear = MONTH_YEAR.exec(trimmed);
  const legacyMonth = monthYear?.[1];
  const legacyYear = monthYear?.[2];
  if (legacyMonth && legacyYear) return `${legacyYear}-${legacyMonth}`;
  return null;
};

export const formatMonthLabel = (month: string): string => {
  const normalized = normalizeReportingMonth(month);
  if (!normalized) return month;
  const [year, monthNumber] = normalized.split('-');
  const name = MONTH_NAMES[Number(monthNumber) - 1];
  if (!year || !name) return normalized;
  return `${name} ${year}`;
};

export const formatYearMonth = (date: Date, timeZone: string = REPORTING_TIME_ZONE): string | null => {
  if (Number.isNaN(date.getTime())) return null;
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
  }).formatToParts(date);
  const year = parts.find((part) => part.type === 'year')?.value;
  const month = parts.find((part) => part.type === 'month')?.value;
  if (!year || !month) return null;
  return `${year}-${month}`;
};

export const toReportingMonth = (value: Date | string | null | undefined): string | null => {
  if (value == null) return null;
  if (value instanceof Date) return formatYearMonth(value);
  const normalized = normalizeReportingMonth(value);
  if (normalized) return normalized;
  const parsed = new Date(value);
  return formatYearMonth(parsed);
};

export const shiftMonth = (month: string, delta: number): string => {
  const normalized = normalizeReportingMonth(month);
  if (!normalized) {
    throw new ReportingValidationError(400, 'Month must be in format YYYY-MM');
  }
  const [yearText, monthText] = normalized.split('-');
  const year = Number(yearText);
  const monthIndex = Number(monthText);
  if (!year || !monthIndex) {
    throw new ReportingValidationError(400, 'Month must be in format YYYY-MM');
  }
  const shifted = new Date(Date.UTC(year, monthIndex - 1 + delta, 1));
  const nextYear = shifted.getUTCFullYear();
  const nextMonth = String(shifted.getUTCMonth() + 1).padStart(2, '0');
  return `${nextYear}-${nextMonth}`;
};

export const enumerateMonths = (monthFrom: string, monthTo: string, maxMonths: number = MAX_REPORTING_MONTHS): string[] => {
  const start = normalizeReportingMonth(monthFrom);
  const end = normalizeReportingMonth(monthTo);
  if (!start || !end) {
    throw new ReportingValidationError(400, 'Month must be in format YYYY-MM');
  }
  if (start > end) {
    throw new ReportingValidationError(400, 'monthFrom must be on or before monthTo');
  }

  const months: string[] = [];
  let cursor = start;
  while (cursor <= end) {
    months.push(cursor);
    if (months.length > maxMonths) {
      throw new ReportingValidationError(400, `Month range cannot exceed ${maxMonths} months`);
    }
    cursor = shiftMonth(cursor, 1);
  }
  return months;
};

export const resolveMonthRange = (
  input: { month?: string; monthFrom?: string; monthTo?: string },
  now: Date = new Date()
): { monthFrom: string; monthTo: string } => {
  const current = formatYearMonth(now);
  if (!current) {
    throw new ReportingValidationError(400, 'Unable to resolve the current reporting month');
  }

  const from = input.month ?? input.monthFrom ?? input.monthTo ?? current;
  const to = input.month ?? input.monthTo ?? input.monthFrom ?? current;
  const months = enumerateMonths(from, to);
  const monthFrom = months[0];
  const monthTo = months[months.length - 1];
  if (!monthFrom || !monthTo) {
    throw new ReportingValidationError(400, 'Month must be in format YYYY-MM');
  }
  return { monthFrom, monthTo };
};

export const resolveReportingBranches = (
  actor: { role?: string; branchAccess?: number[] },
  requestedBranch?: string
): { branches?: string[] } => {
  if (requestedBranch === CLASS_BRANCH_ONLINE) {
    return { branches: [CLASS_BRANCH_ONLINE] };
  }

  const scope = resolveStudentBranchScope(actor, requestedBranch);
  if (scope.type === 'none') {
    if (requestedBranch) {
      throw new ReportingValidationError(403, 'You do not have access to this branch');
    }
    return { branches: [] };
  }
  if (scope.type === 'branches') {
    if (!requestedBranch && scope.branches.length > 0) {
      return { branches: [...scope.branches, CLASS_BRANCH_ONLINE] };
    }
    return { branches: scope.branches };
  }
  return {};
};

export const branchKey = (branch: string | null | undefined): string => {
  const trimmed = branch?.trim() ?? '';
  return trimmed === '' ? UNASSIGNED_BRANCH : trimmed;
};

export const instrumentKey = (instrument: string | null | undefined): string => {
  const trimmed = instrument?.trim() ?? '';
  return trimmed === '' ? UNSPECIFIED_INSTRUMENT : trimmed;
};

export const completionPercentage = (submitted: number, expected: number): number | null => {
  if (expected <= 0) return null;
  return Math.round((submitted / expected) * 1000) / 10;
};

const toIso = (value: Date | string | null | undefined): string | null => {
  if (value == null) return null;
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value.toISOString();
  }
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString();
};

const scoreOrNull = (value: number | null | undefined): number | null =>
  typeof value === 'number' && Number.isFinite(value) ? value : null;

const meanScore = (values: Array<number | null>): number | null => {
  const present = values.filter((value): value is number => value != null);
  if (present.length === 0) return null;
  const total = present.reduce((sum, value) => sum + value, 0);
  return Math.round((total / present.length) * 10) / 10;
};

const indexReports = (
  reports: ReportingReport[]
): Map<
  string,
  {
    submittedAt: string | null;
    mrtId: string;
    isAbsent: boolean;
    totalScore: number | null;
    averageScore: number | null;
  }
> =>
  reports.reduce((map, report) => {
    const month = normalizeReportingMonth(report.month);
    if (!month) return map;
    const submittedAt = toIso(report.submittedAt);
    const existing = map.get(month);
    if (!existing || (submittedAt != null && (existing.submittedAt == null || submittedAt < existing.submittedAt))) {
      const isAbsent = Boolean(report.isAbsent);
      map.set(month, {
        submittedAt,
        mrtId: report.mrtId,
        isAbsent,
        totalScore: isAbsent ? null : scoreOrNull(report.totalScore),
        averageScore: isAbsent ? null : scoreOrNull(report.averageScore),
      });
    }
    return map;
  }, new Map<
    string,
    {
      submittedAt: string | null;
      mrtId: string;
      isAbsent: boolean;
      totalScore: number | null;
      averageScore: number | null;
    }
  >());

export const filterEnrollments = (
  enrollments: ReportingEnrollment[],
  filters: ReportingFilterInput
): ReportingEnrollment[] =>
  enrollments.filter((enrollment) => {
    if (filters.branches && !filters.branches.includes(branchKey(enrollment.branch))) {
      return false;
    }
    if (filters.teacherId) {
      const teacherIds = enrollment.teacherIds.length > 0 ? enrollment.teacherIds : [UNASSIGNED_TEACHER_ID];
      if (!teacherIds.includes(filters.teacherId)) return false;
    }
    if (filters.instrument && instrumentKey(enrollment.instrument) !== filters.instrument) {
      return false;
    }
    return true;
  });

export const buildReportFacts = (
  enrollments: ReportingEnrollment[],
  filters: ReportingFilterInput,
  months: string[]
): ReportFact[] => {
  const filtered = filterEnrollments(enrollments, filters);
  return filtered.flatMap((enrollment) => {
    const enrolledMonth = toReportingMonth(enrollment.enrolledAt);
    if (!enrolledMonth) return [];
    const reports = indexReports(enrollment.reports);
    const branch = branchKey(enrollment.branch);
    const teacherIds = [...new Set(enrollment.teacherIds)];

    return months.flatMap((month) => {
      if (month < enrolledMonth) return [];
      const report = reports.get(month);
      const status: ReportStatus = !report ? 'missing' : report.isAbsent ? 'absent' : 'submitted';
      return [
        {
          studentId: enrollment.studentId,
          studentName: enrollment.studentName,
          rollNumber: enrollment.rollNumber,
          classId: enrollment.classId,
          className: enrollment.className,
          branch,
          branchName: formatBranchName(branch),
          teacherIds,
          courseId: enrollment.courseId,
          courseName: enrollment.courseName,
          instrument: instrumentKey(enrollment.instrument),
          month,
          monthLabel: formatMonthLabel(month),
          status,
          submittedAt: report?.submittedAt ?? null,
          mrtId: report?.mrtId ?? null,
          isAbsent: report?.isAbsent ?? false,
          totalScore: report?.totalScore ?? null,
          averageScore: report?.averageScore ?? null,
        },
      ];
    });
  });
};

const countStudents = (facts: ReportFact[]): number => new Set(facts.map((fact) => fact.studentId)).size;

export const summarizeFacts = (facts: ReportFact[]): MetricSnapshot => {
  const submittedFacts = facts.filter((fact) => fact.status === 'submitted');
  const absent = facts.filter((fact) => fact.status === 'absent').length;
  const expected = facts.length;
  const filled = submittedFacts.length + absent;
  return {
    eligibleStudents: countStudents(facts),
    expected,
    submitted: submittedFacts.length,
    missing: expected - filled,
    absent,
    completionPercentage: completionPercentage(filled, expected),
    averageTotalScore: meanScore(submittedFacts.map((fact) => fact.totalScore)),
    averageScore: meanScore(submittedFacts.map((fact) => fact.averageScore)),
  };
};

const toReportCounts = (metrics: MetricSnapshot): ReportCountSnapshot => ({
  expected: metrics.expected,
  submitted: metrics.submitted,
  missing: metrics.missing,
  absent: metrics.absent,
  completionPercentage: metrics.completionPercentage,
});

export const buildMonthComparison = (
  month: string,
  currentFacts: ReportFact[],
  previousFacts: ReportFact[]
): MonthComparison => {
  const current = summarizeFacts(currentFacts);
  const previous = summarizeFacts(previousFacts);
  const completionPercentageDelta =
    current.completionPercentage == null || previous.completionPercentage == null
      ? null
      : Math.round((current.completionPercentage - previous.completionPercentage) * 10) / 10;

  return {
    month,
    previousMonth: shiftMonth(month, -1),
    current: toReportCounts(current),
    previous: toReportCounts(previous),
    submittedDelta: current.submitted - previous.submitted,
    completionPercentageDelta,
  };
};

const compareBranches = (left: string, right: string): number => {
  if (left === UNASSIGNED_BRANCH) return 1;
  if (right === UNASSIGNED_BRANCH) return -1;
  const leftNumber = Number(left);
  const rightNumber = Number(right);
  if (!Number.isNaN(leftNumber) && !Number.isNaN(rightNumber)) return leftNumber - rightNumber;
  return left.localeCompare(right);
};

export const aggregateByBranch = (facts: ReportFact[]): BranchLeaderboardRow[] => {
  const groups = facts.reduce((map, fact) => {
    const existing = map.get(fact.branch) ?? [];
    existing.push(fact);
    map.set(fact.branch, existing);
    return map;
  }, new Map<string, ReportFact[]>());

  return [...groups.entries()].map(([branch, group]) => ({
    branch,
    branchName: formatBranchName(branch),
    ...summarizeFacts(group),
  }));
};

export const aggregateByTeacher = (
  facts: ReportFact[],
  teacherNames: ReadonlyMap<string, string>
): TeacherLeaderboardRow[] => {
  const groups = facts.reduce((map, fact) => {
    const teacherIds = fact.teacherIds.length > 0 ? fact.teacherIds : [UNASSIGNED_TEACHER_ID];
    teacherIds.forEach((teacherId) => {
      const existing = map.get(teacherId) ?? [];
      existing.push(fact);
      map.set(teacherId, existing);
    });
    return map;
  }, new Map<string, ReportFact[]>());

  return [...groups.entries()].map(([teacherId, group]) => {
    const branches = [...new Map(group.map((fact) => [fact.branch, fact.branchName])).entries()]
      .map(([branch, branchName]) => ({ branch, branchName }))
      .sort((left, right) => compareBranches(left.branch, right.branch));
    const teacherName =
      teacherId === UNASSIGNED_TEACHER_ID ? 'Unassigned' : teacherNames.get(teacherId) ?? 'Unknown teacher';
    return {
      teacherId,
      teacherName,
      branches,
      ...summarizeFacts(group),
    };
  });
};

export const aggregateByMonth = (facts: ReportFact[], months: string[]): MonthLeaderboardRow[] =>
  months.map((month) => {
    const group = facts.filter((fact) => fact.month === month);
    const metrics = summarizeFacts(group);
    return {
      month,
      monthLabel: formatMonthLabel(month),
      ...metrics,
    };
  });

export const aggregateByInstrument = (facts: ReportFact[]): InstrumentLeaderboardRow[] => {
  const groups = facts.reduce((map, fact) => {
    const existing = map.get(fact.instrument) ?? [];
    existing.push(fact);
    map.set(fact.instrument, existing);
    return map;
  }, new Map<string, ReportFact[]>());

  return [...groups.entries()].map(([instrument, group]) => ({
    instrument,
    ...summarizeFacts(group),
  }));
};

const compareNullableNumber = (left: number | null, right: number | null, order: SortOrder): number => {
  if (left == null && right == null) return 0;
  if (left == null) return 1;
  if (right == null) return -1;
  return order === 'asc' ? left - right : right - left;
};

export const sortLeaderboard = <T extends MetricSnapshot>(
  rows: T[],
  sortBy: LeaderboardSortField,
  sortOrder: SortOrder,
  getName: (row: T) => string
): T[] => {
  const direction = sortOrder === 'asc' ? 1 : -1;
  return [...rows].sort((left, right) => {
    const nameOrder = getName(left).localeCompare(getName(right));
    if (sortBy === 'name') return nameOrder * direction;
    if (sortBy === 'completionPercentage' || sortBy === 'averageTotalScore' || sortBy === 'averageScore') {
      const scoreOrder = compareNullableNumber(left[sortBy], right[sortBy], sortOrder);
      return scoreOrder || nameOrder;
    }
    const metricOrder = (left[sortBy] - right[sortBy]) * direction;
    return metricOrder || nameOrder;
  });
};

export const sortMonths = (
  rows: MonthLeaderboardRow[],
  sortBy: MonthSortField,
  sortOrder: SortOrder
): MonthLeaderboardRow[] => {
  const direction = sortOrder === 'asc' ? 1 : -1;
  return [...rows].sort((left, right) => {
    if (sortBy === 'month') return left.month.localeCompare(right.month) * direction;
    if (sortBy === 'completionPercentage') {
      const percentageOrder = compareNullableNumber(left.completionPercentage, right.completionPercentage, sortOrder);
      return percentageOrder || left.month.localeCompare(right.month);
    }
    const metricOrder = (left[sortBy] - right[sortBy]) * direction;
    return metricOrder || left.month.localeCompare(right.month);
  });
};

const teacherSortName = (fact: ReportFact, teacherNames: ReadonlyMap<string, string>): string => {
  const ids = fact.teacherIds.length > 0 ? fact.teacherIds : [UNASSIGNED_TEACHER_ID];
  return ids
    .map((teacherId) =>
      teacherId === UNASSIGNED_TEACHER_ID ? 'Unassigned' : teacherNames.get(teacherId) ?? 'Unknown teacher'
    )
    .sort((left, right) => left.localeCompare(right))
    .join(', ');
};

export const sortFacts = (
  facts: ReportFact[],
  sortBy: RecordSortField,
  sortOrder: SortOrder,
  teacherNames: ReadonlyMap<string, string>
): ReportFact[] => {
  const direction = sortOrder === 'asc' ? 1 : -1;
  const valueOf = (fact: ReportFact): string => {
    switch (sortBy) {
      case 'teacherName':
        return teacherSortName(fact, teacherNames);
      case 'rollNumber':
        return fact.rollNumber ?? '';
      case 'submittedAt':
        return fact.submittedAt ?? '';
      case 'studentName':
        return fact.studentName;
      case 'branchName':
        return fact.branchName;
      case 'className':
        return fact.className;
      case 'instrument':
        return fact.instrument;
      case 'month':
        return fact.month;
      case 'status':
        return fact.status;
      case 'totalScore':
        return fact.totalScore == null ? '' : fact.totalScore.toFixed(1).padStart(6, '0');
      case 'averageScore':
        return fact.averageScore == null ? '' : fact.averageScore.toFixed(1).padStart(6, '0');
      default: {
        const exhaustive: never = sortBy;
        return exhaustive;
      }
    }
  };

  return [...facts].sort((left, right) => {
    const leftValue = valueOf(left);
    const rightValue = valueOf(right);
    if (leftValue === '' && rightValue !== '') return 1;
    if (rightValue === '' && leftValue !== '') return -1;
    const compared = leftValue.localeCompare(rightValue) * direction;
    if (compared !== 0) return compared;
    const nameOrder = left.studentName.localeCompare(right.studentName);
    if (nameOrder !== 0) return nameOrder;
    return left.month.localeCompare(right.month);
  });
};

export const paginateFacts = (
  facts: ReportFact[],
  options: {
    search?: string;
    status?: ReportStatus;
    sortBy: RecordSortField;
    sortOrder: SortOrder;
    page: number;
    limit: number;
    teacherNames: ReadonlyMap<string, string>;
  }
): PaginatedRecords => {
  const needle = options.search?.trim().toLowerCase() ?? '';
  const filtered = facts.filter((fact) => {
    if (options.status && fact.status !== options.status) return false;
    if (!needle) return true;
    const haystack = `${fact.studentName} ${fact.rollNumber ?? ''}`.toLowerCase();
    return haystack.includes(needle);
  });
  const sorted = sortFacts(filtered, options.sortBy, options.sortOrder, options.teacherNames);
  const totalResults = sorted.length;
  const totalPages = totalResults === 0 ? 0 : Math.ceil(totalResults / options.limit);
  const start = (options.page - 1) * options.limit;
  return {
    results: sorted.slice(start, start + options.limit),
    page: options.page,
    limit: options.limit,
    totalPages,
    totalResults,
  };
};

export const buildFilterOptions = (
  enrollments: ReportingEnrollment[],
  teacherNames: ReadonlyMap<string, string>,
  now: Date = new Date()
): ReportingFilterOptions => {
  const branches = [...new Set(enrollments.map((enrollment) => branchKey(enrollment.branch)))].sort(compareBranches);
  const branchOptions = branches.map((branch) => ({ branch, branchName: formatBranchName(branch) }));
  const teacherIds = [...new Set(enrollments.flatMap((enrollment) => enrollment.teacherIds))];
  const hasUnassigned = enrollments.some((enrollment) => enrollment.teacherIds.length === 0);
  const teachers = [
    ...teacherIds.map((teacherId) => ({
      teacherId,
      teacherName: teacherNames.get(teacherId) ?? 'Unknown teacher',
    })),
    ...(hasUnassigned ? [{ teacherId: UNASSIGNED_TEACHER_ID, teacherName: 'Unassigned' }] : []),
  ].sort((left, right) => left.teacherName.localeCompare(right.teacherName));

  const instruments = [...new Set(enrollments.map((enrollment) => instrumentKey(enrollment.instrument)))].sort(
    (left, right) => left.localeCompare(right)
  );

  const current = formatYearMonth(now);
  if (!current) {
    return { branches: branchOptions, teachers, instruments, months: [] };
  }
  const earliest = enrollments.reduce<string | null>((minMonth, enrollment) => {
    const month = toReportingMonth(enrollment.enrolledAt);
    if (!month) return minMonth;
    if (minMonth == null || month < minMonth) return month;
    return minMonth;
  }, null);
  const cappedStart = shiftMonth(current, -(MAX_MONTH_OPTIONS - 1));
  let start = current;
  if (earliest && earliest <= current) {
    start = earliest < cappedStart ? cappedStart : earliest;
  }
  const months: FilterOptionMonth[] = enumerateMonths(start, current, MAX_MONTH_OPTIONS)
    .reverse()
    .map((month) => ({ month, label: formatMonthLabel(month) }));

  return {
    branches: branchOptions,
    teachers,
    instruments,
    months,
  };
};

export const emptyMetrics = (): MetricSnapshot => ({
  eligibleStudents: 0,
  expected: 0,
  submitted: 0,
  missing: 0,
  absent: 0,
  completionPercentage: null,
  averageTotalScore: null,
  averageScore: null,
});

export const describeAppliedFilters = (
  branchResolution: { branches?: string[] },
  requested: { branch?: string; teacherId?: string; instrument?: string; monthFrom: string; monthTo: string }
): AppliedReportingFilters => ({
  branch: requested.branch ?? null,
  branches: branchResolution.branches ?? null,
  teacherId: requested.teacherId ?? null,
  instrument: requested.instrument ?? null,
  monthFrom: requested.monthFrom,
  monthTo: requested.monthTo,
});
