import ImageKit from 'imagekit';
import config from '../../config/config';
import { IUploadResponse, IUploadRequest } from './upload.interfaces';
import { ApiError } from '../errors';
import httpStatus from 'http-status';

class UploadService {
  private imagekit: ImageKit;

  constructor() {
    if (!config.imagekit?.publicKey || !config.imagekit?.privateKey || !config.imagekit?.urlEndpoint) {
      throw new Error('ImageKit configuration is missing. Please check your environment variables.');
    }

    this.imagekit = new ImageKit({
      publicKey: config.imagekit.publicKey,
      privateKey: config.imagekit.privateKey,
      urlEndpoint: config.imagekit.urlEndpoint,
    });
  }

  async uploadFile(uploadRequest: IUploadRequest): Promise<IUploadResponse> {
    try {
      const { file, folder = 'general', tags = [], useUniqueFileName = true } = uploadRequest;

      // Validate file type
      if (!this.isValidFileType(file.mimetype)) {
        throw new ApiError(httpStatus.BAD_REQUEST, 'Invalid file type. Only images and PDFs are allowed.');
      }

      // Validate file size (10MB limit for documents, 5MB for images)
      const maxSize = this.isImageFile(file.mimetype) ? 5 * 1024 * 1024 : 10 * 1024 * 1024;
      if (file.size > maxSize) {
        const maxSizeMB = maxSize / (1024 * 1024);
        throw new ApiError(httpStatus.BAD_REQUEST, `File size too large. Maximum size is ${maxSizeMB}MB.`);
      }

      // Convert buffer to base64
      const base64File = file.buffer.toString('base64');

      // Upload to ImageKit
      const uploadResponse = await this.imagekit.upload({
        file: base64File,
        fileName: useUniqueFileName ? `${Date.now()}_${file.originalname}` : file.originalname,
        folder: folder,
        tags: tags,
        useUniqueFileName: useUniqueFileName,
      });

      return {
        url: uploadResponse.url,
        fileId: uploadResponse.fileId,
        fileName: uploadResponse.name,
        filePath: uploadResponse.filePath,
        fileType: uploadResponse.fileType,
        size: uploadResponse.size,
        height: uploadResponse.height,
        width: uploadResponse.width,
        thumbnailUrl: uploadResponse.thumbnailUrl,
      };
    } catch (error) {
      if (error instanceof ApiError) {
        throw error;
      }
      throw new ApiError(httpStatus.INTERNAL_SERVER_ERROR, 'Failed to upload image');
    }
  }

  async deleteFile(fileId: string): Promise<void> {
    try {
      await this.imagekit.deleteFile(fileId);
    } catch (error) {
      throw new ApiError(httpStatus.INTERNAL_SERVER_ERROR, 'Failed to delete file');
    }
  }

  async getFileInfo(fileId: string): Promise<any> {
    try {
      const fileDetails = await this.imagekit.getFileDetails(fileId);
      return fileDetails;
    } catch (error) {
      throw new ApiError(httpStatus.NOT_FOUND, 'File not found');
    }
  }

  private isValidFileType(mimetype: string): boolean {
    const validImageTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
    const validDocumentTypes = ['application/pdf'];
    return [...validImageTypes, ...validDocumentTypes].includes(mimetype);
  }

  private isImageFile(mimetype: string): boolean {
    const validImageTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
    return validImageTypes.includes(mimetype);
  }
}

export default new UploadService();
