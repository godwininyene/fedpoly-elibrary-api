import multer from 'multer';
import ApiError from '../utils/ApiError.js';

const MAX_FILE_SIZE_MB = 50;
const ALLOWED_MIME_TYPES = ['application/pdf'];
const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

/**
 * Multer with memory storage — files are passed as buffers to Cloudinary.
 * This avoids writing temp files to disk, which is critical on cloud deployments.
 */
const storage = multer.memoryStorage();

const fileFilter = (allowedTypes) => (req, file, cb) => {
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(
      new ApiError(
        400,
        `Invalid file type: ${file.mimetype}. Allowed: ${allowedTypes.join(', ')}`
      ),
      false
    );
  }
};

export const uploadPDF = multer({
  storage,
  limits: { fileSize: MAX_FILE_SIZE_MB * 1024 * 1024 },
  fileFilter: fileFilter(ALLOWED_MIME_TYPES),
}).single('file');

export const uploadAvatar = multer({
  storage,
  limits: { fileSize: 2 * 1024 * 1024 }, // 2MB max for avatars
  fileFilter: fileFilter(ALLOWED_IMAGE_TYPES),
}).single('avatar');

/**
 * Wraps multer to convert multer errors into ApiError instances
 * that our global error handler can process cleanly.
 */
export const handleUploadError = (uploadFn) => (req, res, next) => {
  uploadFn(req, res, (err) => {
    if (!err) return next();

    if (err instanceof multer.MulterError) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        return next(new ApiError(400, `File too large. Maximum size is ${MAX_FILE_SIZE_MB}MB.`));
      }
      return next(new ApiError(400, `Upload error: ${err.message}`));
    }
    next(err);
  });
};