import httpStatus from 'http-status';
import mongoose from 'mongoose';
import ApiError from '../errors/ApiError';
import logger from '../logger/logger';
import { sendToUsers } from '../push/push.service';
import { PushPayload } from '../push/push.interfaces';
import User from '../user/user.model';
import Ticket, { TicketCounter } from './ticket.model';
import {
  ITicketActivity,
  ITicketDoc,
  PublicUser,
  TicketActivityResponse,
  TicketAssigneeOption,
  TicketDetail,
  TicketListItem,
  TicketListResponse,
  TicketStats,
  TicketStatus,
} from './ticket.interfaces';
import {
  STAFF_ASSIGNEE_ROLES,
  TicketRuleError,
  assertCanViewTicket,
  formatTicketNumber,
  isStaffAssigneeRole,
  nextAssignment,
  nextStatusDates,
  parseTicketNumberQuery,
  resolutionDays,
  statusLabel,
  statusRequiresAssignee,
} from './ticket.util';

const SORT_FIELDS = new Set(['createdAt', 'updatedAt', 'ticketNumber', 'status']);
const USER_FIELDS = 'name role rollNumber';

const escapeRegex = (value: string): string => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const asRuleError = (error: unknown): ApiError => {
  if (error instanceof TicketRuleError) {
    return new ApiError(httpStatus.BAD_REQUEST, error.message);
  }
  if (error instanceof ApiError) {
    return error;
  }
  throw error;
};

const readId = (value: unknown): string => {
  if (!value) return '';
  if (typeof value === 'string') return value;
  if (value instanceof mongoose.Types.ObjectId) return value.toString();
  if (typeof value === 'object' && value !== null) {
    const record = value as { _id?: unknown; id?: unknown };
    if (record._id) return String(record._id);
    if (record.id) return String(record.id);
  }
  return '';
};

const toPublicUser = (value: unknown): PublicUser | null => {
  if (!value) return null;
  const id = readId(value);
  if (!id) return null;
  if (typeof value !== 'object') {
    return { id, name: 'Unknown' };
  }
  const record = value as { name?: string; role?: string; rollNumber?: string };
  return {
    id,
    name: record.name?.trim() || 'Unknown',
    ...(record.role ? { role: record.role } : {}),
    ...(record.rollNumber ? { rollNumber: record.rollNumber } : {}),
  };
};

const requireUser = (value: unknown, fallbackId: string): PublicUser =>
  toPublicUser(value) ?? { id: fallbackId, name: 'Unknown' };

const iso = (value: Date | null | undefined): string | null => {
  if (!value) return null;
  return new Date(value).toISOString();
};

const toActivity = (activity: ITicketActivity): TicketActivityResponse => {
  const response: TicketActivityResponse = {
    type: activity.type,
    at: new Date(activity.at).toISOString(),
    actor: toPublicUser(activity.actorId),
  };
  if (activity.fromStatus) response.fromStatus = activity.fromStatus;
  if (activity.toStatus) response.toStatus = activity.toStatus;
  if (activity.fromAssigneeId) response.fromAssignee = toPublicUser(activity.fromAssigneeId);
  if (activity.toAssigneeId) response.toAssignee = toPublicUser(activity.toAssigneeId);
  if (activity.body) response.body = activity.body;
  return response;
};

const toListItem = (ticket: ITicketDoc): TicketListItem => {
  const resolvedAt = ticket.resolvedAt ?? null;
  return {
    id: ticket.id,
    ticketNumber: ticket.ticketNumber,
    displayId: formatTicketNumber(ticket.ticketNumber),
    subject: ticket.subject,
    status: ticket.status,
    student: requireUser(ticket.studentId, readId(ticket.studentId)),
    assignee: toPublicUser(ticket.assigneeId),
    createdAt: ticket.createdAt.toISOString(),
    firstAssignedAt: iso(ticket.firstAssignedAt),
    resolvedAt: iso(resolvedAt),
    closedAt: iso(ticket.closedAt),
    resolutionDays: resolutionDays(ticket.createdAt, resolvedAt),
  };
};

const toDetail = (ticket: ITicketDoc): TicketDetail => ({
  ...toListItem(ticket),
  description: ticket.description,
  activities: (ticket.activities ?? []).map(toActivity),
});

