import { describe, expect, test } from '@jest/globals';
import {
  ReportingValidationError,
  aggregateByBranch,
  aggregateByInstrument,
  aggregateByMonth,
  aggregateByTeacher,
  buildFilterOptions,
  buildMonthComparison,
  buildReportFacts,
  completionPercentage,
  enumerateMonths,
  normalizeReportingMonth,
  paginateFacts,
  resolveMonthRange,
  resolveReportingBranches,
  sortLeaderboard,
  summarizeFacts,
  toReportingMonth,
} from './mrt.reporting.util';
import { ReportingEnrollment } from './mrt.reporting.interfaces';

const names = new Map<string, string>([
  ['t1', 'Meera Iyer'],
  ['t2', 'Arun Das'],
]);

const enrollment = (overrides: Partial<ReportingEnrollment> = {}): ReportingEnrollment => ({
  studentId: 's1',
  studentName: 'Asha',
  rollNumber: 'JA/0626/1143',
  classId: 'c1',
  className: 'Guitar A',
  branch: '1',
  teacherIds: ['t1'],
  courseId: 'guitar-1',
  courseName: 'Guitar Level 1',
  instrument: 'Guitar',
  enrolledAt: new Date('2026-01-15T04:30:00.000Z'),
  reports: [],
  ...overrides,
});

const rangeFacts = (enrollments: ReportingEnrollment[], months = ['2026-01', '2026-02']) =>
  buildReportFacts(enrollments, {}, months);

describe('reporting months', () => {
  test('normalizes both stored month formats to YYYY-MM', () => {
    expect(normalizeReportingMonth('2026-03')).toBe('2026-03');
    expect(normalizeReportingMonth('03-2026')).toBe('2026-03');
    expect(normalizeReportingMonth('2026-13')).toBeNull();
  });

  test('uses Asia/Kolkata for enrollment dates near midnight UTC', () => {
    expect(toReportingMonth(new Date('2026-03-31T18:00:00.000Z'))).toBe('2026-03');
    expect(toReportingMonth(new Date('2026-03-31T20:00:00.000Z'))).toBe('2026-04');
  });

  test('rejects an inverted or oversized range', () => {
    expect(() => enumerateMonths('2026-05', '2026-01')).toThrow(ReportingValidationError);
    expect(() => enumerateMonths('2024-01', '2026-01')).toThrow('cannot exceed 18 months');
  });

  test('a single month query overrides the range', () => {
    expect(resolveMonthRange({ month: '2026-04', monthFrom: '2026-01', monthTo: '2026-06' })).toEqual({
      monthFrom: '2026-04',
      monthTo: '2026-04',
    });
  });
});

