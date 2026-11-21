import httpStatus from 'http-status';
import mongoose from 'mongoose';
import ApiError from '../errors/ApiError';
import User from '../user/user.model';
import FeePackage, { IFeePackageDoc, IFeePayment, PaymentMethod, PaymentType } from './studentFee.model';

const DAY_MS = 24 * 60 * 60 * 1000;
const PAYMENT_METHODS: PaymentMethod[] = ['upi', 'card', 'card_machine', 'cash', 'bank_transfer', 'cheque', 'other'];

type PaymentInput = {
  type?: PaymentType;
  amount: number;
  method: PaymentMethod;
  reference?: string;
  paidAt?: string;
  notes?: string;
};

const dateKey = (date: Date | string): string => new Date(date).toISOString().slice(0, 10);

const todayInIndia = (): string => {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date());
  const values: Record<string, string> = {};
  parts.forEach((part) => {
    values[part.type] = part.value;
  });
  return `${values['year']}-${values['month']}-${values['day']}`;
};

const parseDate = (value: string): Date => {
  const date = new Date(`${value}T00:00:00.000Z`);
  if (Number.isNaN(date.getTime()) || dateKey(date) !== value) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Invalid date');
  }
  return date;
};

const calculateEndDate = (startDate: Date, durationMonths: number): Date => {
  const totalMonths = startDate.getUTCMonth() + durationMonths;
  const year = startDate.getUTCFullYear() + Math.floor(totalMonths / 12);
  const month = totalMonths % 12;
  const day = Math.min(startDate.getUTCDate(), new Date(Date.UTC(year, month + 1, 0)).getUTCDate());
  return new Date(Date.UTC(year, month, day) - DAY_MS);
};

const getAmountTotals = (feePackage: IFeePackageDoc) => {
  const payments = feePackage.payments.filter((payment) => payment.status === 'completed');
  const amountPaid = payments
    .filter((payment) => payment.type === 'payment')
    .reduce((total, payment) => total + payment.amount, 0);
  const amountRefunded = payments
    .filter((payment) => payment.type === 'refund')
    .reduce((total, payment) => total + payment.amount, 0);
  const netPaid = amountPaid - amountRefunded;
  let paymentStatus: 'unpaid' | 'partial' | 'paid' | 'overpaid';
  if (netPaid <= 0) paymentStatus = 'unpaid';
  else if (netPaid < feePackage.amount) paymentStatus = 'partial';
  else if (netPaid === feePackage.amount) paymentStatus = 'paid';
  else paymentStatus = 'overpaid';
  return {
    amountPaid,
    amountRefunded,
    balance: feePackage.amount - netPaid,
    paymentStatus,
  };
};

const getRenewalStatus = (feePackage: IFeePackageDoc) => {
  if (feePackage.state !== 'valid') return null;
  const today = todayInIndia();
  const start = dateKey(feePackage.startDate);
  const end = dateKey(feePackage.endDate);
  if (start > today) return 'upcoming';
  if (end < today) return 'expired';
  const daysRemaining = Math.ceil((parseDate(end).getTime() - parseDate(today).getTime()) / DAY_MS);
  return daysRemaining <= 30 ? 'expiring' : 'active';
};

const getDaysRemaining = (feePackage: IFeePackageDoc) => {
  const referenceDate = getRenewalStatus(feePackage) === 'upcoming' ? feePackage.startDate : feePackage.endDate;
  return Math.ceil((parseDate(dateKey(referenceDate)).getTime() - parseDate(todayInIndia()).getTime()) / DAY_MS);
};

