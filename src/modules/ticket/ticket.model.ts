import mongoose from 'mongoose';
import toJSON from '../toJSON/toJSON';
import { TICKET_ACTIVITY_TYPES, TICKET_STATUSES, ITicketDoc, ITicketModel } from './ticket.interfaces';

const activitySchema = new mongoose.Schema(
  {
    type: {
      type: String,
      enum: TICKET_ACTIVITY_TYPES,
      required: true,
    },
    actorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    at: {
      type: Date,
      required: true,
      default: Date.now,
    },
    fromStatus: {
      type: String,
      enum: TICKET_STATUSES,
    },
    toStatus: {
      type: String,
      enum: TICKET_STATUSES,
    },
    fromAssigneeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    toAssigneeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    body: {
      type: String,
      trim: true,
      maxlength: 2000,
    },
  },
  { _id: false }
);

const ticketSchema = new mongoose.Schema<ITicketDoc, ITicketModel>(
  {
    ticketNumber: {
      type: Number,
      required: true,
      unique: true,
    },
    studentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    subject: {
      type: String,
      required: true,
      trim: true,
      minlength: 3,
      maxlength: 120,
    },
    description: {
      type: String,
      required: true,
      trim: true,
      minlength: 10,
      maxlength: 4000,
    },
    status: {
      type: String,
      enum: TICKET_STATUSES,
      required: true,
      default: 'open',
    },
    assigneeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    firstAssignedAt: {
      type: Date,
      default: null,
    },
    resolvedAt: {
      type: Date,
      default: null,
    },
    closedAt: {
      type: Date,
      default: null,
    },
    activities: {
      type: [activitySchema],
      default: [],
    },
  },
  {
    timestamps: true,
  }
);

ticketSchema.index({ studentId: 1, createdAt: -1 });
ticketSchema.index({ status: 1, createdAt: -1 });
ticketSchema.index({ assigneeId: 1, status: 1 });

ticketSchema.plugin(toJSON);

const Ticket = mongoose.model<ITicketDoc, ITicketModel>('Ticket', ticketSchema);

interface ITicketCounterDoc extends mongoose.Document {
  key: string;
  seq: number;
}

const ticketCounterSchema = new mongoose.Schema<ITicketCounterDoc>({
  key: {
    type: String,
    required: true,
    unique: true,
  },
  seq: {
    type: Number,
    required: true,
    default: 0,
  },
});

export const TicketCounter = mongoose.model<ITicketCounterDoc>('TicketCounter', ticketCounterSchema);

export default Ticket;
