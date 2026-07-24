import httpStatus from 'http-status';
import mongoose from 'mongoose';
import ApiError from '../errors/ApiError';
import Classes from '../classes/classes.model';
import User from '../user/user.model';
import { getEnrolledStudentCount } from '../classes/classes.util';
import { IOptions, QueryResult } from '../paginate/paginate';
import CompensationBooking from './compensationBooking.model';
import {
  ACTIVE_COMPENSATION_STATUSES,
  ClassSeatAvailability,
  ICompensationBookingDoc,
  NewCompensationBooking,
} from './compensationBooking.interfaces';
import {
  classRunsOnDate,
  formatBookingDate,
  isBookingDateInPast,
  parseBookingDate,
} from './compensationBooking.util';

const populateBooking = [
  { path: 'studentId', select: 'name email rollNumber studentId role phoneNumber' },
  { path: 'homeClassId', select: 'name branch defaultWeekdays defaultStartTime defaultEndTime sessionCapacity' },
  { path: 'targetClassId', select: 'name branch defaultWeekdays defaultStartTime defaultEndTime sessionCapacity' },
  { path: 'bookedBy', select: 'name email role' },
  { path: 'cancelledBy', select: 'name email role' },
];

const isStudentInClass = (
  classDoc: { students?: unknown[]; studentsInClass?: Array<{ user: unknown }> },
  studentId: mongoose.Types.ObjectId
): boolean => {
  const sid = studentId.toString();
  if ((classDoc.studentsInClass ?? []).some((entry) => {
    const u = entry.user as mongoose.Types.ObjectId | { _id?: mongoose.Types.ObjectId };
    const id = u && typeof u === 'object' && '_id' in u && u._id != null ? u._id : u;
    return id?.toString() === sid;
  })) {
    return true;
  }
  return (classDoc.students ?? []).some((s) => {
    const u = s as mongoose.Types.ObjectId | { _id?: mongoose.Types.ObjectId };
    const id = u && typeof u === 'object' && '_id' in u && u._id != null ? u._id : u;
    return id?.toString() === sid;
  });
};

export const countConfirmedGuests = async (
  targetClassId: mongoose.Types.ObjectId,
  date: Date,
  session?: mongoose.ClientSession
): Promise<number> => {
  const query = CompensationBooking.countDocuments({
    targetClassId,
    date,
    status: { $in: ACTIVE_COMPENSATION_STATUSES },
  });
  if (session) query.session(session);
  return query;
};

export const getClassSeatAvailability = async (
  targetClassId: mongoose.Types.ObjectId,
  date: Date,
  session?: mongoose.ClientSession
): Promise<ClassSeatAvailability> => {
  const classQuery = Classes.findById(targetClassId);
  if (session) classQuery.session(session);
  const classDoc = await classQuery;
  if (!classDoc) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Target class not found');
  }
  if (classDoc.sessionCapacity == null) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Target class does not have sessionCapacity configured');
  }

  const enrolledCount = getEnrolledStudentCount(classDoc);
  const confirmedGuestCount = await countConfirmedGuests(targetClassId, date, session);
  const usedSeats = enrolledCount + confirmedGuestCount;
  const availableSeats = Math.max(0, classDoc.sessionCapacity - usedSeats);

  return {
    classId: classDoc._id,
    sessionCapacity: classDoc.sessionCapacity,
    enrolledCount,
    confirmedGuestCount,
    usedSeats,
    availableSeats,
    isAvailable: availableSeats > 0,
  };
};

export const getAvailabilityForClass = async (
  classId: mongoose.Types.ObjectId,
  dateInput: string
): Promise<ClassSeatAvailability & { date: string; runsOnDate: boolean }> => {
  let date: Date;
  try {
    date = parseBookingDate(dateInput);
  } catch {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Date must be YYYY-MM-DD');
  }

  const classDoc = await Classes.findById(classId);
  if (!classDoc) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Class not found');
  }

  const availability = await getClassSeatAvailability(classId, date);
  return {
    ...availability,
    date: formatBookingDate(date),
    runsOnDate: classRunsOnDate(classDoc.defaultWeekdays, date),
  };
};

