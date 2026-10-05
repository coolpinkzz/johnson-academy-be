import httpStatus from 'http-status';
import mongoose from 'mongoose';
import ApiError from '../errors/ApiError';
import User from '../user/user.model';
import Course from '../course/course.model';
import { queryUsers } from '../user/user.service';
import { buildBranchAccessRollNumberOr, buildRollNumberSearchFilter } from '../user/rollNumber.util';
import { formatBookingDate, parseBookingDate, todayYmdInIndia } from '../compensationBooking/compensationBooking.util';
import { IOptions, QueryResult } from '../paginate/paginate';
import { recordAudit, diffFields, snapshotFields } from '../auditLog/auditLog.service';
import StudentPackage from './studentPackage.model';
import StudentPayment from './studentPayment.model';
import {
  FeeCourseSummary,
  FeeStudentSummary,
  IStudentPackage,
  IStudentPackageDoc,
  IStudentPayment,
  IStudentPaymentDoc,
  NewPackageBody,
  NewPaymentBody,
  PackageListFilter,
  PackageListItemView,
  PackageListResult,
  PackageListSortField,
  PackageView,
  PackageWithPaymentsView,
  PaymentView,
  StudentFeesView,
  UpdatePackageBody,
} from './studentFee.interfaces';
import {
  buildRenewalDateFilter,
  calculatePackageEndDate,
  calculatePaymentTotals,
  daysBetween,
  getRenewalStatus,
  normalizePaymentReference,
} from './studentFee.util';

type ObjectId = mongoose.Types.ObjectId;

const PACKAGE_AUDIT_FIELDS = [
  'courseId',
  'startDate',
  'endDate',
  'durationMonths',
  'amount',
  'notes',
  'renewalOfId',
] as const;
const PAYMENT_AUDIT_FIELDS = ['packageId', 'type', 'amount', 'method', 'reference', 'paidAt', 'notes'] as const;
const STUDENT_SUMMARY_FIELDS = 'name email rollNumber phoneNumber isActive role';

type StudentRef = {
  _id: ObjectId;
  name: string;
  email?: string;
  rollNumber?: string;
  phoneNumber?: string;
  isActive?: boolean;
};
type CourseRef = { _id: ObjectId; name: string; instrument?: string };
type RecorderRef = { _id: ObjectId; name: string };

type RawPackage = Omit<IStudentPackage, 'courseId'> & { _id: ObjectId; courseId: ObjectId | CourseRef | null };
type RawPayment = Omit<IStudentPayment, 'createdBy'> & { _id: ObjectId; createdBy: ObjectId | RecorderRef | null };
type RawListedPackage = RawPackage & { student: StudentRef };

const isPopulated = <T extends { _id: ObjectId }>(value: ObjectId | T | null | undefined): value is T =>
  value != null && !(value instanceof mongoose.Types.ObjectId);

const todayInIndia = (): Date => parseBookingDate(todayYmdInIndia());

const parseCalendarDate = (input: string, field: string): Date => {
  try {
    return parseBookingDate(input);
  } catch {
    throw new ApiError(httpStatus.BAD_REQUEST, `${field} must be a valid YYYY-MM-DD date`);
  }
};

const escapeRegex = (value: string): string => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// ---------- views ----------

const toStudentSummary = (student: StudentRef): FeeStudentSummary => ({
  id: student._id.toString(),
  name: student.name,
  email: student.email ?? null,
  rollNumber: student.rollNumber ?? null,
  phoneNumber: student.phoneNumber ?? null,
  isActive: student.isActive ?? true,
});

const toCourseSummary = (course: ObjectId | CourseRef | null): FeeCourseSummary | null =>
  isPopulated(course) ? { id: course._id.toString(), name: course.name, instrument: course.instrument ?? null } : null;

const toPaymentView = (payment: RawPayment): PaymentView => ({
  id: payment._id.toString(),
  packageId: payment.packageId.toString(),
  type: payment.type,
  amount: payment.amount,
  method: payment.method,
  reference: payment.reference ?? null,
  paidAt: payment.paidAt,
  status: payment.status,
  notes: payment.notes ?? null,
  voidReason: payment.voidReason ?? null,
  voidedAt: payment.voidedAt ?? null,
  recordedBy: isPopulated(payment.createdBy) ? { id: payment.createdBy._id.toString(), name: payment.createdBy.name } : null,
});

