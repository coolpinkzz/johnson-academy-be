import mongoose, { Model, Document } from 'mongoose';
import { QueryResult } from '../paginate/paginate';

export const PACKAGE_STATES = ['valid', 'cancelled'] as const;
export type PackageState = typeof PACKAGE_STATES[number];

export const PAYMENT_STATUSES = ['unpaid', 'partial', 'paid', 'overpaid'] as const;
export type PaymentStatus = typeof PAYMENT_STATUSES[number];

export const RENEWAL_STATUSES = ['upcoming', 'active', 'expiring', 'expired'] as const;
export type RenewalStatus = typeof RENEWAL_STATUSES[number];

export const PAYMENT_TYPES = ['payment', 'refund'] as const;
export type PaymentType = typeof PAYMENT_TYPES[number];

export const PAYMENT_RECORD_STATUSES = ['completed', 'voided'] as const;
export type PaymentRecordStatus = typeof PAYMENT_RECORD_STATUSES[number];

export const PAYMENT_METHODS = ['upi', 'card', 'card_machine', 'cash', 'bank_transfer', 'cheque', 'other'] as const;
export type PaymentMethod = typeof PAYMENT_METHODS[number];

/** Days before endDate at which a package counts as "expiring" when no window is given */
export const DEFAULT_EXPIRING_WITHIN_DAYS = 30;

export const MAX_PACKAGE_DURATION_MONTHS = 36;

/**
 * Amounts are whole rupees (integers). Calendar dates are stored at UTC midnight of the
 * India calendar day; `endDate` is the last covered day (inclusive).
 */
export interface IStudentPackage {
  studentId: mongoose.Types.ObjectId;
  courseId: mongoose.Types.ObjectId;
  startDate: Date;
  endDate: Date;
  durationMonths: number;
  amount: number;
  /** Cached from completed payments; written only by recalculatePackageTotals */
  amountPaid: number;
  amountRefunded: number;
  balance: number;
  paymentStatus: PaymentStatus;
  state: PackageState;
  renewalOfId?: mongoose.Types.ObjectId;
  notes?: string;
  cancelReason?: string;
  cancelledAt?: Date;
  cancelledBy?: mongoose.Types.ObjectId;
  createdBy: mongoose.Types.ObjectId;
  updatedBy: mongoose.Types.ObjectId;
}

export interface IStudentPackageDoc extends IStudentPackage, Document {}

export interface IStudentPackageModel extends Model<IStudentPackageDoc> {
  paginate(filter: Record<string, any>, options: Record<string, any>): Promise<QueryResult>;
}

export interface IStudentPayment {
  studentId: mongoose.Types.ObjectId;
  packageId: mongoose.Types.ObjectId;
  type: PaymentType;
  amount: number;
  method: PaymentMethod;
  reference?: string;
  /** Uppercased, whitespace-free reference used for duplicate detection */
  referenceKey?: string;
  paidAt: Date;
  status: PaymentRecordStatus;
  notes?: string;
  voidReason?: string;
  voidedAt?: Date;
  voidedBy?: mongoose.Types.ObjectId;
  createdBy: mongoose.Types.ObjectId;
}

export interface IStudentPaymentDoc extends IStudentPayment, Document {}

export interface IStudentPaymentModel extends Model<IStudentPaymentDoc> {
  paginate(filter: Record<string, any>, options: Record<string, any>): Promise<QueryResult>;
}

export type NewPaymentBody = {
  type?: PaymentType;
  amount: number;
  method: PaymentMethod;
  reference?: string;
  paidAt?: string;
  notes?: string;
};

export type NewPackageBody = {
  studentId: string;
  courseId: string;
  startDate: string;
  durationMonths: number;
  /** Optional override; derived from startDate + durationMonths otherwise */
  endDate?: string;
  amount: number;
  renewalOfId?: string;
  notes?: string;
  initialPayment?: Omit<NewPaymentBody, 'type'>;
};

export type UpdatePackageBody = Partial<{
  startDate: string;
  durationMonths: number;
  endDate: string;
  amount: number;
  notes: string;
}>;

export type PackageListFilter = {
  search?: string;
  courseId?: string;
  renewalStatus?: RenewalStatus;
  withinDays?: number;
  paymentStatus?: PaymentStatus;
  /** Restrict to students whose rollNumber falls in these branches; [] = none */
  branchIn?: string[];
};

export const PACKAGE_LIST_SORT_FIELDS = ['endDate', 'startDate', 'balance', 'amount', 'studentName'] as const;
export type PackageListSortField = typeof PACKAGE_LIST_SORT_FIELDS[number];

export type FeeStudentSummary = {
  id: string;
  name: string;
  email: string | null;
  rollNumber: string | null;
  phoneNumber: string | null;
  isActive: boolean;
};

export type FeeCourseSummary = {
  id: string;
  name: string;
  instrument: string | null;
};

export type PaymentView = {
  id: string;
  packageId: string;
  type: PaymentType;
  amount: number;
  method: PaymentMethod;
  reference: string | null;
  paidAt: Date;
  status: PaymentRecordStatus;
  notes: string | null;
  voidReason: string | null;
  voidedAt: Date | null;
  recordedBy: { id: string; name: string } | null;
};

export type PackageView = {
  id: string;
  studentId: string;
  course: FeeCourseSummary | null;
  startDate: Date;
  endDate: Date;
  durationMonths: number;
  amount: number;
  amountPaid: number;
  amountRefunded: number;
  balance: number;
  paymentStatus: PaymentStatus;
  state: PackageState;
  /** null for cancelled packages */
  renewalStatus: RenewalStatus | null;
  /** Days from today to endDate (negative once expired) */
  daysRemaining: number;
  renewalOfId: string | null;
  notes: string | null;
  cancelReason: string | null;
  cancelledAt: Date | null;
};

export type PackageWithPaymentsView = PackageView & { payments: PaymentView[] };

export type PackageListItemView = PackageView & { student: FeeStudentSummary };

export type StudentFeesView = {
  student: FeeStudentSummary;
  packages: PackageWithPaymentsView[];
};

export type PackageListResult = {
  results: PackageListItemView[];
  page: number;
  limit: number;
  totalPages: number;
  totalResults: number;
};
