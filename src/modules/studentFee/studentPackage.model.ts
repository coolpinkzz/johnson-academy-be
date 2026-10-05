import mongoose from 'mongoose';
import toJSON from '../toJSON/toJSON';
import paginate from '../paginate/paginate';
import {
  IStudentPackageDoc,
  IStudentPackageModel,
  MAX_PACKAGE_DURATION_MONTHS,
  PACKAGE_STATES,
  PAYMENT_STATUSES,
} from './studentFee.interfaces';

const wholeRupees = {
  validator: Number.isInteger,
  message: '{PATH} must be a whole number of rupees',
};

const studentPackageSchema = new mongoose.Schema<IStudentPackageDoc, IStudentPackageModel>(
  {
    studentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    courseId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Course',
      required: true,
    },
    startDate: {
      type: Date,
      required: true,
    },
    endDate: {
      type: Date,
      required: true,
      validate: {
        validator(this: IStudentPackageDoc, value: Date) {
          return !this.startDate || value >= this.startDate;
        },
        message: 'endDate must be on or after startDate',
      },
    },
    durationMonths: {
      type: Number,
      required: true,
      min: 1,
      max: MAX_PACKAGE_DURATION_MONTHS,
      validate: { validator: Number.isInteger, message: 'durationMonths must be an integer' },
    },
    amount: {
      type: Number,
      required: true,
      min: 0,
      validate: wholeRupees,
    },
    amountPaid: {
      type: Number,
      required: true,
      default: 0,
    },
    amountRefunded: {
      type: Number,
      required: true,
      default: 0,
    },
    balance: {
      type: Number,
      required: true,
      default: 0,
    },
    paymentStatus: {
      type: String,
      enum: PAYMENT_STATUSES,
      required: true,
      default: 'unpaid',
    },
    state: {
      type: String,
      enum: PACKAGE_STATES,
      required: true,
      default: 'valid',
    },
    renewalOfId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'StudentPackage',
    },
    notes: {
      type: String,
      trim: true,
    },
    cancelReason: {
      type: String,
      trim: true,
    },
    cancelledAt: {
      type: Date,
    },
    cancelledBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

studentPackageSchema.index({ studentId: 1, courseId: 1, startDate: -1 });
studentPackageSchema.index({ state: 1, endDate: 1 });

studentPackageSchema.plugin(toJSON);
studentPackageSchema.plugin(paginate);

const StudentPackage = mongoose.model<IStudentPackageDoc, IStudentPackageModel>('StudentPackage', studentPackageSchema);

export default StudentPackage;
