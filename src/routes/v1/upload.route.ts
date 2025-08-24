import express, { Router } from 'express';
import multer from 'multer';
import { validate } from '../../modules/validate';
import { auth } from '../../modules/auth';
import uploadValidation from '../../modules/upload/upload.validation';
import uploadController from '../../modules/upload/upload.controller';

const router: Router = express.Router();

// Configure multer for memory storage
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit for documents
  },
  fileFilter: (_req, file, cb) => {
    // Check file type - allow images and PDFs
    if (file.mimetype.startsWith('image/') || file.mimetype === 'application/pdf') {
      cb(null, true);
    } else {
      cb(new Error('Only image files and PDFs are allowed'));
    }
  },
});

router
  .route('/')
  .post(auth('uploadFiles'), upload.single('file'), validate(uploadValidation.uploadFile), uploadController.uploadFile);

router
  .route('/:fileId')
  .get(auth('getFiles'), validate(uploadValidation.getFileInfo), uploadController.getFileInfo)
  .delete(auth('deleteFiles'), validate(uploadValidation.deleteFile), uploadController.deleteFile);

export default router;
