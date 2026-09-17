import Joi from 'joi';

export const registerToken = {
  body: Joi.object().keys({
    token: Joi.string().trim().required().max(512),
    platform: Joi.string().valid('ios', 'android').required(),
  }),
};

export const unregisterToken = {
  body: Joi.object().keys({
    token: Joi.string().trim().required().max(512),
  }),
};
