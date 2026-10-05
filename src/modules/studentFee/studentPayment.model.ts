import mongoose from 'mongoose';
import toJSON from '../toJSON/toJSON';
import paginate from '../paginate/paginate';
import {
  IStudentPaymentDoc,
  IStudentPaymentModel,
  PAYMENT_METHODS,
  PAYMENT_RECORD_STATUSES,
  PAYMENT_TYPES,
} from './studentFee.interfaces';

const studentPaymentSchema = new mongoose.Schema<IStudentPaymentDoc, IStudentPaymentModel>(
  {
    studentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    packageId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'StudentPackage',
      required: true,
    },
    type: {
      type: String,
      enum: PAYMENT_TYPES,
      required: true,
      default: 'payment',
    },
    amount: {
      type: Number,
      required: true,
      min: 1,
      validate: { validator: Number.isInteger, message: 'amount must be a whole number of rupees' },
    },
    method: {
      type: String,
      enum: PAYMENT_METHODS,
      required: true,
    },
    reference: {
      type: String,
      trim: true,
    },
    referenceKey: {
      type: String,
      private: true,
    },
    paidAt: {
      type: Date,
      required: true,
    },
    status: {
      type: String,
      enum: PAYMENT_RECORD_STATUSES,
      required: true,
      default: 'completed',
    },
    notes: {
      type: String,
      trim: true,
    },
    voidReason: {
      type: String,
      trim: true,
    },
    voidedAt: {
      type: Date,
    },
    voidedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

studentPaymentSchema.index({ packageId: 1, paidAt: -1 });
studentPaymentSchema.index({ studentId: 1, paidAt: -1 });
// A transaction reference may back only one live payment
studentPaymentSchema.index(
  { referenceKey: 1 },
  {
    unique: true,
    partialFilterExpression: { referenceKey: { $exists: true }, type: 'payment', status: 'completed' },
  }
);

studentPaymentSchema.plugin(toJSON);
studentPaymentSchema.plugin(paginate);

const StudentPayment = mongoose.model<IStudentPaymentDoc, IStudentPaymentModel>('StudentPayment', studentPaymentSchema);

export default StudentPayment;
