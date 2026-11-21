import mongoose, { Document, Model, Schema } from 'mongoose';
import toJSON from '../toJSON/toJSON';

export type PaymentType = 'payment' | 'refund';
export type PaymentMethod = 'upi' | 'card' | 'card_machine' | 'cash' | 'bank_transfer' | 'cheque' | 'other';

export interface IFeePayment {
  type: PaymentType;
  amount: number;
  method: PaymentMethod;
  reference: string | null;
  paidAt: Date;
  status: 'completed' | 'voided';
  notes: string | null;
  voidReason: string | null;
  voidedAt: Date | null;
  recordedBy: { id: string; name: string } | null;
}

export interface IFeePackageDoc extends Document {
  studentId: mongoose.Types.ObjectId;
  courseId: string;
  courseName: string;
  instrument: string | null;
  startDate: Date;
  endDate: Date;
  durationMonths: number;
  amount: number;
  state: 'valid' | 'cancelled';
  renewalOfId: mongoose.Types.ObjectId | null;
  notes: string | null;
  cancelReason: string | null;
  cancelledAt: Date | null;
  payments: mongoose.Types.DocumentArray<IFeePayment & mongoose.Types.Subdocument>;
}

const paymentSchema = new Schema<IFeePayment>(
  {
    type: { type: String, enum: ['payment', 'refund'], default: 'payment' },
    amount: { type: Number, required: true, min: 1 },
    method: {
      type: String,
      enum: ['upi', 'card', 'card_machine', 'cash', 'bank_transfer', 'cheque', 'other'],
      required: true,
    },
    reference: { type: String, default: null },
    paidAt: { type: Date, required: true },
    status: { type: String, enum: ['completed', 'voided'], default: 'completed' },
    notes: { type: String, default: null },
    voidReason: { type: String, default: null },
    voidedAt: { type: Date, default: null },
    recordedBy: {
      id: { type: String, required: true },
      name: { type: String, required: true },
    },
  },
  { timestamps: true }
);

const feePackageSchema = new Schema<IFeePackageDoc>(
  {
    studentId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    courseId: { type: String, required: true },
    courseName: { type: String, required: true },
    instrument: { type: String, default: null },
    startDate: { type: Date, required: true },
    endDate: { type: Date, required: true },
    durationMonths: { type: Number, required: true, min: 1, max: 36 },
    amount: { type: Number, required: true, min: 0 },
    state: { type: String, enum: ['valid', 'cancelled'], default: 'valid' },
    renewalOfId: { type: Schema.Types.ObjectId, ref: 'FeePackage', default: null },
    notes: { type: String, default: null },
    cancelReason: { type: String, default: null },
    cancelledAt: { type: Date, default: null },
    payments: { type: [paymentSchema], default: [] },
  },
  { timestamps: true }
);

feePackageSchema.plugin(toJSON);

const FeePackage: Model<IFeePackageDoc> =
  mongoose.models['FeePackage'] || mongoose.model<IFeePackageDoc>('FeePackage', feePackageSchema);

export default FeePackage;
