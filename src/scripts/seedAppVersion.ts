/**
 * Seed script: create default app version configs for iOS and Android.
 *
 * Run: yarn compile && yarn script:seed-app-version
 */
import mongoose from 'mongoose';
import config from '../config/config';
import logger from '../modules/logger/logger';
import AppVersion from '../modules/appVersion/appVersion.model';
import { NewCreatedAppVersion } from '../modules/appVersion/appVersion.interfaces';

const seedData: NewCreatedAppVersion[] = [
  {
    platform: 'ios',
    latestVersion: '1.0.0',
    minSupportedVersion: '1.0.0',
    storeUrl: 'https://apps.apple.com/app/id000000000',
    softUpdateTitle: 'Update Available',
    softUpdateMessage: 'A new version of Johnson Academy is available with improvements.',
    hardUpdateTitle: 'Update Required',
    hardUpdateMessage: 'This version is no longer supported. Please update to continue using Johnson Academy.',
    isActive: true,
    maintenanceMode: false,
    maintenanceMessage: 'Johnson Academy is temporarily unavailable for maintenance. Please try again later.',
  },
  {
    platform: 'android',
    latestVersion: '1.0.0',
    minSupportedVersion: '1.0.0',
    storeUrl: 'https://play.google.com/store/apps/details?id=com.johnsonacademy.app',
    softUpdateTitle: 'Update Available',
    softUpdateMessage: 'A new version of Johnson Academy is available with improvements.',
    hardUpdateTitle: 'Update Required',
    hardUpdateMessage: 'This version is no longer supported. Please update to continue using Johnson Academy.',
    isActive: true,
    maintenanceMode: false,
    maintenanceMessage: 'Johnson Academy is temporarily unavailable for maintenance. Please try again later.',
  },
];

async function seed() {
  try {
    await mongoose.connect(config.mongoose.url);
    logger.info('Connected to MongoDB');

    for (const entry of seedData) {
      const existing = await AppVersion.findOne({ platform: entry.platform });

      if (existing) {
        logger.info(`App version config for "${entry.platform}" already exists — skipping`);
        continue;
      }

      await AppVersion.create(entry);
      logger.info(`Created app version config for "${entry.platform}"`);
    }

    logger.info('Seed completed successfully');
  } catch (err) {
    logger.error('Seed failed', err);
    throw err;
  } finally {
    await mongoose.disconnect();
    logger.info('Disconnected from MongoDB');
    process.exit(0);
  }
}

seed();
