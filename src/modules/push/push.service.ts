import httpStatus from 'http-status';
import mongoose from 'mongoose';
import { Expo, ExpoPushMessage, ExpoPushTicket } from 'expo-server-sdk';
import ApiError from '../errors/ApiError';
import logger from '../logger/logger';
import Module from '../module/module.model';
import DeviceToken from './push.model';
import { IDeviceTokenDoc, NotifyModuleStartedParams, PushPayload, RegisterDeviceTokenBody } from './push.interfaces';

const expo = new Expo();

const toIdString = (value: mongoose.Types.ObjectId | string): string =>
  typeof value === 'string' ? value : value.toString();

const collectUnregisteredTokens = (chunk: ExpoPushMessage[], tickets: ExpoPushTicket[]): string[] => {
  const staleTokens: string[] = [];
  tickets.forEach((ticket, index) => {
    if (ticket.status !== 'error' || ticket.details?.error !== 'DeviceNotRegistered') {
      return;
    }
    const message = chunk[index];
    if (message && typeof message.to === 'string') {
      staleTokens.push(message.to);
    }
  });
  return staleTokens;
};

export const registerToken = async (
  userId: mongoose.Types.ObjectId | string,
  body: RegisterDeviceTokenBody
): Promise<IDeviceTokenDoc> => {
  if (!Expo.isExpoPushToken(body.token)) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Invalid Expo push token');
  }

  const deviceToken = await DeviceToken.findOneAndUpdate(
    { token: body.token },
    {
      userId,
      token: body.token,
      platform: body.platform,
      lastSeenAt: new Date(),
    },
    { upsert: true, new: true, setDefaultsOnInsert: true, runValidators: true }
  );

  if (!deviceToken) {
    throw new ApiError(httpStatus.INTERNAL_SERVER_ERROR, 'Failed to register device token');
  }

  return deviceToken;
};

export const unregisterToken = async (userId: mongoose.Types.ObjectId | string, token: string): Promise<void> => {
  await DeviceToken.deleteOne({ userId, token });
};

export const sendToUsers = async (userIds: Array<mongoose.Types.ObjectId | string>, payload: PushPayload): Promise<void> => {
  if (userIds.length === 0) {
    return;
  }

  const deviceTokens = await DeviceToken.find({ userId: { $in: userIds } });
  if (deviceTokens.length === 0) {
    logger.warn(`No device tokens found for users: ${userIds.map((id) => id.toString()).join(', ')}`);
    return;
  }

  const messages: ExpoPushMessage[] = [];
  const invalidTokens: string[] = [];

  deviceTokens.forEach((device) => {
    if (!Expo.isExpoPushToken(device.token)) {
      invalidTokens.push(device.token);
      return;
    }
    messages.push({
      to: device.token,
      sound: 'default',
      title: payload.title,
      body: payload.body,
      data: payload.data,
      channelId: 'default',
    });
  });

  if (invalidTokens.length > 0) {
    await DeviceToken.deleteMany({ token: { $in: invalidTokens } });
  }

  if (messages.length === 0) {
    return;
  }

  logger.info(`Sending Expo push to ${messages.length} device(s): ${payload.title}`);

  const chunks = expo.chunkPushNotifications(messages);
  const ticketResults = await Promise.all(
    chunks.map(async (chunk) => {
      try {
        const tickets = await expo.sendPushNotificationsAsync(chunk);
        tickets.forEach((ticket, index) => {
          const message = chunk[index];
          const token = message && typeof message.to === 'string' ? message.to : 'unknown';
          if (ticket.status === 'error') {
            logger.error(`Expo push ticket error for ${token}: ${ticket.message} (${ticket.details?.error ?? 'unknown'})`);
            return;
          }
          logger.info(`Expo push ticket ok for ${token}: ${ticket.id}`);
        });
        return collectUnregisteredTokens(chunk, tickets);
      } catch (error: unknown) {
        logger.error(`Expo push send failed: ${error instanceof Error ? error.message : String(error)}`);
        return [] as string[];
      }
    })
  );

  const staleTokens = ticketResults.flat();
  if (staleTokens.length > 0) {
    await DeviceToken.deleteMany({ token: { $in: staleTokens } });
  }
};

export const notifyModuleStarted = async (params: NotifyModuleStartedParams): Promise<void> => {
  const studentId = toIdString(params.studentId);
  if (studentId === params.actorId) {
    logger.info(`Skipping module started push because actor ${params.actorId} is the student`);
    return;
  }

  logger.info(`Notifying student ${studentId} that module ${toIdString(params.moduleId)} started`);

  const moduleDoc = await Module.findById(params.moduleId).select('title');
  const moduleTitle = moduleDoc?.title ?? 'A module';

  await sendToUsers([studentId], {
    title: 'New module started',
    body: `${moduleTitle} is now in progress.`,
    data: {
      type: 'module_started',
      progressId: params.progressId,
      moduleId: toIdString(params.moduleId),
      syllabusId: toIdString(params.syllabusId),
      courseId: toIdString(params.courseId),
      classId: toIdString(params.classId),
    },
  });
};