const detailPopulate = [
  { path: 'studentId', select: USER_FIELDS },
  { path: 'assigneeId', select: USER_FIELDS },
  { path: 'activities.actorId', select: USER_FIELDS },
  { path: 'activities.fromAssigneeId', select: USER_FIELDS },
  { path: 'activities.toAssigneeId', select: USER_FIELDS },
];

const assertStaff = (role: string): void => {
  if (!isStaffAssigneeRole(role)) {
    throw new ApiError(httpStatus.FORBIDDEN, 'Forbidden');
  }
};

const loadTicket = async (ticketId: mongoose.Types.ObjectId): Promise<ITicketDoc> => {
  const ticket = await Ticket.findById(ticketId);
  if (!ticket) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Ticket not found');
  }
  return ticket;
};

const populateDetail = async (ticket: ITicketDoc): Promise<TicketDetail> => {
  await ticket.populate(detailPopulate);
  return toDetail(ticket);
};

const allocateTicketNumber = async (attempt: number): Promise<number> => {
  try {
    const counter = await TicketCounter.findOneAndUpdate(
      { key: 'ticket' },
      { $inc: { seq: 1 } },
      { new: true, upsert: true, setDefaultsOnInsert: true }
    );
    if (!counter) {
      throw new ApiError(httpStatus.INTERNAL_SERVER_ERROR, 'Failed to allocate a ticket number');
    }
    return counter.seq;
  } catch (error) {
    const { code } = error as { code?: number };
    if (code === 11000 && attempt < 2) {
      return allocateTicketNumber(attempt + 1);
    }
    throw error;
  }
};

export const nextTicketNumber = async (): Promise<number> => allocateTicketNumber(0);

const notifyStudent = async (studentId: mongoose.Types.ObjectId, payload: PushPayload): Promise<void> => {
  try {
    await sendToUsers([studentId], payload);
  } catch (error) {
    logger.error(`Ticket push failed: ${error instanceof Error ? error.message : String(error)}`);
  }
};

const parseSort = (sortBy?: string): Record<string, 1 | -1> => {
  if (!sortBy) {
    return { createdAt: -1 };
  }
  const [field, order] = sortBy.split(':');
  if (!field || !SORT_FIELDS.has(field)) {
    return { createdAt: -1 };
  }
  return { [field]: order === 'asc' ? 1 : -1 };
};

const buildSearchFilter = async (search: string): Promise<Record<string, unknown> | null> => {
  const trimmed = search.trim();
  if (!trimmed) {
    return null;
  }

  const or: Record<string, unknown>[] = [{ subject: { $regex: escapeRegex(trimmed), $options: 'i' } }];
  const ticketNumber = parseTicketNumberQuery(trimmed);
  if (ticketNumber != null) {
    or.push({ ticketNumber });
  }

  const regex = { $regex: escapeRegex(trimmed), $options: 'i' };
  const students = await User.find({
    role: 'student',
    $or: [{ name: regex }, { rollNumber: regex }],
  })
    .select('_id')
    .limit(100);

  if (students.length > 0) {
    or.push({ studentId: { $in: students.map((student) => student._id) } });
  }

  return { $or: or };
};

export interface QueryTicketsInput {
  actor: { id: string; role: string };
  status?: TicketStatus;
  assigneeId?: string;
  unassigned?: boolean;
  search?: string;
  sortBy?: string;
  limit?: number;
  page?: number;
}