const toPackageView = (pkg: RawPackage, today: Date): PackageView => ({
  id: pkg._id.toString(),
  studentId: pkg.studentId.toString(),
  course: toCourseSummary(pkg.courseId),
  startDate: pkg.startDate,
  endDate: pkg.endDate,
  durationMonths: pkg.durationMonths,
  amount: pkg.amount,
  amountPaid: pkg.amountPaid,
  amountRefunded: pkg.amountRefunded,
  balance: pkg.balance,
  paymentStatus: pkg.paymentStatus,
  state: pkg.state,
  renewalStatus: pkg.state === 'valid' ? getRenewalStatus(pkg, today) : null,
  daysRemaining: daysBetween(today, pkg.endDate),
  renewalOfId: pkg.renewalOfId?.toString() ?? null,
  notes: pkg.notes ?? null,
  cancelReason: pkg.cancelReason ?? null,
  cancelledAt: pkg.cancelledAt ?? null,
});

const loadPayments = async (packageIds: ObjectId[]): Promise<RawPayment[]> =>
  StudentPayment.find({ packageId: { $in: packageIds } })
    .sort({ paidAt: -1, _id: -1 })
    .populate('createdBy', 'name')
    .lean<RawPayment[]>();

export const getPackageView = async (packageId: ObjectId): Promise<PackageWithPaymentsView> => {
  const pkg = await StudentPackage.findById(packageId).populate('courseId', 'name instrument').lean<RawPackage>();
  if (!pkg) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Package not found');
  }
  const payments = await loadPayments([pkg._id]);
  return { ...toPackageView(pkg, todayInIndia()), payments: payments.map(toPaymentView) };
};

// ---------- lookups & guards ----------

const getStudentOrThrow = async (studentId: ObjectId): Promise<StudentRef> => {
  const student = await User.findById(studentId).select(STUDENT_SUMMARY_FIELDS).lean<StudentRef & { role: string }>();
  if (!student || student.role !== 'student') {
    throw new ApiError(httpStatus.NOT_FOUND, 'Student not found');
  }
  return student;
};

/** Student that owns a package — used by controllers for branch-access checks. */
export const getStudentForPackage = async (packageId: ObjectId): Promise<StudentRef> => {
  const pkg = await StudentPackage.findById(packageId).select('studentId').lean();
  if (!pkg) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Package not found');
  }
  return getStudentOrThrow(pkg.studentId);
};

export const getStudentForPayment = async (paymentId: ObjectId): Promise<StudentRef> => {
  const payment = await StudentPayment.findById(paymentId).select('studentId').lean();
  if (!payment) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Payment not found');
  }
  return getStudentOrThrow(payment.studentId);
};

export const getStudentById = getStudentOrThrow;

const assertCourseExists = async (courseId: ObjectId): Promise<void> => {
  if (!(await Course.exists({ _id: courseId }))) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Course not found');
  }
};

const assertNoOverlap = async (
  params: { studentId: ObjectId; courseId: ObjectId; startDate: Date; endDate: Date; excludeId?: ObjectId },
  session: mongoose.ClientSession
): Promise<void> => {
  const overlapping = await StudentPackage.findOne({
    studentId: params.studentId,
    courseId: params.courseId,
    state: 'valid',
    startDate: { $lte: params.endDate },
    endDate: { $gte: params.startDate },
    ...(params.excludeId ? { _id: { $ne: params.excludeId } } : {}),
  })
    .select('startDate endDate')
    .session(session)
    .lean();

  if (overlapping) {
    throw new ApiError(
      httpStatus.CONFLICT,
      `Overlaps an existing package for this course (${formatBookingDate(overlapping.startDate)} to ${formatBookingDate(
        overlapping.endDate
      )})`
    );
  }
};

const assertPaidAtNotInFuture = (paidAt: Date): void => {
  if (paidAt > todayInIndia()) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'paidAt cannot be in the future');
  }
};

