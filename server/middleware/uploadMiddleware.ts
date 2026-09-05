import multer, { FileFilterCallback } from 'multer';
import { Request, Response, NextFunction } from 'express';

const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const ALLOWED_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.webp'];
const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB
const MAX_FILES_COUNT = 5;

// Magic byte signatures for verified formats
const isBufferValidImage = (buffer: Buffer): boolean => {
  if (!buffer || buffer.length < 4) return false;

  // JPEG: FF D8 FF
  if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return true;
  }
  // PNG: 89 50 4E 47 0D 0A 1A 0A
  if (
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x4e &&
    buffer[3] === 0x47
  ) {
    return true;
  }
  // WEBP: RIFF....WEBP (offset 0: 52 49 46 46, offset 8: 57 45 42 50)
  if (
    buffer.length >= 12 &&
    buffer[0] === 0x52 &&
    buffer[1] === 0x49 &&
    buffer[2] === 0x46 &&
    buffer[3] === 0x46 &&
    buffer[8] === 0x57 &&
    buffer[9] === 0x45 &&
    buffer[10] === 0x42 &&
    buffer[11] === 0x50
  ) {
    return true;
  }

  return false;
};

const fileFilter = (
  req: Request,
  file: Express.Multer.File,
  cb: FileFilterCallback
) => {
  // Check MIME type
  if (!ALLOWED_MIME_TYPES.includes(file.mimetype.toLowerCase())) {
    return cb(
      new Error(
        `Invalid file format (${file.mimetype}). Only JPEG, PNG, and WebP images are permitted.`
      )
    );
  }

  // Check file extension
  const originalNameLower = file.originalname.toLowerCase();
  const hasAllowedExt = ALLOWED_EXTENSIONS.some((ext) =>
    originalNameLower.endsWith(ext)
  );

  if (!hasAllowedExt) {
    return cb(
      new Error(
        'Invalid file extension. Only .jpg, .jpeg, .png, and .webp files are allowed.'
      )
    );
  }

  cb(null, true);
};

const memoryStorage = multer.memoryStorage();

export const uploadEvidenceMiddleware = multer({
  storage: memoryStorage,
  limits: {
    fileSize: MAX_FILE_SIZE_BYTES,
    files: MAX_FILES_COUNT,
  },
  fileFilter,
}).array('images', MAX_FILES_COUNT);

export const uploadResolutionMiddleware = multer({
  storage: memoryStorage,
  limits: {
    fileSize: MAX_FILE_SIZE_BYTES,
    files: MAX_FILES_COUNT,
  },
  fileFilter,
}).array('resolutionImages', MAX_FILES_COUNT);

/**
 * Express wrapper middleware to handle Multer upload errors gracefully
 */
export function handleEvidenceUpload(req: Request, res: Response, next: NextFunction) {
  uploadEvidenceMiddleware(req, res, (err: any) => {
    if (err instanceof multer.MulterError) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({
          success: false,
          message: 'One or more image files exceed the 5 MB maximum size limit.',
        });
      }
      if (err.code === 'LIMIT_UNEXPECTED_FILE' || err.code === 'LIMIT_FILE_COUNT') {
        return res.status(400).json({
          success: false,
          message: `Maximum ${MAX_FILES_COUNT} images can be attached per complaint.`,
        });
      }
      return res.status(400).json({
        success: false,
        message: `File upload error: ${err.message}`,
      });
    } else if (err) {
      return res.status(400).json({
        success: false,
        message: err.message || 'Invalid image file provided.',
      });
    }

    // Inspect buffers for magic bytes
    if (req.files && Array.isArray(req.files)) {
      for (const file of req.files) {
        if (!isBufferValidImage(file.buffer)) {
          return res.status(400).json({
            success: false,
            message: `File ${file.originalname} has an invalid or disguised image signature. Only real JPEG, PNG, and WebP files are allowed.`,
          });
        }
      }
    }

    next();
  });
}

export function handleResolutionUpload(req: Request, res: Response, next: NextFunction) {
  uploadResolutionMiddleware(req, res, (err: any) => {
    if (err instanceof multer.MulterError) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({
          success: false,
          message: 'One or more resolution image files exceed the 5 MB maximum size limit.',
        });
      }
      if (err.code === 'LIMIT_UNEXPECTED_FILE' || err.code === 'LIMIT_FILE_COUNT') {
        return res.status(400).json({
          success: false,
          message: `Maximum ${MAX_FILES_COUNT} resolution images can be attached.`,
        });
      }
      return res.status(400).json({
        success: false,
        message: `File upload error: ${err.message}`,
      });
    } else if (err) {
      return res.status(400).json({
        success: false,
        message: err.message || 'Invalid image file provided.',
      });
    }

    // Inspect buffers for magic bytes
    if (req.files && Array.isArray(req.files)) {
      for (const file of req.files) {
        if (!isBufferValidImage(file.buffer)) {
          return res.status(400).json({
            success: false,
            message: `File ${file.originalname} has an invalid or disguised image signature. Only real JPEG, PNG, and WebP files are allowed.`,
          });
        }
      }
    }

    next();
  });
}
