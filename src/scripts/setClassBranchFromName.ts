/**
 * One-time migration: set Classes.branch from the class name prefix.
 * JA01/* → 1, JA02/* → 2, JA03/* → 3, JA04/* → 4, JAON/* → online
 *
 * Run: yarn compile && yarn script:set-class-branch
 */
import mongoose from 'mongoose';
import config from '../config/config';
import Classes from '../modules/classes/classes.model';
import logger from '../modules/logger/logger';

const PREFIX_TO_BRANCH: { pattern: RegExp; label: string; branch: string }[] = [
  { pattern: /^JA01\//i, label: 'JA01', branch: '1' },
  { pattern: /^JA02\//i, label: 'JA02', branch: '2' },
  { pattern: /^JA03\//i, label: 'JA03', branch: '3' },
  { pattern: /^JA04\//i, label: 'JA04', branch: '4' },
  { pattern: /^JAON\//i, label: 'JAON', branch: 'online' },
];

const KNOWN_PREFIX = /^(JA01|JA02|JA03|JA04|JAON)\//i;

async function migrate() {
  try {
    await mongoose.connect(config.mongoose.url);
    logger.info('Connected to MongoDB');

    const results = await Promise.all(
      PREFIX_TO_BRANCH.map(async ({ pattern, label, branch }) => {
        const result = await Classes.updateMany({ name: pattern, branch: { $ne: branch } }, { $set: { branch } });
        return { label, branch, matched: result.matchedCount, modified: result.modifiedCount };
      })
    );

    results.forEach(({ label, branch, matched, modified }) => {
      logger.info(`${label}/* → branch "${branch}": matched=${matched}, modified=${modified}`);
    });

    const unmatched = await Classes.find({ name: { $not: KNOWN_PREFIX } })
      .select('name branch')
      .lean();

    if (unmatched.length > 0) {
      const names = unmatched.map((classDoc) => classDoc.name).join(', ');
      logger.warn(`Left unchanged (${unmatched.length}): ${names}`);
    } else {
      logger.info('Every class name matched a known prefix');
    }
  } catch (err) {
    logger.error('Migration failed', err);
    throw err;
  } finally {
    await mongoose.disconnect();
    logger.info('Disconnected from MongoDB');
    process.exit(0);
  }
}

migrate();