describe('report facts', () => {
  const enrollments = [
    enrollment({
      reports: [
        { month: '01-2026', submittedAt: '2026-02-02T00:00:00.000Z', mrtId: 'm-late', totalScore: 12, averageScore: 2 },
        { month: '2026-01', submittedAt: '2026-02-01T00:00:00.000Z', mrtId: 'm-early', totalScore: 24, averageScore: 4 },
      ],
    }),
    enrollment({
      studentId: 's2',
      studentName: 'Bina',
      rollNumber: 'JA/0626/2208',
      classId: 'c2',
      className: 'Piano B',
      courseId: 'piano-1',
      courseName: 'Piano Level 1',
      instrument: 'Piano',
      enrolledAt: new Date('2026-02-10T04:30:00.000Z'),
    }),
    enrollment({
      studentId: 's3',
      studentName: 'Chitra',
      rollNumber: 'JA/0626/3301',
      classId: 'c3',
      className: 'Guitar C',
      branch: '2',
      teacherIds: ['t1', 't1', 't2'],
      courseId: 'guitar-2',
      courseName: 'Guitar Level 2',
      instrument: 'Guitar',
      reports: [{ month: '2026-01', submittedAt: '2026-02-03T00:00:00.000Z', mrtId: 'm3', totalScore: 18, averageScore: 3 }],
    }),
  ];

  test('counts one submitted report when both month formats exist', () => {
    const facts = rangeFacts(enrollments);
    const ashaJanuary = facts.find((fact) => fact.studentId === 's1' && fact.month === '2026-01');
    expect(ashaJanuary).toMatchObject({ status: 'submitted', mrtId: 'm-early', totalScore: 24, averageScore: 4 });
    expect(facts.filter((fact) => fact.studentId === 's1' && fact.month === '2026-01')).toHaveLength(1);
  });

  test('expects a report only from the enrollment month onward', () => {
    const facts = rangeFacts(enrollments);
    expect(facts.some((fact) => fact.studentId === 's2' && fact.month === '2026-01')).toBe(false);
    expect(facts.find((fact) => fact.studentId === 's2' && fact.month === '2026-02')?.status).toBe('missing');
  });

  test('keeps summary, branch, month, and instrument totals aligned', () => {
    const facts = rangeFacts(enrollments);
    const summary = summarizeFacts(facts);
    expect(summary).toMatchObject({
      eligibleStudents: 3,
      expected: 5,
      submitted: 2,
      missing: 3,
      completionPercentage: 40,
    });

    const branches = aggregateByBranch(facts);
    const instruments = aggregateByInstrument(facts);
    const months = aggregateByMonth(facts, ['2026-01', '2026-02']);
    expect(branches.reduce((total, row) => total + row.expected, 0)).toBe(summary.expected);
    expect(branches.reduce((total, row) => total + row.submitted, 0)).toBe(summary.submitted);
    expect(instruments.reduce((total, row) => total + row.expected, 0)).toBe(summary.expected);
    expect(months.reduce((total, row) => total + row.expected, 0)).toBe(summary.expected);
    expect(months.find((row) => row.month === '2026-01')).toMatchObject({ expected: 2, submitted: 2, missing: 0 });
    expect(months.find((row) => row.month === '2026-02')).toMatchObject({ expected: 3, submitted: 0, missing: 3 });
    expect(summary.averageTotalScore).toBe(21);
    expect(summary.averageScore).toBe(3.5);
  });

  test('counts a shared class for each teacher without duplicating one teacher', () => {
    const facts = rangeFacts(enrollments);
    const teachers = aggregateByTeacher(facts, names);
    const meera = teachers.find((row) => row.teacherId === 't1');
    const arun = teachers.find((row) => row.teacherId === 't2');
    expect(meera).toMatchObject({ expected: 5, submitted: 2, eligibleStudents: 3 });
    expect(arun).toMatchObject({ expected: 2, submitted: 1, eligibleStudents: 1 });
    expect(meera?.branches.map((branch) => branch.branch)).toEqual(['1', '2']);
    expect(teachers.reduce((total, row) => total + row.expected, 0)).toBeGreaterThan(summarizeFacts(facts).expected);
  });

  test('applies branch, teacher, and instrument filters together', () => {
    const facts = buildReportFacts(enrollments, { branches: ['2'], teacherId: 't2', instrument: 'Guitar' }, [
      '2026-01',
      '2026-02',
    ]);
    expect(facts).toHaveLength(2);
    expect(new Set(facts.map((fact) => fact.studentId))).toEqual(new Set(['s3']));
  });

  test('returns an empty summary when nothing matches', () => {
    const facts = buildReportFacts(enrollments, { instrument: 'Drums' }, ['2026-01']);
    expect(summarizeFacts(facts)).toEqual({
      eligibleStudents: 0,
      expected: 0,
      submitted: 0,
      missing: 0,
      absent: 0,
      completionPercentage: null,
      averageTotalScore: null,
      averageScore: null,
    });
    expect(aggregateByBranch(facts)).toEqual([]);
  });

  test('groups an online class separately from campus branches', () => {
    const facts = buildReportFacts([enrollment({ branch: 'online', className: 'JAON/Guitar' })], { branches: ['online'] }, [
      '2026-01',
    ]);
    expect(facts[0]).toMatchObject({ branch: 'online', branchName: 'Online' });
    expect(aggregateByBranch(facts)[0]).toMatchObject({ branch: 'online', branchName: 'Online' });
    expect(buildReportFacts([enrollment({ branch: 'online' })], { branches: ['1'] }, ['2026-01'])).toEqual([]);
  });

  test('groups a class without a branch or teacher as unassigned', () => {
    const facts = buildReportFacts(
      [
        enrollment({
          branch: '  ',
          teacherIds: [],
          instrument: '',
          enrolledAt: new Date('2026-01-15T04:30:00.000Z'),
        }),
      ],
      {},
      ['2026-01']
    );
    expect(facts[0]).toMatchObject({
      branch: 'unassigned',
      branchName: 'Unassigned',
      instrument: 'Unspecified',
      status: 'missing',
    });
    expect(aggregateByTeacher(facts, names)[0]).toMatchObject({ teacherId: 'unassigned', teacherName: 'Unassigned' });
  });

  test('ignores an enrollment that has no enrollment date', () => {
    expect(buildReportFacts([enrollment({ enrolledAt: null })], {}, ['2026-01'])).toEqual([]);
  });

  test('treats an absent MRT as filled without counting it in score averages', () => {
    const facts = rangeFacts([
      enrollment({
        reports: [{ month: '2026-01', submittedAt: '2026-02-01T00:00:00.000Z', mrtId: 'm-absent', isAbsent: true, totalScore: 0, averageScore: 0 }],
      }),
      enrollment({
        studentId: 's2',
        studentName: 'Bina',
        classId: 'c2',
        courseId: 'piano-1',
        instrument: 'Piano',
        reports: [{ month: '2026-01', submittedAt: '2026-02-01T00:00:00.000Z', mrtId: 'm-scored', totalScore: 24, averageScore: 4 }],
      }),
    ]);
    const ashaJanuary = facts.find((fact) => fact.studentId === 's1' && fact.month === '2026-01');
    expect(ashaJanuary).toMatchObject({
      status: 'absent',
      isAbsent: true,
      mrtId: 'm-absent',
      totalScore: null,
      averageScore: null,
    });
    expect(facts.find((fact) => fact.studentId === 's1' && fact.month === '2026-02')?.status).toBe('missing');

    const summary = summarizeFacts(facts);
    expect(summary).toMatchObject({
      expected: 4,
      submitted: 1,
      absent: 1,
      missing: 2,
      completionPercentage: 50,
      averageTotalScore: 24,
      averageScore: 4,
    });
  });
});

