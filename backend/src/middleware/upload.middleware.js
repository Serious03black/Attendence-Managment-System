import multer from 'multer';
import { ApiError } from '../utils/ApiError.js';

// Memory storage: files are buffered in RAM only long enough to stream to
// Cloudinary (see services/upload.service.js). Nothing is ever written to
// local disk, which matters both for stateless deploys (multiple app
// instances / containers) and for not needing a disk-cleanup cron job.
const storage = multer.memoryStorage();

const ALLOWED_MIME_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'application/zip',
  'text/plain',
  'text/csv',
]);

const fileFilter = (_req, file, cb) => {
  if (ALLOWED_MIME_TYPES.has(file.mimetype)) {
    cb(null, true);
  } else {
    cb(ApiError.badRequest(`File type '${file.mimetype}' is not allowed.`), false);
  }
};

export const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 15 * 1024 * 1024, files: 10 }, // 15MB per file, 10 files per request
});
