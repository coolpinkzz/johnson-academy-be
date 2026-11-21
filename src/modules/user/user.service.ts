import httpStatus from 'http-status';
import mongoose from 'mongoose';
import User from './user.model';
import ApiError from '../errors/ApiError';
import { IOptions, QueryResult } from '../paginate/paginate';
import { NewCreatedUser, UpdateUserBody, IUserDoc, NewRegisteredUser } from './user.interfaces';
import FeePackage from '../studentFee/studentFee.model';
import { getStudentFeeProfileStatus } from '../studentFee/studentFee.service';
import { syncSheetsAfterWrite } from '../studentFee/googleSheets.service';

/**
 * Create a user
 * @param {NewCreatedUser} userBody
 * @returns {Promise<IUserDoc>}
 */
export const createUser = async (userBody: NewCreatedUser): Promise<IUserDoc> => {
  if (await User.isEmailTaken(userBody.email)) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Email already taken');
  }
  const user = await User.create(userBody);
  await syncSheetsAfterWrite();
  return user;
};

/**
 * Register a user
 * @param {NewRegisteredUser} userBody
 * @returns {Promise<IUserDoc>}
 */
export const registerUser = async (userBody: NewRegisteredUser): Promise<IUserDoc> => {
  if (await User.isEmailTaken(userBody.email)) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Email already taken');
  }
  const user = await User.create(userBody);
  await syncSheetsAfterWrite();
  return user;
};

/**
 * Query for users
 * @param {Object} filter - Mongo filter
 * @param {Object} options - Query options
 * @returns {Promise<QueryResult>}
 */
export const queryUsers = async (filter: Record<string, any>, options: IOptions): Promise<QueryResult> => {
  const { feeProfileStatus, ...userFilter } = filter;
  const query: Record<string, any> = { ...userFilter, deletedAt: null };
  const isStudentQuery = Boolean(query['role'] && ['student', 'user'].includes(query['role']));
  if (!isStudentQuery) return User.paginate(query, options);
  if (typeof query['name'] === 'string') {
    query['name'] = { $regex: query['name'].replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), $options: 'i' };
  }
  if (typeof query['rollNumber'] === 'string') {
    query['rollNumber'] = {
      $regex: query['rollNumber'].replace(/[.*+?^${}()|[\]\\]/g, '\\$&'),
      $options: 'i',
    };
  }

  const allUsers = await User.find(query);
  const studentIds = allUsers.map((user) => user._id);
  const packages = await FeePackage.find({
    studentId: { $in: studentIds },
  }).sort({ startDate: -1, createdAt: -1 });
  const packagesByStudent = new Map<string, typeof packages>();
  packages.forEach((feePackage) => {
    const key = feePackage.studentId.toString();
    const items = packagesByStudent.get(key) || [];
    items.push(feePackage);
    packagesByStudent.set(key, items);
  });
  const userStatuses = allUsers.map((user) => ({
    user,
    status: getStudentFeeProfileStatus(packagesByStudent.get(user.id) || []),
  }));
  const matchingUsers = feeProfileStatus ? userStatuses.filter((item) => item.status === feeProfileStatus) : userStatuses;
  const sortBy = options.sortBy?.split(',')[0];
  if (sortBy) {
    const [field, direction] = sortBy.split(':');
    matchingUsers.sort((a, b) => {
      const first = String((a.user as any).get(field) || '');
      const second = String((b.user as any).get(field) || '');
      return first.localeCompare(second) * (direction === 'desc' ? -1 : 1);
    });
  } else {
    matchingUsers.sort((a, b) => (a.user.createdAt?.getTime() || 0) - (b.user.createdAt?.getTime() || 0));
  }
  const limit = Math.max(Number(options.limit) || 10, 1);
  const page = Math.max(Number(options.page) || 1, 1);
  const offset = (page - 1) * limit;
  return {
    results: matchingUsers.slice(offset, offset + limit).map(({ user, status }) => ({
      ...user.toJSON(),
      feeProfileStatus: status,
    })) as unknown as QueryResult['results'],
    page,
    limit,
    totalPages: Math.ceil(matchingUsers.length / limit),
    totalResults: matchingUsers.length,
  };
};