const assertReferenceAvailable = async (referenceKey: string, session: mongoose.ClientSession): Promise<void> => {
  const existing = await StudentPayment.exists({ referenceKey, type: 'payment', status: 'completed' }).session(session);
  if (existing) {
    throw new ApiError(httpStatus.CONFLICT, 'A payment with this transaction reference already exists');
  }
};

/** Recompute cached totals from completed payments. Caller saves the package. */
const recalculatePackageTotals = async (pkg: IStudentPackageDoc, session: mongoose.ClientSession): Promise<void> => {
  const payments = await StudentPayment.find({ packageId: pkg._id }).select('type amount status').session(session).lean();
  pkg.set(calculatePaymentTotals(pkg.amount, payments));
};

const runInTransaction = async <T>(work: (session: mongoose.ClientSession) => Promise<T>): Promise<T> => {
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const result = await work(session);
    await session.commitTransaction();
    return result;
  } catch (error: unknown) {
    await session.abortTransaction();
    if ((error as { code?: number })?.code === 11000) {
      throw new ApiError(httpStatus.CONFLICT, 'A payment with this transaction reference already exists');
    }
    throw error;
  } finally {
    session.endSession();
  }
};

const createPaymentInSession = async (
  pkg: IStudentPackageDoc,
  body: NewPaymentBody,
  actorId: ObjectId,
  session: mongoose.ClientSession
): Promise<IStudentPaymentDoc> => {
  const type = body.type ?? 'payment';
  const paidAt = body.paidAt ? parseCalendarDate(body.paidAt, 'paidAt') : todayInIndia();
  assertPaidAtNotInFuture(paidAt);

  if (type === 'refund') {
    const refundable = pkg.amountPaid - pkg.amountRefunded;
    if (body.amount > refundable) {
      throw new ApiError(httpStatus.BAD_REQUEST, `Refund cannot exceed the net amount paid (${refundable})`);
    }
  }

  const reference = normalizePaymentReference(body.reference);
  if (type === 'payment' && reference.referenceKey) {
    await assertReferenceAvailable(reference.referenceKey, session);
  }

  const [payment] = await StudentPayment.create(
    [
      {
        studentId: pkg.studentId,
        packageId: pkg._id,
        type,
        amount: body.amount,
        method: body.method,
        ...reference,
        paidAt,
        status: 'completed',
        ...(body.notes ? { notes: body.notes } : {}),
        createdBy: actorId,
      },
    ],
    { session }
  );
  if (!payment) {
    throw new ApiError(httpStatus.INTERNAL_SERVER_ERROR, 'Failed to record payment');
  }

  await recordAudit(
    {
      entityType: 'StudentPayment',
      entityId: payment._id,
      studentId: pkg.studentId,
      action: 'create',
      actorId,
      changes: snapshotFields(payment.toObject(), PAYMENT_AUDIT_FIELDS),
    },
    session
  );

  return payment;
};

// ---------- commands ----------

export const createPackage = async (body: NewPackageBody, actorId: ObjectId): Promise<PackageWithPaymentsView> => {
  const studentId = new mongoose.Types.ObjectId(body.studentId);
  const courseId = new mongoose.Types.ObjectId(body.courseId);
  await getStudentOrThrow(studentId);
  await assertCourseExists(courseId);

  const startDate = parseCalendarDate(body.startDate, 'startDate');
  const endDate = body.endDate
    ? parseCalendarDate(body.endDate, 'endDate')
    : calculatePackageEndDate(startDate, body.durationMonths);
  if (endDate < startDate) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'endDate must be on or after startDate');
  }

  let renewalOfId: ObjectId | undefined;
  if (body.renewalOfId) {
    renewalOfId = new mongoose.Types.ObjectId(body.renewalOfId);
    const previous = await StudentPackage.findById(renewalOfId).select('studentId courseId state').lean();
    if (!previous || !previous.studentId.equals(studentId) || !previous.courseId.equals(courseId)) {
      throw new ApiError(httpStatus.BAD_REQUEST, 'renewalOfId must be a package of the same student and course');
    }
  }

  const packageId = await runInTransaction(async (session) => {
    await assertNoOverlap({ studentId, courseId, startDate, endDate }, session);

    const [pkg] = await StudentPackage.create(
      [
        {
          studentId,
          courseId,
          startDate,
          endDate,
          durationMonths: body.durationMonths,
          amount: body.amount,
          ...calculatePaymentTotals(body.amount, []),
          ...(renewalOfId ? { renewalOfId } : {}),
          ...(body.notes ? { notes: body.notes } : {}),
          createdBy: actorId,
          updatedBy: actorId,
        },
      ],
      { session }
    );
    if (!pkg) {
      throw new ApiError(httpStatus.INTERNAL_SERVER_ERROR, 'Failed to create package');
    }

    await recordAudit(
      {
        entityType: 'StudentPackage',
        entityId: pkg._id,
        studentId,
        action: 'create',
        actorId,
        changes: snapshotFields(pkg.toObject(), PACKAGE_AUDIT_FIELDS),
      },
      session
    );

    if (body.initialPayment) {
      await createPaymentInSession(pkg, { ...body.initialPayment, type: 'payment' }, actorId, session);
      await recalculatePackageTotals(pkg, session);
      await pkg.save({ session });
    }

    return pkg._id;
  });

  return getPackageView(packageId);
};