describe('comparison, sorting, and pagination', () => {
  test('completion percentage is null when nothing is expected', () => {
    expect(completionPercentage(0, 0)).toBeNull();
    expect(completionPercentage(1, 3)).toBe(33.3);
  });

  test('compares the selected month with the previous month', () => {
    const current = buildReportFacts(
      [enrollment({ reports: [{ month: '2026-02', submittedAt: '2026-03-01T00:00:00.000Z', mrtId: 'm1' }] })],
      {},
      ['2026-02']
    );
    const previous = buildReportFacts([enrollment()], {}, ['2026-01']);
    const comparison = buildMonthComparison('2026-02', current, previous);
    expect(comparison.previousMonth).toBe('2026-01');
    expect(comparison.submittedDelta).toBe(1);
    expect(comparison.completionPercentageDelta).toBe(100);
  });

  test('sorts completion with empty groups last and paginates detail rows', () => {
    const facts = rangeFacts([
      enrollment({
        studentName: 'Zara',
        reports: [{ month: '2026-01', submittedAt: '2026-02-01T00:00:00.000Z', mrtId: 'm1' }],
      }),
      enrollment({
        studentId: 's2',
        studentName: 'Asha',
        classId: 'c2',
        courseId: 'piano',
        instrument: 'Piano',
        enrolledAt: new Date('2026-02-01T04:30:00.000Z'),
      }),
    ]);
    const ranked = sortLeaderboard(aggregateByInstrument(facts), 'completionPercentage', 'desc', (row) => row.instrument);
    expect(ranked.map((row) => row.instrument)).toEqual(['Guitar', 'Piano']);

    const page = paginateFacts(facts, {
      search: 'zara',
      sortBy: 'studentName',
      sortOrder: 'asc',
      page: 1,
      limit: 1,
      teacherNames: names,
    });
    expect(page.totalResults).toBe(2);
    expect(page.results).toHaveLength(1);
    expect(page.results[0]?.studentName).toBe('Zara');

    const missing = paginateFacts(facts, {
      status: 'missing',
      sortBy: 'month',
      sortOrder: 'asc',
      page: 1,
      limit: 20,
      teacherNames: names,
    });
    expect(missing.results.every((fact) => fact.status === 'missing')).toBe(true);
    expect(missing.totalResults).toBe(2);
  });

  test('builds filter options from enrollments without hardcoding branches', () => {
    const options = buildFilterOptions(
      [enrollment(), enrollment({ studentId: 's2', branch: '4', teacherIds: [], instrument: 'Drums' })],
      names,
      new Date('2026-03-15T04:30:00.000Z')
    );
    expect(options.branches.map((branch) => branch.branch)).toEqual(['1', '4']);
    expect(options.instruments).toEqual(['Drums', 'Guitar']);
    expect(options.teachers.map((teacher) => teacher.teacherName)).toEqual(['Meera Iyer', 'Unassigned']);
    expect(options.months[0]?.month).toBe('2026-03');
    expect(options.months[options.months.length - 1]?.month).toBe('2026-01');
  });
});

describe('branch access', () => {
  test('limits admin and aqsd to branchAccess and rejects other branches', () => {
    expect(resolveReportingBranches({ role: 'master' })).toEqual({});
    expect(resolveReportingBranches({ role: 'master' }, '2')).toEqual({ branches: ['2'] });
    expect(resolveReportingBranches({ role: 'master' }, 'online')).toEqual({ branches: ['online'] });
    expect(resolveReportingBranches({ role: 'admin', branchAccess: [1, 2] })).toEqual({
      branches: ['1', '2', 'online'],
    });
    expect(resolveReportingBranches({ role: 'admin', branchAccess: [1] }, 'online')).toEqual({ branches: ['online'] });
    expect(resolveReportingBranches({ role: 'aqsd', branchAccess: [4] }, '4')).toEqual({ branches: ['4'] });
    expect(() => resolveReportingBranches({ role: 'admin', branchAccess: [1] }, '3')).toThrow(
      'You do not have access to this branch'
    );
    expect(resolveReportingBranches({ role: 'admin', branchAccess: [] })).toEqual({ branches: [] });
  });
});
