import mongoose, { Model, Document } from 'mongoose';
import { QueryResult } from '../paginate/paginate';

export const COMPENSATION_BOOKING_STATUSES = ['confirmed', 'cancelled'] as const;
export type CompensationBookingStatus = (typeof COMPENSATION_BOOKING_STATUSES)[number];

export const ACTIVE_COMPENSATION_STATUSES: CompensationBookingStatus[] = ['confirmed'];

export interface ICompensationBooking {
  studentId: mongoose.Types.ObjectId;
  homeClassId: mongoose.Types.ObjectId;
  targetClassId: mongoose.Types.ObjectId;
  /** Calendar date (UTC midnight for YYYY-MM-DD) */
  date: Date;
  status: CompensationBookingStatus;
  bookedBy?: mongoose.Types.ObjectId;
  cancelledAt?: Date;
  cancelledBy?: mongoose.Types.ObjectId;
  notes?: string;
}

export interface ICompensationBookingDoc extends ICompensationBooking, Document {}

export interface ICompensationBookingModel extends Model<ICompensationBookingDoc> {
  paginate(filter: Record<string, any>, options: Record<string, any>): Promise<QueryResult>;
}

export type NewCompensationBooking = {
  studentId: mongoose.Types.ObjectId;
  homeClassId: mongoose.Types.ObjectId;
  targetClassId: mongoose.Types.ObjectId;
  date: string | Date;
  notes?: string;
  bookedBy?: mongoose.Types.ObjectId;
};

export type ClassSeatAvailability = {
  classId: mongoose.Types.ObjectId;
  sessionCapacity: number;
  enrolledCount: number;
  confirmedGuestCount: number;
  usedSeats: number;
  availableSeats: number;
  isAvailable: boolean;
};