/**
 * List classes with free compensation seats for a date.
 */
export const listAvailableClasses = async (params: {
  date: string;
  branch?: string;
  excludeClassIds?: mongoose.Types.ObjectId[];
}): Promise<
  Array<{
    class: Record<string, unknown>;
    availability: ClassSeatAvailability;
    date: string;
  }>
> => {
  let date: Date;
  try {
    date = parseBookingDate(params.date);
  } catch {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Date must be YYYY-MM-DD');
  }

  if (isBookingDateInPast(date)) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Cannot list availability for a past date');
  }

  const filter: Record<string, unknown> = {
    sessionCapacity: { $exists: true, $ne: null, $gte: 1 },
  };
  if (params.branch) {
    filter['branch'] = params.branch;
  }
  if (params.excludeClassIds && params.excludeClassIds.length > 0) {
    filter['_id'] = { $nin: params.excludeClassIds };
  }

  const classes = await Classes.find(filter)
    .populate('teachers', 'name email')
    .select(
      'name branch academicYear sessionCapacity defaultWeekdays defaultStartTime defaultEndTime teachers students studentsInClass'
    )
    .lean();

  const results: Array<{
    class: Record<string, unknown>;
    availability: ClassSeatAvailability;
    date: string;
  }> = [];

  for (const classDoc of classes) {
    if (!classRunsOnDate(classDoc.defaultWeekdays as any, date)) {
      continue;
    }

    const enrolledCount = getEnrolledStudentCount(classDoc as any);
    const confirmedGuestCount = await countConfirmedGuests(classDoc._id, date);
    const sessionCapacity = classDoc.sessionCapacity as number;
    const usedSeats = enrolledCount + confirmedGuestCount;
    const availableSeats = Math.max(0, sessionCapacity - usedSeats);
    if (availableSeats <= 0) continue;

    const { students: _s, studentsInClass: _sic, ...safeClass } = classDoc as any;
    results.push({
      class: safeClass,
      availability: {
        classId: classDoc._id,
        sessionCapacity,
        enrolledCount,
        confirmedGuestCount,
        usedSeats,
        availableSeats,
        isAvailable: true,
      },
      date: formatBookingDate(date),
    });
  }

  results.sort((a, b) => b.availability.availableSeats - a.availability.availableSeats);
  return results;
};