export const queryTickets = async (input: QueryTicketsInput): Promise<TicketListResponse> => {
  const filter: Record<string, unknown> = {};

  if (input.actor.role === 'student') {
    filter['studentId'] = new mongoose.Types.ObjectId(input.actor.id);
  } else {
    assertStaff(input.actor.role);
    if (input.unassigned) {
      filter['assigneeId'] = null;
    } else if (input.assigneeId) {
      filter['assigneeId'] = new mongoose.Types.ObjectId(input.assigneeId);
    }
  }

  if (input.status) {
    filter['status'] = input.status;
  }

  if (input.search) {
    const searchFilter = await buildSearchFilter(input.search);
    if (searchFilter) {
      Object.assign(filter, searchFilter);
    }
  }

  const limit = Math.min(Math.max(input.limit ?? 20, 1), 100);
  const page = Math.max(input.page ?? 1, 1);
  const skip = (page - 1) * limit;

  const [totalResults, tickets] = await Promise.all([
    Ticket.countDocuments(filter),
    Ticket.find(filter)
      .sort(parseSort(input.sortBy))
      .skip(skip)
      .limit(limit)
      .select('-activities')
      .populate('studentId', USER_FIELDS)
      .populate('assigneeId', USER_FIELDS),
  ]);

  return {
    results: tickets.map(toListItem),
    page,
    limit,
    totalPages: Math.ceil(totalResults / limit) || 0,
    totalResults,
  };
};

export const createTicket = async (
  studentId: mongoose.Types.ObjectId,
  subject: string,
  description: string
): Promise<TicketDetail> => {
  const now = new Date();
  const ticket = await Ticket.create({
    ticketNumber: await nextTicketNumber(),
    studentId,
    subject,
    description,
    status: 'open',
    assigneeId: null,
    activities: [
      {
        type: 'created',
        actorId: studentId,
        at: now,
      },
    ],
  });

  return populateDetail(ticket);
};

export const getTicketById = async (
  ticketId: mongoose.Types.ObjectId,
  actor: { id: string; role: string }
): Promise<TicketDetail> => {
  const ticket = await loadTicket(ticketId);
  try {
    assertCanViewTicket(actor, readId(ticket.studentId));
  } catch (error) {
    if (error instanceof TicketRuleError) {
      throw new ApiError(httpStatus.FORBIDDEN, error.message);
    }
    throw error;
  }
  return populateDetail(ticket);
};

const ensureAssignee = async (assigneeId: string): Promise<void> => {
  const assignee = await User.findById(assigneeId).select('role isActive');
  if (!assignee || !assignee.isActive || !isStaffAssigneeRole(assignee.role)) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Assignee must be an active admin, aqsd, or master');
  }
};

export const assignTicket = async (
  ticketId: mongoose.Types.ObjectId,
  actor: { id: string; role: string },
  assigneeId: string | null
): Promise<TicketDetail> => {
  assertStaff(actor.role);
  if (assigneeId) {
    await ensureAssignee(assigneeId);
  }

  const ticket = await loadTicket(ticketId);
  const now = new Date();
  let next;
  try {
    next = nextAssignment({
      status: ticket.status,
      currentAssigneeId: readId(ticket.assigneeId) || null,
      firstAssignedAt: ticket.firstAssignedAt ?? null,
      nextAssigneeId: assigneeId,
      now,
    });
  } catch (error) {
    throw asRuleError(error);
  }

  if (next.activity) {
    const currentAssigneeId = readId(ticket.assigneeId);
    ticket.assigneeId = next.assigneeId ? new mongoose.Types.ObjectId(next.assigneeId) : null;
    ticket.firstAssignedAt = next.firstAssignedAt;
    ticket.activities.push({
      type: next.activity,
      actorId: new mongoose.Types.ObjectId(actor.id),
      at: now,
      ...(currentAssigneeId ? { fromAssigneeId: new mongoose.Types.ObjectId(currentAssigneeId) } : {}),
      ...(next.assigneeId ? { toAssigneeId: new mongoose.Types.ObjectId(next.assigneeId) } : {}),
    });
    await ticket.save();
  }

  return populateDetail(ticket);
};

export const updateTicketStatus = async (
  ticketId: mongoose.Types.ObjectId,
  actor: { id: string; role: string },
  status: TicketStatus
): Promise<TicketDetail> => {
  assertStaff(actor.role);
  const ticket = await loadTicket(ticketId);
  const now = new Date();

  let next;
  try {
    next = nextStatusDates({
      from: ticket.status,
      to: status,
      resolvedAt: ticket.resolvedAt ?? null,
      closedAt: ticket.closedAt ?? null,
      now,
    });
  } catch (error) {
    throw asRuleError(error);
  }

  if (statusRequiresAssignee(next.status) && !ticket.assigneeId) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Assign this ticket before changing it to that status');
  }

  const fromStatus = ticket.status;
  ticket.status = next.status;
  ticket.resolvedAt = next.resolvedAt;
  ticket.closedAt = next.closedAt;
  ticket.activities.push({
    type: 'status_changed',
    actorId: new mongoose.Types.ObjectId(actor.id),
    at: now,
    fromStatus,
    toStatus: next.status,
  });
  await ticket.save();

  await notifyStudent(ticket.studentId, {
    title: 'Concern update',
    body: `${formatTicketNumber(ticket.ticketNumber)} is now ${statusLabel(next.status)}.`,
    data: {
      type: 'ticket_updated',
      ticketId: ticket.id,
    },
  });

  return populateDetail(ticket);
};