export const toFeePackageDto = (feePackage: IFeePackageDoc) => {
  const totals = getAmountTotals(feePackage);
  return {
    id: feePackage.id,
    studentId: feePackage.studentId.toString(),
    course: {
      id: feePackage.courseId,
      name: feePackage.courseName,
      instrument: feePackage.instrument,
    },
    startDate: dateKey(feePackage.startDate),
    endDate: dateKey(feePackage.endDate),
    durationMonths: feePackage.durationMonths,
    amount: feePackage.amount,
    ...totals,
    state: feePackage.state,
    renewalStatus: getRenewalStatus(feePackage),
    daysRemaining: getDaysRemaining(feePackage),
    renewalOfId: feePackage.renewalOfId?.toString() ?? null,
    notes: feePackage.notes,
    cancelReason: feePackage.cancelReason,
    cancelledAt: feePackage.cancelledAt?.toISOString() ?? null,
    payments: feePackage.payments.map((payment) => ({
      id: payment.id,
      packageId: feePackage.id,
      type: payment.type,
      amount: payment.amount,
      method: payment.method,
      reference: payment.reference,
      paidAt: payment.paidAt.toISOString(),
      status: payment.status,
      notes: payment.notes,
      voidReason: payment.voidReason,
      voidedAt: payment.voidedAt?.toISOString() ?? null,
      recordedBy: payment.recordedBy,
    })),
  };
};

export const getStudentFeeProfileStatus = (packages: IFeePackageDoc[]) => {
  const latest = [...packages].sort((a, b) => b.startDate.getTime() - a.startDate.getTime())[0];
  if (!latest || latest.state !== 'valid') return 'none';
  return getRenewalStatus(latest) ?? 'none';
};

const getCourseDetails = async (studentId: mongoose.Types.ObjectId, courseId: string) => {
  const student = await User.findById(studentId).select('courses');
  const embeddedCourse = student?.courses?.find((course) => course.id === courseId);
  if (embeddedCourse) {
    return { courseName: embeddedCourse.name, instrument: embeddedCourse.instrument || null };
  }
  const course = await mongoose.connection.collection('courses').findOne({
    $or: [{ id: courseId }, ...(mongoose.isValidObjectId(courseId) ? [{ _id: new mongoose.Types.ObjectId(courseId) }] : [])],
  });
  if (!course) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Course not found');
  }
  return {
    courseName: String(course['name'] || 'Unknown course'),
    instrument: typeof course['instrument'] === 'string' ? course['instrument'] : null,
  };
};

const addPaymentRecord = (feePackage: IFeePackageDoc, payment: PaymentInput, recordedBy: { id: string; name: string }) => {
  if (!PAYMENT_METHODS.includes(payment.method)) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Invalid payment method');
  }
  if (!Number.isInteger(payment.amount) || payment.amount < 1) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Payment amount must be a positive whole number');
  }
  const type = payment.type ?? 'payment';
  if (type === 'refund') {
    const refundable = getAmountTotals(feePackage).amountPaid - getAmountTotals(feePackage).amountRefunded;
    if (payment.amount > refundable) {
      throw new ApiError(httpStatus.BAD_REQUEST, 'Refund exceeds the remaining refundable amount');
    }
  }
  feePackage.payments.push({
    type,
    amount: payment.amount,
    method: payment.method,
    reference: payment.reference || null,
    paidAt: parseDate(payment.paidAt || todayInIndia()),
    status: 'completed',
    notes: payment.notes || null,
    voidReason: null,
    voidedAt: null,
    recordedBy,
  } as IFeePayment);
};

export const getStudentFees = async (studentId: mongoose.Types.ObjectId) => {
  const student = await User.findOne({ _id: studentId, deletedAt: null });
  if (!student || !['student', 'user'].includes(student.role)) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Student not found');
  }
  const packages = await FeePackage.find({ studentId }).sort({ startDate: -1, createdAt: -1 });
  return {
    student: {
      id: student.id,
      name: student.name,
      email: student.email,
      rollNumber: student.rollNumber || null,
      phoneNumber: student.phoneNumber || null,
      isActive: student.isActive !== false,
    },
    packages: packages.map(toFeePackageDto),
  };
};

