import { Model, Document } from 'mongoose';

export type AppPlatform = 'ios' | 'android';
export type UpdateType = 'none' | 'soft' | 'hard' | 'maintenance';

export interface IAppVersion {
  platform: AppPlatform;
  latestVersion: string;
  minSupportedVersion: string;
  storeUrl: string;
  softUpdateTitle: string;
  softUpdateMessage: string;
  hardUpdateTitle: string;
  hardUpdateMessage: string;
  isActive: boolean;
  maintenanceMode: boolean;
  maintenanceMessage?: string;
}

export interface IAppVersionDoc extends IAppVersion, Document {}

export interface IAppVersionModel extends Model<IAppVersionDoc> {}

export type NewCreatedAppVersion = IAppVersion;
export type UpdateAppVersionBody = Partial<IAppVersion>;

export interface IVersionCheckResult {
  updateType: UpdateType;
  latestVersion: string;
  minSupportedVersion: string;
  storeUrl: string;
  title: string;
  message: string;
}