export const addTicketComment = async (
  ticketId: mongoose.Types.ObjectId,
  actor: { id: string; role: string },
  body: string
): Promise<TicketDetail> => {
  assertStaff(actor.role);
  const note = body.trim();
  if (!note) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Comment cannot be empty');
  }

  const ticket = await loadTicket(ticketId);
  const now = new Date();
  ticket.activities.push({
    type: 'comment',
    actorId: new mongoose.Types.ObjectId(actor.id),
    at: now,
    body: note,
  });
  await ticket.save();

  const preview = note.length > 120 ? `${note.slice(0, 117)}...` : note;
  await notifyStudent(ticket.studentId, {
    title: 'New note on your concern',
    body: `${formatTicketNumber(ticket.ticketNumber)}: ${preview}`,
    data: {
      type: 'ticket_updated',
      ticketId: ticket.id,
    },
  });

  return populateDetail(ticket);
};

export const getTicketStats = async (): Promise<TicketStats> => {
  const [statusGroups, unassigned, averageGroup, assigneeGroups] = await Promise.all([
    Ticket.aggregate<{ _id: TicketStatus; count: number }>([{ $group: { _id: '$status', count: { $sum: 1 } } }]),
    Ticket.countDocuments({ assigneeId: null }),
    Ticket.aggregate<{ average: number | null }>([
      { $match: { resolvedAt: { $ne: null } } },
      {
        $group: {
          _id: null,
          average: {
            $avg: {
              $dateDiff: {
                startDate: '$createdAt',
                endDate: '$resolvedAt',
                unit: 'day',
                timezone: 'Asia/Kolkata',
              },
            },
          },
        },
      },
    ]),
    Ticket.aggregate<{ _id: mongoose.Types.ObjectId; count: number; name?: string; role?: string }>([
      { $match: { assigneeId: { $ne: null } } },
      { $group: { _id: '$assigneeId', count: { $sum: 1 } } },
      {
        $lookup: {
          from: 'users',
          localField: '_id',
          foreignField: '_id',
          as: 'assignee',
        },
      },
      { $unwind: { path: '$assignee', preserveNullAndEmptyArrays: true } },
      {
        $project: {
          count: 1,
          name: '$assignee.name',
          role: '$assignee.role',
        },
      },
      { $sort: { count: -1, name: 1 } },
    ]),
  ]);

  const countFor = (status: TicketStatus): number => statusGroups.find((group) => group._id === status)?.count ?? 0;
  const open = countFor('open');
  const inProgress = countFor('in_progress');
  const resolved = countFor('resolved');
  const closed = countFor('closed');
  const rawAverage = averageGroup[0]?.average;
  const averageResolutionDays = rawAverage == null ? null : Math.round(rawAverage * 10) / 10;

  return {
    total: open + inProgress + resolved + closed,
    open,
    inProgress,
    resolved,
    closed,
    unassigned,
    averageResolutionDays,
    byAssignee: assigneeGroups.map((group) => ({
      assignee: {
        id: group._id.toString(),
        name: group.name?.trim() || 'Former staff',
        ...(group.role ? { role: group.role } : {}),
      },
      count: group.count,
    })),
  };
};

export const getTicketAssignees = async (): Promise<TicketAssigneeOption[]> => {
  const users = await User.find({
    role: { $in: [...STAFF_ASSIGNEE_ROLES] },
    isActive: true,
  })
    .select('name role')
    .sort({ name: 1 });

  return users.map((user) => ({
    id: user.id,
    name: user.name,
    role: user.role,
  }));
};
