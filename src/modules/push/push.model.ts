import mongoose from 'mongoose';
import toJSON from '../toJSON/toJSON';
import { IDeviceTokenDoc, IDeviceTokenModel } from './push.interfaces';

const deviceTokenSchema = new mongoose.Schema<IDeviceTokenDoc, IDeviceTokenModel>(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    token: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    platform: {
      type: String,
      enum: ['ios', 'android'],
      required: true,
    },
    lastSeenAt: {
      type: Date,
      required: true,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

deviceTokenSchema.index({ userId: 1, token: 1 });
deviceTokenSchema.plugin(toJSON);

const DeviceToken = mongoose.model<IDeviceTokenDoc, IDeviceTokenModel>('DeviceToken', deviceTokenSchema);

export default DeviceToken;