/**
 * Get user by id
 * @param {mongoose.Types.ObjectId} id
 * @returns {Promise<IUserDoc | null>}
 */
export const getUserById = async (id: mongoose.Types.ObjectId): Promise<IUserDoc | null> =>
  User.findOne({ _id: id, deletedAt: null });

/**
 * Get user by email
 * @param {string} email
 * @returns {Promise<IUserDoc | null>}
 */
export const getUserByEmail = async (email: string): Promise<IUserDoc | null> => User.findOne({ email, deletedAt: null });

/**
 * Update user by id
 * @param {mongoose.Types.ObjectId} userId
 * @param {UpdateUserBody} updateBody
 * @returns {Promise<IUserDoc | null>}
 */
export const updateUserById = async (
  userId: mongoose.Types.ObjectId,
  updateBody: UpdateUserBody
): Promise<IUserDoc | null> => {
  const user = await getUserById(userId);
  if (!user) {
    throw new ApiError(httpStatus.NOT_FOUND, 'User not found');
  }
  if (updateBody.email && (await User.isEmailTaken(updateBody.email, userId))) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Email already taken');
  }
  Object.assign(user, updateBody);
  await user.save();
  await syncSheetsAfterWrite();
  return user;
};

/**
 * Delete user by id
 * @param {mongoose.Types.ObjectId} userId
 * @returns {Promise<IUserDoc | null>}
 */
export const deleteUserById = async (userId: mongoose.Types.ObjectId, actor: IUserDoc): Promise<IUserDoc | null> => {
  const user = await getUserById(userId);
  if (!user) {
    throw new ApiError(httpStatus.NOT_FOUND, 'User not found');
  }
  const deletedAt = new Date();
  const wasActive = user.isActive !== false;
  user.deletedAt = deletedAt;
  user.deletedBy = new mongoose.Types.ObjectId(actor.id);
  user.isActive = false;
  user.deletionHistory = [
    ...(user.deletionHistory || []),
    {
      deletedAt,
      deletedBy: new mongoose.Types.ObjectId(actor.id),
      deletedByName: actor.name,
      restoredAt: null,
      restoredBy: null,
      restoredByName: null,
      wasActive,
    },
  ];
  await user.save();
  await syncSheetsAfterWrite();
  return user;
};

export const getDeletionHistory = async (role?: string) => {
  const roleFilter: Record<string, any> = {};
  if (role === 'student') roleFilter['role'] = { $in: ['student', 'user'] };
  else if (role) roleFilter['role'] = role;
  const users = await User.find({ 'deletionHistory.0': { $exists: true }, ...roleFilter })
    .select('name email role rollNumber deletedAt deletionHistory')
    .lean();
  const entries = users.reduce<Record<string, any>[]>((history, user) => {
    (user.deletionHistory || []).forEach((event: any, index: number) => {
      history.push({
        id: `${user._id.toString()}-${index}`,
        userId: user._id.toString(),
        name: user.name,
        email: user.email,
        role: user.role,
        rollNumber: user.rollNumber || null,
        deletedAt: event.deletedAt,
        deletedByName: event.deletedByName,
        restoredAt: event.restoredAt,
        restoredByName: event.restoredByName,
        canRestore: !event.restoredAt && user.deletedAt != null,
      });
    });
    return history;
  }, []);
  return entries.sort((a, b) => new Date(b['deletedAt']).getTime() - new Date(a['deletedAt']).getTime());
};

export const restoreUserById = async (userId: mongoose.Types.ObjectId, actor: IUserDoc): Promise<IUserDoc> => {
  const user = await User.findOne({ _id: userId, deletedAt: { $ne: null } });
  if (!user) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Deleted user not found');
  }
  const event = [...(user.deletionHistory || [])].reverse().find((entry) => !entry.restoredAt);
  if (!event) {
    throw new ApiError(httpStatus.CONFLICT, 'No active deletion record found');
  }
  event.restoredAt = new Date();
  event.restoredBy = new mongoose.Types.ObjectId(actor.id);
  event.restoredByName = actor.name;
  user.deletedAt = null;
  user.deletedBy = null;
  user.isActive = event.wasActive ?? true;
  await user.save();
  await syncSheetsAfterWrite();
  return user;
};