export const updatePackage = async (
  packageId: ObjectId,
  body: UpdatePackageBody,
  actorId: ObjectId
): Promise<PackageWithPaymentsView> => {
  await runInTransaction(async (session) => {
    const pkg = await StudentPackage.findById(packageId).session(session);
    if (!pkg) {
      throw new ApiError(httpStatus.NOT_FOUND, 'Package not found');
    }
    if (pkg.state === 'cancelled') {
      throw new ApiError(httpStatus.BAD_REQUEST, 'Cancelled packages cannot be edited');
    }

    const before = pkg.toObject();
    const startDate = body.startDate ? parseCalendarDate(body.startDate, 'startDate') : pkg.startDate;
    const durationMonths = body.durationMonths ?? pkg.durationMonths;
    let { endDate } = pkg;
    if (body.endDate) {
      endDate = parseCalendarDate(body.endDate, 'endDate');
    } else if (body.startDate || body.durationMonths !== undefined) {
      endDate = calculatePackageEndDate(startDate, durationMonths);
    }
    if (endDate < startDate) {
      throw new ApiError(httpStatus.BAD_REQUEST, 'endDate must be on or after startDate');
    }

    await assertNoOverlap(
      { studentId: pkg.studentId, courseId: pkg.courseId, startDate, endDate, excludeId: pkg._id },
      session
    );

    pkg.set({
      startDate,
      endDate,
      durationMonths,
      ...(body.amount !== undefined ? { amount: body.amount } : {}),
      ...(body.notes !== undefined ? { notes: body.notes } : {}),
    });

    const changes = diffFields(before, pkg.toObject(), PACKAGE_AUDIT_FIELDS);
    if (changes.length === 0) {
      return;
    }

    pkg.updatedBy = actorId;
    await recalculatePackageTotals(pkg, session);
    await pkg.save({ session });
    await recordAudit(
      { entityType: 'StudentPackage', entityId: pkg._id, studentId: pkg.studentId, action: 'update', actorId, changes },
      session
    );
  });

  return getPackageView(packageId);
};

export const cancelPackage = async (
  packageId: ObjectId,
  reason: string,
  actorId: ObjectId
): Promise<PackageWithPaymentsView> => {
  await runInTransaction(async (session) => {
    const pkg = await StudentPackage.findById(packageId).session(session);
    if (!pkg) {
      throw new ApiError(httpStatus.NOT_FOUND, 'Package not found');
    }
    if (pkg.state === 'cancelled') {
      throw new ApiError(httpStatus.BAD_REQUEST, 'Package is already cancelled');
    }
    if (pkg.amountPaid - pkg.amountRefunded !== 0) {
      throw new ApiError(httpStatus.BAD_REQUEST, 'Void or refund the payments on this package before cancelling it');
    }

    pkg.set({ state: 'cancelled', cancelReason: reason, cancelledAt: new Date(), cancelledBy: actorId, updatedBy: actorId });
    await pkg.save({ session });
    await recordAudit(
      {
        entityType: 'StudentPackage',
        entityId: pkg._id,
        studentId: pkg.studentId,
        action: 'cancel',
        actorId,
        changes: [{ field: 'state', from: 'valid', to: 'cancelled' }],
        reason,
      },
      session
    );
  });

  return getPackageView(packageId);
};

