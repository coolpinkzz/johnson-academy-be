import mongoose, { Document, Model } from 'mongoose';

export const TICKET_STATUSES = ['open', 'in_progress', 'resolved', 'closed'] as const;
export type TicketStatus = typeof TICKET_STATUSES[number];

export const TICKET_ACTIVITY_TYPES = [
  'created',
  'assigned',
  'reassigned',
  'unassigned',
  'status_changed',
  'comment',
] as const;
export type TicketActivityType = typeof TICKET_ACTIVITY_TYPES[number];

export interface ITicketActivity {
  type: TicketActivityType;
  actorId: mongoose.Types.ObjectId;
  at: Date;
  fromStatus?: TicketStatus;
  toStatus?: TicketStatus;
  fromAssigneeId?: mongoose.Types.ObjectId;
  toAssigneeId?: mongoose.Types.ObjectId;
  body?: string;
}

export interface ITicket {
  ticketNumber: number;
  studentId: mongoose.Types.ObjectId;
  subject: string;
  description: string;
  status: TicketStatus;
  assigneeId?: mongoose.Types.ObjectId | null;
  firstAssignedAt?: Date | null;
  resolvedAt?: Date | null;
  closedAt?: Date | null;
  activities: ITicketActivity[];
}

export interface ITicketDoc extends ITicket, Document {
  createdAt: Date;
  updatedAt: Date;
}

export interface ITicketModel extends Model<ITicketDoc> {}

export interface PublicUser {
  id: string;
  name: string;
  role?: string;
  rollNumber?: string;
}

export interface TicketActivityResponse {
  type: TicketActivityType;
  at: string;
  actor: PublicUser | null;
  fromStatus?: TicketStatus;
  toStatus?: TicketStatus;
  fromAssignee?: PublicUser | null;
  toAssignee?: PublicUser | null;
  body?: string;
}

export interface TicketListItem {
  id: string;
  ticketNumber: number;
  displayId: string;
  subject: string;
  status: TicketStatus;
  student: PublicUser;
  assignee: PublicUser | null;
  createdAt: string;
  firstAssignedAt: string | null;
  resolvedAt: string | null;
  closedAt: string | null;
  resolutionDays: number | null;
}

export interface TicketDetail extends TicketListItem {
  description: string;
  activities: TicketActivityResponse[];
}

export interface TicketListResponse {
  results: TicketListItem[];
  page: number;
  limit: number;
  totalPages: number;
  totalResults: number;
}

export interface TicketAssigneeCount {
  assignee: PublicUser;
  count: number;
}

export interface TicketStats {
  total: number;
  open: number;
  inProgress: number;
  resolved: number;
  closed: number;
  unassigned: number;
  averageResolutionDays: number | null;
  byAssignee: TicketAssigneeCount[];
}

export interface TicketAssigneeOption {
  id: string;
  name: string;
  role: string;
}
