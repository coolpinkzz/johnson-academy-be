import mongoose, { Document, Model } from 'mongoose';

export type DevicePlatform = 'ios' | 'android';

export interface IDeviceToken {
  userId: mongoose.Types.ObjectId;
  token: string;
  platform: DevicePlatform;
  lastSeenAt: Date;
}

export interface IDeviceTokenDoc extends IDeviceToken, Document {}

export interface IDeviceTokenModel extends Model<IDeviceTokenDoc> {}

export interface RegisterDeviceTokenBody {
  token: string;
  platform: DevicePlatform;
}

export interface PushPayload {
  title: string;
  body: string;
  data: Record<string, string>;
}

export interface NotifyModuleStartedParams {
  studentId: mongoose.Types.ObjectId | string;
  progressId: string;
  moduleId: mongoose.Types.ObjectId | string;
  syllabusId: mongoose.Types.ObjectId | string;
  courseId: mongoose.Types.ObjectId | string;
  classId: mongoose.Types.ObjectId | string;
  actorId: string;
}
