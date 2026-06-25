import mongoose from 'mongoose';
import toJSON from '../toJSON/toJSON';
import { IAppVersionDoc, IAppVersionModel } from './appVersion.interfaces';

const appVersionSchema = new mongoose.Schema<IAppVersionDoc, IAppVersionModel>(
  {
    platform: {
      type: String,
      enum: ['ios', 'android'],
      required: true,
      unique: true,
    },
    latestVersion: {
      type: String,
      required: true,
      trim: true,
    },
    minSupportedVersion: {
      type: String,
      required: true,
      trim: true,
    },
    storeUrl: {
      type: String,
      required: true,
      trim: true,
    },
    softUpdateTitle: {
      type: String,
      required: true,
      trim: true,
      default: 'Update Available',
    },
    softUpdateMessage: {
      type: String,
      required: true,
      trim: true,
      default: 'A new version is available with improvements.',
    },
    hardUpdateTitle: {
      type: String,
      required: true,
      trim: true,
      default: 'Update Required',
    },
    hardUpdateMessage: {
      type: String,
      required: true,
      trim: true,
      default: 'This version is no longer supported. Please update to continue.',
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    maintenanceMode: {
      type: Boolean,
      default: false,
    },
    maintenanceMessage: {
      type: String,
      trim: true,
    },
  },
  {
    timestamps: true,
  }
);

appVersionSchema.plugin(toJSON);

const AppVersion = mongoose.model<IAppVersionDoc, IAppVersionModel>('AppVersion', appVersionSchema);

export default AppVersion;
