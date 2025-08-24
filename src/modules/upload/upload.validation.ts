import Joi from 'joi';

const uploadFile = {
  body: Joi.object().keys({
    folder: Joi.string().optional(),
    tags: Joi.string().optional(),
    useUniqueFileName: Joi.string().valid('true', 'false').optional(),
  }),
};

const deleteFile = {
  params: Joi.object().keys({
    fileId: Joi.string().required(),
  }),
};

const getFileInfo = {
  params: Joi.object().keys({
    fileId: Joi.string().required(),
  }),
};

export default {
  uploadFile,
  deleteFile,
  getFileInfo,
};