export const createPackage = async (
  payload: {
    studentId: string;
    courseId: string;
    startDate: string;
    durationMonths: number;
    endDate?: string;
    amount: number;
    renewalOfId?: string;
    notes?: string;
    initialPayment?: Omit<PaymentInput, 'type'>;
  },
  recordedBy: { id: string; name: string }
) => {
  const studentId = new mongoose.Types.ObjectId(payload.studentId);
  const student = await User.findOne({ _id: studentId, deletedAt: null });
  if (!student || !['student', 'user'].includes(student.role)) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Student not found');
  }
  const course = await getCourseDetails(studentId, payload.courseId);
  let renewalOfId: mongoose.Types.ObjectId | null = null;
  if (payload.renewalOfId) {
    if (!mongoose.isValidObjectId(payload.renewalOfId)) {
      throw new ApiError(httpStatus.BAD_REQUEST, 'Invalid renewal package');
    }
    const priorPackage = await FeePackage.findOne({
      _id: payload.renewalOfId,
      studentId,
      courseId: payload.courseId,
    });
    if (!priorPackage) throw new ApiError(httpStatus.NOT_FOUND, 'Renewal package not found');
    renewalOfId = priorPackage._id;
  }
  const startDate = parseDate(payload.startDate);
  const endDate = payload.endDate ? parseDate(payload.endDate) : calculateEndDate(startDate, payload.durationMonths);
  if (endDate < startDate) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'End date must be on or after the start date');
  }
  const feePackage = new FeePackage({
    studentId,
    courseId: payload.courseId,
    ...course,
    startDate,
    endDate,
    durationMonths: payload.durationMonths,
    amount: payload.amount,
    renewalOfId,
    notes: payload.notes || null,
  });
  if (payload.initialPayment) addPaymentRecord(feePackage, payload.initialPayment, recordedBy);
  await feePackage.save();
  return toFeePackageDto(feePackage);
};

export const updatePackage = async (
  packageId: mongoose.Types.ObjectId,
  update: { startDate?: string; durationMonths?: number; endDate?: string; amount?: number; notes?: string }
) => {
  const feePackage = await FeePackage.findOne({ _id: packageId, state: 'valid' });
  if (!feePackage) throw new ApiError(httpStatus.NOT_FOUND, 'Fee package not found');
  if (update.startDate) feePackage.startDate = parseDate(update.startDate);
  if (update.durationMonths != null) feePackage.durationMonths = update.durationMonths;
  if (update.endDate) feePackage.endDate = parseDate(update.endDate);
  else if (update.startDate || update.durationMonths != null) {
    feePackage.endDate = calculateEndDate(feePackage.startDate, feePackage.durationMonths);
  }
  if (feePackage.endDate < feePackage.startDate) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'End date must be on or after the start date');
  }
  if (update.amount != null) feePackage.amount = update.amount;
  if (update.notes != null) feePackage.notes = update.notes || null;
  await feePackage.save();
  return toFeePackageDto(feePackage);
};

export const cancelPackage = async (packageId: mongoose.Types.ObjectId, reason: string) => {
  const feePackage = await FeePackage.findById(packageId);
  if (!feePackage || feePackage.state !== 'valid') {
    throw new ApiError(httpStatus.NOT_FOUND, 'Active fee package not found');
  }
  const totals = getAmountTotals(feePackage);
  if (totals.amountPaid - totals.amountRefunded > 0) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Void or refund all payments before cancelling this package');
  }
  feePackage.state = 'cancelled';
  feePackage.cancelReason = reason;
  feePackage.cancelledAt = new Date();
  await feePackage.save();
  return toFeePackageDto(feePackage);
};

export const addPayment = async (
  packageId: mongoose.Types.ObjectId,
  payment: PaymentInput,
  recordedBy: { id: string; name: string }
) => {
  const feePackage = await FeePackage.findOne({ _id: packageId, state: 'valid' });
  if (!feePackage) throw new ApiError(httpStatus.NOT_FOUND, 'Active fee package not found');
  addPaymentRecord(feePackage, payment, recordedBy);
  await feePackage.save();
  return toFeePackageDto(feePackage);
};

export const voidPayment = async (paymentId: mongoose.Types.ObjectId, reason: string) => {
  const feePackage = await FeePackage.findOne({ 'payments._id': paymentId });
  if (!feePackage) throw new ApiError(httpStatus.NOT_FOUND, 'Payment not found');
  const payment = feePackage.payments.id(paymentId);
  if (!payment || payment.status === 'voided') {
    throw new ApiError(httpStatus.CONFLICT, 'Payment is already voided');
  }
  payment.status = 'voided';
  payment.voidReason = reason;
  payment.voidedAt = new Date();
  await feePackage.save();
  return toFeePackageDto(feePackage);
};
