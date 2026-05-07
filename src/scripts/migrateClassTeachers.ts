/**
 * One-time migration: copy legacy `teacherId` into `teachers` and remove `teacherId`.
 * Run: yarn compile && yarn script:migrate-class-teachers
 */
import mongoose from 'mongoose';
import config from '../config/config';
import Classes from '../modules/classes/classes.model';
import logger from '../modules/logger/logger';

async function migrate() {
  try {
    await mongoose.connect(config.mongoose.url);
    logger.info('Connected to MongoDB');

    const filter = { teacherId: { $exists: true, $ne: null } };

    const pending = await Classes.countDocuments(filter);
    logger.info(`Documents with legacy teacherId: ${pending}`);

    const result = await Classes.collection.updateMany(filter, [
      {
        $set: {
          teachers: {
            $setUnion: [
              { $ifNull: ['$teachers', []] },
              {
                $cond: {
                  if: { $ne: ['$teacherId', null] },
                  then: ['$teacherId'],
                  else: [],
                },
              },
            ],
          },
        },
      },
      { $unset: 'teacherId' },
    ]);

    logger.info(`Migration finished. matchedCount=${result.matchedCount}, modifiedCount=${result.modifiedCount}`);
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
