import httpStatus from 'http-status';
import semver from 'semver';
import mongoose from 'mongoose';
import AppVersion from './appVersion.model';
import ApiError from '../errors/ApiError';
import {
  AppPlatform,
  IAppVersionDoc,
  IVersionCheckResult,
  NewCreatedAppVersion,
  UpdateAppVersionBody,
  UpdateType,
} from './appVersion.interfaces';

const validateVersionPolicy = (latestVersion: string, minSupportedVersion: string): void => {
  if (!semver.valid(latestVersion) || !semver.valid(minSupportedVersion)) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Versions must be valid semver (e.g. 1.2.0)');
  }
  if (semver.lt(latestVersion, minSupportedVersion)) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'latestVersion must be greater than or equal to minSupportedVersion');
  }
};

const resolveUpdateType = (currentVersion: string, config: IAppVersionDoc): UpdateType => {
  if (config.maintenanceMode) {
    return 'maintenance';
  }
  if (!config.isActive) {
    return 'none';
  }
  if (semver.lt(currentVersion, config.minSupportedVersion)) {
    return 'hard';
  }
  if (semver.lt(currentVersion, config.latestVersion)) {
    return 'soft';
  }
  return 'none';
};

const buildCheckResponse = (config: IAppVersionDoc, updateType: UpdateType): IVersionCheckResult => {
  const base = {
    updateType,
    latestVersion: config.latestVersion,
    minSupportedVersion: config.minSupportedVersion,
    storeUrl: config.storeUrl,
  };

  if (updateType === 'maintenance') {
    return {
      ...base,
      title: 'Maintenance',
      message: config.maintenanceMessage || 'The app is temporarily unavailable. Please try again later.',
    };
  }

  if (updateType === 'hard') {
    return {
      ...base,
      title: config.hardUpdateTitle,
      message: config.hardUpdateMessage,
    };
  }

  if (updateType === 'soft') {
    return {
      ...base,
      title: config.softUpdateTitle,
      message: config.softUpdateMessage,
    };
  }

  return {
    ...base,
    title: '',
    message: '',
  };
};

/**
 * Check if the client app version requires an update
 */
export const checkVersion = async (platform: AppPlatform, version: string): Promise<IVersionCheckResult> => {
  const config = await AppVersion.findOne({ platform });

  if (!config) {
    return {
      updateType: 'none',
      latestVersion: version,
      minSupportedVersion: version,
      storeUrl: '',
      title: '',
      message: '',
    };
  }

  const updateType = resolveUpdateType(version, config);
  return buildCheckResponse(config, updateType);
};

/**
 * Create app version config
 */
export const createAppVersion = async (body: NewCreatedAppVersion): Promise<IAppVersionDoc> => {
  validateVersionPolicy(body.latestVersion, body.minSupportedVersion);

  const existing = await AppVersion.findOne({ platform: body.platform });
  if (existing) {
    throw new ApiError(httpStatus.CONFLICT, `App version config for platform "${body.platform}" already exists`);
  }

  return AppVersion.create(body);
};

/**
 * Get all app version configs
 */
export const getAppVersions = async (): Promise<IAppVersionDoc[]> => {
  return AppVersion.find().sort({ platform: 1 });
};

/**
 * Get app version config by id
 */
export const getAppVersionById = async (id: mongoose.Types.ObjectId): Promise<IAppVersionDoc | null> => {
  return AppVersion.findById(id);
};

/**
 * Update app version config by id
 */
export const updateAppVersionById = async (
  id: mongoose.Types.ObjectId,
  updateBody: UpdateAppVersionBody
): Promise<IAppVersionDoc | null> => {
  const config = await AppVersion.findById(id);
  if (!config) {
    throw new ApiError(httpStatus.NOT_FOUND, 'App version config not found');
  }

  if (updateBody.platform && updateBody.platform !== config.platform) {
    const existing = await AppVersion.findOne({ platform: updateBody.platform });
    if (existing) {
      throw new ApiError(httpStatus.CONFLICT, `App version config for platform "${updateBody.platform}" already exists`);
    }
  }

  const latestVersion = updateBody.latestVersion ?? config.latestVersion;
  const minSupportedVersion = updateBody.minSupportedVersion ?? config.minSupportedVersion;
  validateVersionPolicy(latestVersion, minSupportedVersion);

  Object.assign(config, updateBody);
  await config.save();
  return config;
};

/**
 * Delete app version config by id
 */
export const deleteAppVersionById = async (id: mongoose.Types.ObjectId): Promise<IAppVersionDoc | null> => {
  const config = await AppVersion.findById(id);
  if (!config) {
    throw new ApiError(httpStatus.NOT_FOUND, 'App version config not found');
  }
  await config.deleteOne();
  return config;
};
