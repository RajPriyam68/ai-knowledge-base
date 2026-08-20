import multer from "multer";
import type { NextFunction, Request, Response } from "express";
import { BadRequestError, PayloadTooLargeError, UnsupportedMediaTypeError } from "../utils/errors.js";
import { env } from "../config/env.js";
import { extensionFromName, isAllowedExtension, mimeIsAccepted } from "../storage/file.storage.js";

const maxBytes = env.MAX_FILE_SIZE_MB * 1024 * 1024;

export const uploadMemory = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: maxBytes,
    files: 10,
  },
});

export const uploadFiles = uploadMemory.array("files", 10);

export function handleUpload(req: Request, res: Response, next: NextFunction) {
  uploadFiles(req, res, (err: unknown) => {
    if (!err) {
      next();
      return;
    }
    if (err instanceof multer.MulterError) {
      if (err.code === "LIMIT_FILE_SIZE") {
        next(new PayloadTooLargeError(`File exceeds the ${env.MAX_FILE_SIZE_MB}MB limit`));
        return;
      }
      if (err.code === "LIMIT_FILE_COUNT") {
        next(new BadRequestError("Too many files uploaded (max 10)"));
        return;
      }
      next(new BadRequestError(err.message));
      return;
    }
    next(err);
  });
}

export function validateFiles(req: Request, _res: Response, next: NextFunction) {
  const files = (req.files as Express.Multer.File[] | undefined) ?? [];
  if (files.length === 0) {
    next(new BadRequestError("No files were uploaded"));
    return;
  }
  for (const file of files) {
    const extension = extensionFromName(file.originalname);
    if (!isAllowedExtension(extension)) {
      next(
        new UnsupportedMediaTypeError(
          `Unsupported file type ".${extension}". Allowed: ${env.ALLOWED_EXTENSIONS}`,
        ),
      );
      return;
    }
    if (file.mimetype && !mimeIsAccepted(file.mimetype)) {
      next(new UnsupportedMediaTypeError(`Unsupported MIME type "${file.mimetype}"`));
      return;
    }
  }
  next();
}

export { maxBytes as MAX_UPLOAD_BYTES };
