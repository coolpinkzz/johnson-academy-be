import { describe, expect, test } from '@jest/globals';
import {
  TicketRuleError,
  assertCanViewTicket,
  formatTicketNumber,
  nextAssignment,
  nextStatusDates,
  parseTicketNumberQuery,
  resolutionDays,
  statusRequiresAssignee,
} from './ticket.util';

describe('resolution days', () => {
  test('counts calendar days in Asia/Kolkata', () => {
    // 1 Nov 2026 00:00 IST through 5 Nov 2026 00:00 IST
    expect(resolutionDays(new Date('2026-10-31T18:30:00.000Z'), new Date('2026-11-04T18:30:00.000Z'))).toBe(4);
  });

  test('returns 0 when creation and resolution fall on the same Kolkata day', () => {
    expect(resolutionDays(new Date('2026-11-01T04:30:00.000Z'), new Date('2026-11-01T16:30:00.000Z'))).toBe(0);
  });

  test('counts a day when the timestamps cross midnight in Kolkata', () => {
    // 1 Nov 23:30 IST and 2 Nov 00:30 IST
    expect(resolutionDays(new Date('2026-11-01T18:00:00.000Z'), new Date('2026-11-01T19:00:00.000Z'))).toBe(1);
  });

  test('returns null until the ticket is resolved', () => {
    expect(resolutionDays(new Date('2026-11-01T04:30:00.000Z'), null)).toBeNull();
  });
});

describe('status transitions', () => {
  const now = new Date('2026-11-05T12:00:00.000Z');
  const resolvedAt = new Date('2026-11-04T12:00:00.000Z');

  test('allows open to move to in progress without changing resolution dates', () => {
    expect(
      nextStatusDates({
        from: 'open',
        to: 'in_progress',
        resolvedAt: null,
        closedAt: null,
        now,
      })
    ).toEqual({ status: 'in_progress', resolvedAt: null, closedAt: null });
  });

  test('rejects skipping from open to resolved or closed', () => {
    expect(() => nextStatusDates({ from: 'open', to: 'resolved', resolvedAt: null, closedAt: null, now })).toThrow(
      TicketRuleError
    );
    expect(() => nextStatusDates({ from: 'open', to: 'closed', resolvedAt: null, closedAt: null, now })).toThrow(
      'Cannot move a ticket from Open to Closed'
    );
  });

  test('sets resolvedAt when a ticket is resolved and keeps it when the ticket is closed', () => {
    expect(
      nextStatusDates({
        from: 'in_progress',
        to: 'resolved',
        resolvedAt: null,
        closedAt: null,
        now,
      })
    ).toEqual({ status: 'resolved', resolvedAt: now, closedAt: null });

    expect(
      nextStatusDates({
        from: 'resolved',
        to: 'closed',
        resolvedAt,
        closedAt: null,
        now,
      })
    ).toEqual({ status: 'closed', resolvedAt, closedAt: now });
  });

  test('clears resolution dates when a resolved or closed ticket is reopened', () => {
    expect(
      nextStatusDates({
        from: 'resolved',
        to: 'in_progress',
        resolvedAt,
        closedAt: null,
        now,
      })
    ).toEqual({ status: 'in_progress', resolvedAt: null, closedAt: null });

    expect(
      nextStatusDates({
        from: 'closed',
        to: 'in_progress',
        resolvedAt,
        closedAt: now,
        now,
      })
    ).toEqual({ status: 'in_progress', resolvedAt: null, closedAt: null });
  });

  test('allows in progress to return to open', () => {
    expect(
      nextStatusDates({
        from: 'in_progress',
        to: 'open',
        resolvedAt: null,
        closedAt: null,
        now,
      }).status
    ).toBe('open');
  });

  test('requires an assignee for every status except open', () => {
    expect(statusRequiresAssignee('open')).toBe(false);
    expect(statusRequiresAssignee('in_progress')).toBe(true);
    expect(statusRequiresAssignee('resolved')).toBe(true);
    expect(statusRequiresAssignee('closed')).toBe(true);
  });
});

describe('assignment', () => {
  const firstAssignedAt = new Date('2026-11-01T00:00:00.000Z');
  const later = new Date('2026-11-03T00:00:00.000Z');

  test('records the first assignment date once', () => {
    expect(
      nextAssignment({
        status: 'open',
        currentAssigneeId: null,
        firstAssignedAt: null,
        nextAssigneeId: 'admin-1',
        now: firstAssignedAt,
      })
    ).toEqual({
      assigneeId: 'admin-1',
      firstAssignedAt,
      activity: 'assigned',
    });
  });

  test('keeps the first assignment date when the ticket is reassigned', () => {
    const result = nextAssignment({
      status: 'in_progress',
      currentAssigneeId: 'admin-1',
      firstAssignedAt,
      nextAssigneeId: 'admin-2',
      now: later,
    });

    expect(result.activity).toBe('reassigned');
    expect(result.assigneeId).toBe('admin-2');
    expect(result.firstAssignedAt).toBe(firstAssignedAt);
  });

  test('does not write history when the assignee is unchanged', () => {
    expect(
      nextAssignment({
        status: 'open',
        currentAssigneeId: 'admin-1',
        firstAssignedAt,
        nextAssigneeId: 'admin-1',
        now: later,
      }).activity
    ).toBeNull();
  });

  test('allows unassign only while the ticket is open and keeps the first assignment date', () => {
    expect(
      nextAssignment({
        status: 'open',
        currentAssigneeId: 'admin-1',
        firstAssignedAt,
        nextAssigneeId: null,
        now: later,
      })
    ).toEqual({
      assigneeId: null,
      firstAssignedAt,
      activity: 'unassigned',
    });

    expect(() =>
      nextAssignment({
        status: 'in_progress',
        currentAssigneeId: 'admin-1',
        firstAssignedAt,
        nextAssigneeId: null,
        now: later,
      })
    ).toThrow('Unassign is only allowed while the ticket is open');
  });
});

describe('ticket access', () => {
  test('blocks a student from another student’s ticket', () => {
    expect(() => assertCanViewTicket({ id: 'student-1', role: 'student' }, 'student-2')).toThrow(
      'You can only view your own tickets'
    );
  });

  test('allows a student to view their own ticket and staff to view any ticket', () => {
    expect(() => assertCanViewTicket({ id: 'student-1', role: 'student' }, 'student-1')).not.toThrow();
    expect(() => assertCanViewTicket({ id: 'admin-1', role: 'admin' }, 'student-2')).not.toThrow();
    expect(() => assertCanViewTicket({ id: 'aqsd-1', role: 'aqsd' }, 'student-2')).not.toThrow();
    expect(() => assertCanViewTicket({ id: 'master-1', role: 'master' }, 'student-2')).not.toThrow();
  });

  test('blocks teachers', () => {
    expect(() => assertCanViewTicket({ id: 'teacher-1', role: 'teacher' }, 'student-1')).toThrow(TicketRuleError);
  });
});

describe('ticket numbers', () => {
  test('formats and parses display numbers', () => {
    expect(formatTicketNumber(42)).toBe('TKT-00042');
    expect(parseTicketNumberQuery('TKT-00042')).toBe(42);
    expect(parseTicketNumberQuery('42')).toBe(42);
    expect(parseTicketNumberQuery('JA/0626/1143')).toBeNull();
  });
});
