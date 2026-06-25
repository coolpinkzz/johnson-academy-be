import Joi from 'joi';
import semver from 'semver';
import { CustomHelpers } from 'joi';
import { objectId } from '../validate/custom.validation';
import { NewCreatedAppVersion } from './appVersion.interfaces';

const semverVersion = (value: string, helpers: CustomHelpers) => {
  if (!semver.valid(value)) {
    return helpers.message({ custom: '"{{#label}}" must be a valid semver version (e.g. 1.2.0)' });
  }
  return value;
};

const createAppVersionBody: Record<keyof NewCreatedAppVersion, any> = {
  platform: Joi.string().valid('ios', 'android').required(),
  latestVersion: Joi.string().required().custom(semverVersion),
  minSupportedVersion: Joi.string().required().custom(semverVersion),
  storeUrl: Joi.string().uri().required(),
  softUpdateTitle: Joi.string().default('Update Available'),
  softUpdateMessage: Joi.string().default('A new version is available with improvements.'),
  hardUpdateTitle: Joi.string().default('Update Required'),
  hardUpdateMessage: Joi.string().default('This version is no longer supported. Please update to continue.'),
  isActive: Joi.boolean().default(true),
  maintenanceMode: Joi.boolean().default(false),
  maintenanceMessage: Joi.string().optional().allow(''),
};

export const checkVersion = {
  query: Joi.object().keys({
    platform: Joi.string().valid('ios', 'android').required(),
    version: Joi.string().required().custom(semverVersion),
  }),
};

export const createAppVersion = {
  body: Joi.object().keys(createAppVersionBody),
};

export const getAppVersion = {
  params: Joi.object().keys({
    appVersionId: Joi.string().custom(objectId),
  }),
};

export const updateAppVersion = {
  params: Joi.object().keys({
    appVersionId: Joi.required().custom(objectId),
  }),
  body: Joi.object()
    .keys({
      platform: Joi.string().valid('ios', 'android'),
      latestVersion: Joi.string().custom(semverVersion),
      minSupportedVersion: Joi.string().custom(semverVersion),
      storeUrl: Joi.string().uri(),
      softUpdateTitle: Joi.string(),
      softUpdateMessage: Joi.string(),
      hardUpdateTitle: Joi.string(),
      hardUpdateMessage: Joi.string(),
      isActive: Joi.boolean(),
      maintenanceMode: Joi.boolean(),
      maintenanceMessage: Joi.string().allow(''),
    })
    .min(1),
};

export const deleteAppVersion = {
  params: Joi.object().keys({
    appVersionId: Joi.string().custom(objectId),
  }),
};
