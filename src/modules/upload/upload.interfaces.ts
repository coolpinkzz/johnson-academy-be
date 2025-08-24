export interface IUploadResponse {
  url: string;
  fileId: string;
  fileName: string;
  filePath: string;
  fileType: string;
  size: number;
  height?: number;
  width?: number;
  thumbnailUrl?: string;
}

export interface IUploadRequest {
  file: Express.Multer.File;
  folder?: string;
  tags?: string[];
  useUniqueFileName?: boolean;
}

export interface IImageKitConfig {
  publicKey: string;
  privateKey: string;
  urlEndpoint: string;
}

export type SupportedFileType = 'image' | 'document';
