import { TicketStatus } from './ticket.interfaces';

/** India has no daylight saving, so Asia/Kolkata is a fixed UTC+5:30 offset. */
const KOLKATA_OFFSET_MS = (5 * 60 + 30) * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;

export const STAFF_ASSIGNEE_ROLES = ['admin', 'aqsd', 'master'] as const;

const ALLOWED_TRANSITIONS: Record<TicketStatus, TicketStatus[]> = {
  open: ['in_progress'],
  in_progress: ['open', 'resolved'],
  resolved: ['closed', 'in_progress'],
  closed: ['in_progress'],
};

const STATUS_LABELS: Record<TicketStatus, string> = {
  open: 'Open',
  in_progress: 'In Progress',
  resolved: 'Resolved',
  closed: 'Closed',
};

export class TicketRuleError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'TicketRuleError';
  }
}

export const isStaffAssigneeRole = (role: string): boolean => (STAFF_ASSIGNEE_ROLES as readonly string[]).includes(role);

export const statusLabel = (status: TicketStatus): string => STATUS_LABELS[status];

export const statusRequiresAssignee = (status: TicketStatus): boolean => status !== 'open';

export const formatTicketNumber = (ticketNumber: number): string => `TKT-${String(ticketNumber).padStart(5, '0')}`;

/** Calendar-day index in Asia/Kolkata. */
export const kolkataCalendarDay = (date: Date): number => Math.floor((date.getTime() + KOLKATA_OFFSET_MS) / DAY_MS);

/**
 * Whole calendar days from creation to resolution in Asia/Kolkata.
 * 1 Nov through 5 Nov is 4. The same calendar day is 0.
 */
export const resolutionDays = (createdAt: Date, resolvedAt: Date | null | undefined): number | null => {
  if (!resolvedAt) {
    return null;
  }
  return kolkataCalendarDay(resolvedAt) - kolkataCalendarDay(createdAt);
};

export const parseTicketNumberQuery = (search: string): number | null => {
  const trimmed = search.trim();
  const prefixed = /^TKT-(\d+)$/i.exec(trimmed);
  const digits = prefixed?.[1] ?? (/^\d+$/.test(trimmed) ? trimmed : null);
  if (!digits) {
    return null;
  }
  const value = Number(digits);
  if (!Number.isSafeInteger(value) || value < 1) {
    return null;
  }
  return value;
};

export interface StatusDateInput {
  from: TicketStatus;
  to: TicketStatus;
  resolvedAt: Date | null;
  closedAt: Date | null;
  now: Date;
}

export interface StatusDateResult {
  status: TicketStatus;
  resolvedAt: Date | null;
  closedAt: Date | null;
}

export const nextStatusDates = ({ from, to, resolvedAt, closedAt, now }: StatusDateInput): StatusDateResult => {
  if (from === to) {
    throw new TicketRuleError(`This ticket is already ${statusLabel(from)}`);
  }
  if (!ALLOWED_TRANSITIONS[from].includes(to)) {
    throw new TicketRuleError(`Cannot move a ticket from ${statusLabel(from)} to ${statusLabel(to)}`);
  }

  if (to === 'resolved') {
    return { status: to, resolvedAt: now, closedAt: null };
  }

  if (to === 'closed') {
    return { status: to, resolvedAt: resolvedAt ?? now, closedAt: now };
  }

  if (to === 'in_progress' && (from === 'resolved' || from === 'closed')) {
    return { status: to, resolvedAt: null, closedAt: null };
  }

  return { status: to, resolvedAt, closedAt };
};

export interface AssignmentInput {
  status: TicketStatus;
  currentAssigneeId: string | null;
  firstAssignedAt: Date | null;
  nextAssigneeId: string | null;
  now: Date;
}

export interface AssignmentResult {
  assigneeId: string | null;
  firstAssignedAt: Date | null;
  activity: 'assigned' | 'reassigned' | 'unassigned' | null;
}

export const nextAssignment = ({
  status,
  currentAssigneeId,
  firstAssignedAt,
  nextAssigneeId,
  now,
}: AssignmentInput): AssignmentResult => {
  if (nextAssigneeId === currentAssigneeId) {
    return { assigneeId: currentAssigneeId, firstAssignedAt, activity: null };
  }

  if (nextAssigneeId === null) {
    if (status !== 'open') {
      throw new TicketRuleError('Unassign is only allowed while the ticket is open');
    }
    return { assigneeId: null, firstAssignedAt, activity: 'unassigned' };
  }

  return {
    assigneeId: nextAssigneeId,
    firstAssignedAt: firstAssignedAt ?? now,
    activity: currentAssigneeId ? 'reassigned' : 'assigned',
  };
};

export const assertCanViewTicket = (actor: { id: string; role: string }, studentId: string): void => {
  if (actor.role === 'student') {
    if (actor.id !== studentId) {
      throw new TicketRuleError('You can only view your own tickets');
    }
    return;
  }

  if (!isStaffAssigneeRole(actor.role)) {
    throw new TicketRuleError('You do not have access to tickets');
  }
};
