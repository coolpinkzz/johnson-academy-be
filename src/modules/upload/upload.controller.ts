import { Request, Response } from 'express';
import httpStatus from 'http-status';
import { catchAsync } from '../utils';
import uploadService from './upload.service';
import { IUploadRequest } from './upload.interfaces';

const uploadFile = catchAsync(async (req: Request, res: Response) => {
  if (!req.file) {
    return res.status(httpStatus.BAD_REQUEST).json({
      status: 'error',
      message: 'No file uploaded',
    });
  }

  const uploadRequest: IUploadRequest = {
    file: req.file,
    folder: req.body.folder ? `johnson-academy/${req.body.folder}` : 'johnson-academy/general',
    tags: req.body.tags ? req.body.tags.split(',') : [],
    useUniqueFileName: req.body.useUniqueFileName !== 'false',
  };

  const result = await uploadService.uploadFile(uploadRequest);

  return res.status(httpStatus.CREATED).json({
    status: 'success',
    data: result,
  });
});

const deleteFile = catchAsync(async (req: Request, res: Response) => {
  const { fileId } = req.params;

  if (!fileId) {
    return res.status(httpStatus.BAD_REQUEST).json({
      status: 'error',
      message: 'File ID is required',
    });
  }

  await uploadService.deleteFile(fileId);

  return res.status(httpStatus.NO_CONTENT).json({
    status: 'success',
    message: 'File deleted successfully',
  });
});

const getFileInfo = catchAsync(async (req: Request, res: Response) => {
  const { fileId } = req.params;

  if (!fileId) {
    return res.status(httpStatus.BAD_REQUEST).json({
      status: 'error',
      message: 'File ID is required',
    });
  }

  const result = await uploadService.getFileInfo(fileId);

  return res.status(httpStatus.OK).json({
    status: 'success',
    data: result,
  });
});

const uploadController = {
  uploadFile,
  deleteFile,
  getFileInfo,
};

export default uploadController;