export const createCompensationBooking = async (
  body: NewCompensationBooking
): Promise<ICompensationBookingDoc> => {
  let date: Date;
  try {
    date = parseBookingDate(body.date);
  } catch {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Date must be YYYY-MM-DD');
  }

  if (isBookingDateInPast(date)) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Cannot book compensation for a past date');
  }

  if (body.homeClassId.toString() === body.targetClassId.toString()) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Target class must be different from home class');
  }

  const student = await User.findById(body.studentId);
  if (!student) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Student not found');
  }
  if (student.role !== 'student') {
    throw new ApiError(httpStatus.BAD_REQUEST, 'User must be a student');
  }

  const homeClass = await Classes.findById(body.homeClassId);
  if (!homeClass) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Home class not found');
  }
  if (!isStudentInClass(homeClass, body.studentId)) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Student is not enrolled in the home class');
  }

  const targetClass = await Classes.findById(body.targetClassId);
  if (!targetClass) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Target class not found');
  }
  if (targetClass.sessionCapacity == null) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Target class does not have sessionCapacity configured');
  }
  if (isStudentInClass(targetClass, body.studentId)) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Student is already enrolled in the target class');
  }
  if (!classRunsOnDate(targetClass.defaultWeekdays, date)) {
    throw new ApiError(
      httpStatus.BAD_REQUEST,
      `Target class does not run on ${formatBookingDate(date)}`
    );
  }

  const existing = await CompensationBooking.findOne({
    studentId: body.studentId,
    targetClassId: body.targetClassId,
    date,
    status: 'confirmed',
  });
  if (existing) {
    throw new ApiError(httpStatus.CONFLICT, 'Student already has a confirmed booking for this class and date');
  }

  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    // Serialize concurrent bookings for this class (write conflict on Classes)
    const lockedClass = await Classes.findByIdAndUpdate(
      body.targetClassId,
      { $currentDate: { updatedAt: true } },
      { new: true, session }
    );
    if (!lockedClass) {
      throw new ApiError(httpStatus.NOT_FOUND, 'Target class not found');
    }
    if (lockedClass.sessionCapacity == null) {
      throw new ApiError(httpStatus.BAD_REQUEST, 'Target class does not have sessionCapacity configured');
    }

    const enrolledCount = getEnrolledStudentCount(lockedClass);
    const confirmedGuestCount = await countConfirmedGuests(body.targetClassId, date, session);
    const availableSeats = lockedClass.sessionCapacity - enrolledCount - confirmedGuestCount;
    if (availableSeats <= 0) {
      throw new ApiError(httpStatus.CONFLICT, 'No available seats for compensation in the target class');
    }

    const [booking] = await CompensationBooking.create(
      [
        {
          studentId: body.studentId,
          homeClassId: body.homeClassId,
          targetClassId: body.targetClassId,
          date,
          status: 'confirmed',
          ...(body.bookedBy ? { bookedBy: body.bookedBy } : {}),
          ...(body.notes ? { notes: body.notes } : {}),
        },
      ],
      { session }
    );

    await session.commitTransaction();

    return (await CompensationBooking.findById(booking!._id).populate(populateBooking)) as ICompensationBookingDoc;
  } catch (error: any) {
    await session.abortTransaction();
    if (error?.code === 11000) {
      throw new ApiError(httpStatus.CONFLICT, 'Student already has a confirmed booking for this class and date');
    }
    // Transient transaction error — ask client to retry
    if (error?.errorLabels?.includes('TransientTransactionError') || error?.code === 112) {
      throw new ApiError(httpStatus.CONFLICT, 'Seat reservation conflict, please try again');
    }
    throw error;
  } finally {
    session.endSession();
  }
};

export const cancelCompensationBooking = async (
  bookingId: mongoose.Types.ObjectId,
  cancelledBy: mongoose.Types.ObjectId
): Promise<ICompensationBookingDoc> => {
  const booking = await CompensationBooking.findById(bookingId);
  if (!booking) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Compensation booking not found');
  }
  if (booking.status === 'cancelled') {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Booking is already cancelled');
  }
  if (isBookingDateInPast(booking.date)) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Cannot cancel a booking for a past date');
  }

  booking.status = 'cancelled';
  booking.cancelledAt = new Date();
  booking.cancelledBy = cancelledBy;
  await booking.save();

  return (await booking.populate(populateBooking)) as ICompensationBookingDoc;
};

export const getCompensationBookingById = async (
  id: mongoose.Types.ObjectId
): Promise<ICompensationBookingDoc | null> =>
  CompensationBooking.findById(id).populate(populateBooking);

export const queryCompensationBookings = async (
  filter: Record<string, any>,
  options: IOptions
): Promise<QueryResult> => {
  const mongoFilter: Record<string, any> = { ...filter };

  if (mongoFilter['date']) {
    try {
      mongoFilter['date'] = parseBookingDate(mongoFilter['date']);
    } catch {
      throw new ApiError(httpStatus.BAD_REQUEST, 'Date must be YYYY-MM-DD');
    }
  }

  if (!options.sortBy) {
    options.sortBy = 'date:asc';
  }

  const result = await CompensationBooking.paginate(mongoFilter, options);
  await CompensationBooking.populate(result.results, populateBooking);
  return result;
};
