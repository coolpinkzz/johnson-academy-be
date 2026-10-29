import { CLASS_TIMEZONE } from '../classes/classes.interfaces';

/** Reporting months follow the academy schedule timezone already used by classes. */
export const REPORTING_TIME_ZONE = CLASS_TIMEZONE;
export const UNASSIGNED_BRANCH = 'unassigned';
export const UNASSIGNED_TEACHER_ID = 'unassigned';
export const UNSPECIFIED_INSTRUMENT = 'Unspecified';
export const MAX_REPORTING_MONTHS = 18;
export const MAX_MONTH_OPTIONS = 36;

export const REPORTING_NOTES = [
  'One MRT is expected per student, class, and course for each month on or after the enrollment month.',
  'Enrollment months use Asia/Kolkata. Stored MRT months are normalized to YYYY-MM.',
  'A report is submitted when a scored MRT record exists.',
  'Absent means the teacher marked the student as not available for that month, so no marks were given.',
  'Missing means no MRT record for an expected enrollment-month.',
  'Completion treats scored and absent records as filled. Score averages use scored MRTs only.',
  'Inactive students are excluded. Removing an enrollment deletes its MRT rows, so departed students are not historical pending reports.',
  'A class with more than one teacher is counted once in the summary and once for each teacher.',
  'Leaderboard score is the mean total (out of 30) and mean average (out of 5) of submitted MRTs. Missing and absent reports are left out of the average.',
] as const;

export type ReportStatus = 'submitted' | 'missing' | 'absent';
export type SortOrder = 'asc' | 'desc';

export type LeaderboardSortField =
  | 'name'
  | 'eligibleStudents'
  | 'expected'
  | 'submitted'
  | 'missing'
  | 'absent'
  | 'completionPercentage'
  | 'averageTotalScore'
  | 'averageScore';

export type MonthSortField = 'month' | 'expected' | 'submitted' | 'missing' | 'absent' | 'completionPercentage';

export type RecordSortField =
  | 'studentName'
  | 'rollNumber'
  | 'branchName'
  | 'className'
  | 'instrument'
  | 'month'
  | 'status'
  | 'submittedAt'
  | 'teacherName'
  | 'totalScore'
  | 'averageScore';

export interface ReportingReport {
  month: string;
  submittedAt: Date | string | null;
  mrtId: string;
  isAbsent?: boolean;
  totalScore?: number | null;
  averageScore?: number | null;
}

export interface ReportingEnrollment {
  studentId: string;
  studentName: string;
  rollNumber: string | null;
  classId: string;
  className: string;
  branch: string | null;
  teacherIds: string[];
  courseId: string;
  courseName: string;
  instrument: string | null;
  enrolledAt: Date | string | null;
  reports: ReportingReport[];
}

export interface ReportingFilterInput {
  branches?: string[];
  teacherId?: string;
  instrument?: string;
}

export interface ReportFact {
  studentId: string;
  studentName: string;
  rollNumber: string | null;
  classId: string;
  className: string;
  branch: string;
  branchName: string;
  teacherIds: string[];
  courseId: string;
  courseName: string;
  instrument: string;
  month: string;
  monthLabel: string;
  status: ReportStatus;
  submittedAt: string | null;
  mrtId: string | null;
  isAbsent: boolean;
  totalScore: number | null;
  averageScore: number | null;
}

export interface MetricSnapshot {
  eligibleStudents: number;
  expected: number;
  submitted: number;
  missing: number;
  absent: number;
  completionPercentage: number | null;
  averageTotalScore: number | null;
  averageScore: number | null;
}

export interface ReportCountSnapshot {
  expected: number;
  submitted: number;
  missing: number;
  absent: number;
  completionPercentage: number | null;
}

export interface BranchLeaderboardRow extends MetricSnapshot {
  branch: string;
  branchName: string;
}

export interface TeacherBranchRef {
  branch: string;
  branchName: string;
}

export interface TeacherLeaderboardRow extends MetricSnapshot {
  teacherId: string;
  teacherName: string;
  branches: TeacherBranchRef[];
}

export interface MonthLeaderboardRow extends ReportCountSnapshot {
  month: string;
  monthLabel: string;
  eligibleStudents: number;
}

export interface InstrumentLeaderboardRow extends MetricSnapshot {
  instrument: string;
}

export interface MonthComparison {
  month: string;
  previousMonth: string;
  current: ReportCountSnapshot;
  previous: ReportCountSnapshot;
  submittedDelta: number;
  completionPercentageDelta: number | null;
}

export interface FilterOptionMonth {
  month: string;
  label: string;
}

export interface ReportingFilterOptions {
  branches: { branch: string; branchName: string }[];
  teachers: { teacherId: string; teacherName: string }[];
  instruments: string[];
  months: FilterOptionMonth[];
}

export interface AppliedReportingFilters {
  branch: string | null;
  branches: string[] | null;
  teacherId: string | null;
  instrument: string | null;
  monthFrom: string;
  monthTo: string;
}

export interface ReportingRecord extends ReportFact {
  teachers: { teacherId: string; teacherName: string }[];
}

export interface PaginatedRecords {
  results: ReportFact[];
  page: number;
  limit: number;
  totalPages: number;
  totalResults: number;
}
