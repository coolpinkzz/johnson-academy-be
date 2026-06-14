import jwt from 'jsonwebtoken';
import moment, { Moment } from 'moment';
import mongoose from 'mongoose';
import httpStatus from 'http-status';
import config from '../../config/config';
import Token from './token.model';
import ApiError from '../errors/ApiError';
import tokenTypes from './token.types';
import { AccessAndRefreshTokens, ITokenDoc } from './token.interfaces';
import { IUserDoc } from '../user/user.interfaces';
import { userService } from '../user';

const NEVER_EXPIRES_AT = moment('2099-12-31T23:59:59Z');

/**
 * Generate token
 * @param {mongoose.Types.ObjectId} userId
 * @param {Moment | null} expires
 * @param {string} type
 * @param {string} [secret]
 * @returns {string}
 */
export const generateToken = (
  userId: mongoose.Types.ObjectId,
  expires: Moment | null,
  type: string,
  secret: string = config.jwt.secret
): string => {
  const payload: Record<string, unknown> = {
    sub: userId,
    iat: moment().unix(),
    type,
  };
  if (expires) {
    payload['exp'] = expires.unix();
  }
  return jwt.sign(payload, secret);
};

/**
 * Save a token
 * @param {string} token
 * @param {mongoose.Types.ObjectId} userId
 * @param {Moment} expires
 * @param {string} type
 * @param {boolean} [blacklisted]
 * @returns {Promise<ITokenDoc>}
 */
export const saveToken = async (
  token: string,
  userId: mongoose.Types.ObjectId,
  expires: Moment,
  type: string,
  blacklisted: boolean = false
): Promise<ITokenDoc> => {
  const tokenDoc = await Token.create({
    token,
    user: userId,
    expires: expires.toDate(),
    type,
    blacklisted,
  });
  return tokenDoc;
};

/**
 * Verify token and return token doc (or throw an error if it is not valid)
 * @param {string} token
 * @param {string} type
 * @returns {Promise<ITokenDoc>}
 */
export const verifyToken = async (token: string, type: string): Promise<ITokenDoc> => {
  const payload = jwt.verify(token, config.jwt.secret, {
    ignoreExpiration: type === tokenTypes.REFRESH,
  });
  if (typeof payload.sub !== 'string') {
    throw new ApiError(httpStatus.BAD_REQUEST, 'bad user');
  }
  const tokenDoc = await Token.findOne({
    token,
    type,
    user: payload.sub,
    blacklisted: false,
  });
  if (!tokenDoc) {
    throw new Error('Token not found');
  }
  return tokenDoc;
};

/**
 * Generate auth tokens
 * @param {IUserDoc} user
 * @returns {Promise<AccessAndRefreshTokens>}
 */
export const generateAuthTokens = async (user: IUserDoc): Promise<AccessAndRefreshTokens> => {
  const accessToken = generateToken(user.id, null, tokenTypes.ACCESS);
  const refreshToken = generateToken(user.id, null, tokenTypes.REFRESH);
  await saveToken(refreshToken, user.id, NEVER_EXPIRES_AT, tokenTypes.REFRESH);

  const neverExpires = NEVER_EXPIRES_AT.toDate();
  return {
    access: {
      token: accessToken,
      expires: neverExpires,
    },
    refresh: {
      token: refreshToken,
      expires: neverExpires,
    },
  };
};

/**
 * Generate reset password token
 * @param {string} email
 * @returns {Promise<string>}
 */
export const generateResetPasswordToken = async (email: string): Promise<string> => {
  const user = await userService.getUserByEmail(email);
  if (!user) {
    throw new ApiError(httpStatus.NO_CONTENT, '');
  }
  const expires = moment().add(config.jwt.resetPasswordExpirationMinutes, 'minutes');
  const resetPasswordToken = generateToken(user.id, expires, tokenTypes.RESET_PASSWORD);
  await saveToken(resetPasswordToken, user.id, expires, tokenTypes.RESET_PASSWORD);
  return resetPasswordToken;
};

/**
 * Generate verify email token
 * @param {IUserDoc} user
 * @returns {Promise<string>}
 */
export const generateVerifyEmailToken = async (user: IUserDoc): Promise<string> => {
  const expires = moment().add(config.jwt.verifyEmailExpirationMinutes, 'minutes');
  const verifyEmailToken = generateToken(user.id, expires, tokenTypes.VERIFY_EMAIL);
  await saveToken(verifyEmailToken, user.id, expires, tokenTypes.VERIFY_EMAIL);
  return verifyEmailToken;
};
