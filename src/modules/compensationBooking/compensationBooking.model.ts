import mongoose from 'mongoose';
import toJSON from '../toJSON/toJSON';
import paginate from '../paginate/paginate';
import {
  COMPENSATION_BOOKING_STATUSES,
  ICompensationBookingDoc,
  ICompensationBookingModel,
} from './compensationBooking.interfaces';

const compensationBookingSchema = new mongoose.Schema<ICompensationBookingDoc, ICompensationBookingModel>(
  {
    studentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    homeClassId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Classes',
      required: true,
    },
    targetClassId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Classes',
      required: true,
    },
    date: {
      type: Date,
      required: true,
    },
    status: {
      type: String,
      enum: COMPENSATION_BOOKING_STATUSES,
      default: 'confirmed',
      required: true,
    },
    bookedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    cancelledAt: {
      type: Date,
    },
    cancelledBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    notes: {
      type: String,
      trim: true,
    },
  },
  {
    timestamps: true,
  }
);

// One active booking per student + target class + date
compensationBookingSchema.index(
  { studentId: 1, targetClassId: 1, date: 1 },
  { unique: true, partialFilterExpression: { status: 'confirmed' } }
);

compensationBookingSchema.index({ targetClassId: 1, date: 1, status: 1 });
compensationBookingSchema.index({ studentId: 1, status: 1, date: 1 });
compensationBookingSchema.index({ homeClassId: 1, status: 1 });

compensationBookingSchema.plugin(toJSON);
compensationBookingSchema.plugin(paginate);

const CompensationBooking = mongoose.model<ICompensationBookingDoc, ICompensationBookingModel>(
  'CompensationBooking',
  compensationBookingSchema
);

export default CompensationBooking;