export const addPayment = async (
  packageId: ObjectId,
  body: NewPaymentBody,
  actorId: ObjectId
): Promise<PackageWithPaymentsView> => {
  await runInTransaction(async (session) => {
    const pkg = await StudentPackage.findById(packageId).session(session);
    if (!pkg) {
      throw new ApiError(httpStatus.NOT_FOUND, 'Package not found');
    }
    if (pkg.state === 'cancelled') {
      throw new ApiError(httpStatus.BAD_REQUEST, 'Cannot record payments on a cancelled package');
    }

    await createPaymentInSession(pkg, body, actorId, session);
    await recalculatePackageTotals(pkg, session);
    pkg.updatedBy = actorId;
    await pkg.save({ session });
  });

  return getPackageView(packageId);
};

export const voidPayment = async (
  paymentId: ObjectId,
  reason: string,
  actorId: ObjectId
): Promise<PackageWithPaymentsView> => {
  const packageId = await runInTransaction(async (session) => {
    const payment = await StudentPayment.findById(paymentId).session(session);
    if (!payment) {
      throw new ApiError(httpStatus.NOT_FOUND, 'Payment not found');
    }
    if (payment.status === 'voided') {
      throw new ApiError(httpStatus.BAD_REQUEST, 'Payment is already voided');
    }

    const pkg = await StudentPackage.findById(payment.packageId).session(session);
    if (!pkg) {
      throw new ApiError(httpStatus.NOT_FOUND, 'Package not found');
    }
    if (payment.type === 'payment' && pkg.amountPaid - payment.amount < pkg.amountRefunded) {
      throw new ApiError(httpStatus.BAD_REQUEST, 'Void the refunds on this package before voiding this payment');
    }

    payment.set({ status: 'voided', voidReason: reason, voidedAt: new Date(), voidedBy: actorId });
    await payment.save({ session });

    await recalculatePackageTotals(pkg, session);
    pkg.updatedBy = actorId;
    await pkg.save({ session });

    await recordAudit(
      {
        entityType: 'StudentPayment',
        entityId: payment._id,
        studentId: payment.studentId,
        action: 'void',
        actorId,
        changes: [{ field: 'status', from: 'completed', to: 'voided' }],
        reason,
      },
      session
    );

    return pkg._id;
  });

  return getPackageView(packageId);
};

// ---------- queries ----------

export const getStudentFees = async (studentId: ObjectId): Promise<StudentFeesView> => {
  const student = await getStudentOrThrow(studentId);
  const packages = await StudentPackage.find({ studentId })
    .sort({ startDate: -1, _id: -1 })
    .populate('courseId', 'name instrument')
    .lean<RawPackage[]>();
  const payments = await loadPayments(packages.map((pkg) => pkg._id));

  const paymentsByPackage = new Map<string, PaymentView[]>();
  payments.forEach((payment) => {
    const key = payment.packageId.toString();
    const bucket = paymentsByPackage.get(key) ?? [];
    bucket.push(toPaymentView(payment));
    paymentsByPackage.set(key, bucket);
  });

  const today = todayInIndia();
  return {
    student: toStudentSummary(student),
    packages: packages.map((pkg) => ({
      ...toPackageView(pkg, today),
      payments: paymentsByPackage.get(pkg._id.toString()) ?? [],
    })),
  };
};

const SORT_PATHS: Record<PackageListSortField, string> = {
  endDate: 'endDate',
  startDate: 'startDate',
  balance: 'balance',
  amount: 'amount',
  studentName: 'student.name',
};

const parseListSort = (sortBy?: string): Record<string, 1 | -1> => {
  const [field, direction] = (sortBy ?? 'endDate:asc').split(':') as [PackageListSortField, string | undefined];
  const path = SORT_PATHS[field] ?? SORT_PATHS.endDate;
  return { [path]: direction === 'desc' ? -1 : 1, _id: 1 };
};

const buildStudentMatch = (filter: PackageListFilter): Record<string, unknown>[] => {
  const clauses: Record<string, unknown>[] = [];
  const search = filter.search?.trim();
  if (search) {
    clauses.push({
      $or: [
        { 'student.name': { $regex: escapeRegex(search), $options: 'i' } },
        { 'student.email': { $regex: escapeRegex(search), $options: 'i' } },
        { 'student.rollNumber': buildRollNumberSearchFilter(search) },
      ],
    });
  }
  if (filter.branchIn) {
    clauses.push({
      $or: buildBranchAccessRollNumberOr(filter.branchIn).map(({ rollNumber }) => ({ 'student.rollNumber': rollNumber })),
    });
  }
  return clauses;
};

/**
 * Latest valid package per student + course (the one that decides renewal status),
 * filtered by renewal/payment status and the actor's branch scope.
 */
export const queryLatestPackages = async (filter: PackageListFilter, options: IOptions): Promise<PackageListResult> => {
  const limit = options.limit && Number(options.limit) > 0 ? Math.min(Number(options.limit), 100) : 10;
  const page = options.page && Number(options.page) > 0 ? Number(options.page) : 1;

  if (filter.branchIn && filter.branchIn.length === 0) {
    return { results: [], page, limit, totalPages: 0, totalResults: 0 };
  }

  const today = todayInIndia();
  const packageMatch: Record<string, unknown> = { state: 'valid' };
  if (filter.courseId) {
    packageMatch['courseId'] = new mongoose.Types.ObjectId(filter.courseId);
  }

  const latestMatch: Record<string, unknown> = {
    ...(filter.renewalStatus ? buildRenewalDateFilter(filter.renewalStatus, today, filter.withinDays) : {}),
    ...(filter.paymentStatus ? { paymentStatus: filter.paymentStatus } : {}),
  };

  const studentMatch = buildStudentMatch(filter);

  const [aggregate] = await StudentPackage.aggregate<{
    results: RawListedPackage[];
    total: Array<{ count: number }>;
  }>([
    { $match: packageMatch },
    { $sort: { endDate: -1, startDate: -1 } },
    { $group: { _id: { studentId: '$studentId', courseId: '$courseId' }, doc: { $first: '$$ROOT' } } },
    { $replaceRoot: { newRoot: '$doc' } },
    { $match: latestMatch },
    { $lookup: { from: User.collection.name, localField: 'studentId', foreignField: '_id', as: 'student' } },
    {
      $addFields: {
        student: {
          $arrayElemAt: [
            {
              $map: {
                input: { $filter: { input: '$student', as: 's', cond: { $eq: ['$$s.role', 'student'] } } },
                as: 's',
                in: {
                  _id: '$$s._id',
                  name: '$$s.name',
                  email: '$$s.email',
                  rollNumber: '$$s.rollNumber',
                  phoneNumber: '$$s.phoneNumber',
                  isActive: '$$s.isActive',
                },
              },
            },
            0,
          ],
        },
      },
    },
    { $match: { student: { $ne: null }, ...(studentMatch.length > 0 ? { $and: studentMatch } : {}) } },
    { $lookup: { from: Course.collection.name, localField: 'courseId', foreignField: '_id', as: 'courseId' } },
    { $addFields: { courseId: { $arrayElemAt: ['$courseId', 0] } } },
    { $sort: parseListSort(options.sortBy) },
    {
      $facet: {
        results: [{ $skip: (page - 1) * limit }, { $limit: limit }],
        total: [{ $count: 'count' }],
      },
    },
  ]);

  const totalResults = aggregate?.total[0]?.count ?? 0;
  const results: PackageListItemView[] = (aggregate?.results ?? []).map((raw) => ({
    ...toPackageView(raw, today),
    student: toStudentSummary(raw.student),
  }));

  return { results, page, limit, totalPages: Math.ceil(totalResults / limit), totalResults };
};

/** Active students with no valid package in any course — the manual data-entry to-do list. */
export const queryStudentsWithoutPackage = async (
  filter: Record<string, unknown>,
  options: IOptions
): Promise<QueryResult> => {
  const studentIdsWithPackages = await StudentPackage.distinct('studentId', { state: 'valid' });
  return queryUsers(
    { ...filter, role: 'student', isActive: true, _id: { $nin: studentIdsWithPackages } },
    { ...options, sortBy: options.sortBy ?? 'name:asc' }
  );
};
