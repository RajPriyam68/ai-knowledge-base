import fs from "node:fs/promises";
import path from "node:path";
import crypto from "node:crypto";
import { env } from "../config/env.js";
import { BadRequestError, UnsupportedMediaTypeError } from "../utils/errors.js";
import { SUPPORTED_MIME_TYPES } from "../config/constants.js";

export interface StoredFile {
  storagePath: string;
  filename: string;
  mimeType: string;
  extension: string;
  size: number;
}

export function getUploadDir(): string {
  return path.resolve(env.UPLOAD_DIR);
}

export function ensureUploadDirSync(): void {
  const dir = getUploadDir();
  fs.mkdir(dir, { recursive: true }).catch(() => undefined);
}

export async function ensureUploadDir(): Promise<void> {
  await fs.mkdir(getUploadDir(), { recursive: true });
}

export function isAllowedMime(mimeType: string): boolean {
  return Boolean(SUPPORTED_MIME_TYPES[mimeType]);
}

export function isGenericMime(mimeType: string | undefined | null): boolean {
  return !mimeType || mimeType === "application/octet-stream";
}

export function mimeIsAccepted(mimeType: string | undefined | null): boolean {
  return isGenericMime(mimeType) || isAllowedMime(mimeType ?? "");
}

export function normalizedMime(mimeType: string | undefined | null, extension: string): string {
  if (isGenericMime(mimeType)) {
    return mimeFromExtension(extension) ?? mimeType ?? "application/octet-stream";
  }
  return mimeType ?? "application/octet-stream";
}

export function isAllowedExtension(extension: string): boolean {
  const allowed = env.ALLOWED_EXTENSIONS.split(",").map((e) => e.trim().toLowerCase());
  return allowed.includes(extension.toLowerCase());
}

export function extensionFromName(filename: string): string {
  const ext = path.extname(filename).slice(1).toLowerCase();
  return ext;
}

export function mimeFromExtension(extension: string): string | null {
  for (const [mime, ext] of Object.entries(SUPPORTED_MIME_TYPES)) {
    if (ext === extension) return mime;
  }
  return null;
}

export async function saveUpload(
  originalName: string,
  buffer: Buffer,
  mimeType: string,
): Promise<StoredFile> {
  await ensureUploadDir();
  const extension = extensionFromName(originalName);

  if (!isAllowedExtension(extension)) {
    throw new UnsupportedMediaTypeError(
      `Unsupported file type ".${extension}". Allowed: ${env.ALLOWED_EXTENSIONS}`,
    );
  }
  if (!mimeIsAccepted(mimeType)) {
    throw new UnsupportedMediaTypeError(`Unsupported MIME type "${mimeType}"`);
  }

  const maxBytes = env.MAX_FILE_SIZE_MB * 1024 * 1024;
  if (buffer.length > maxBytes) {
    throw new BadRequestError(
      `File exceeds the ${env.MAX_FILE_SIZE_MB}MB limit`,
      { maxSizeBytes: maxBytes },
    );
  }

  const safeBase = crypto.randomBytes(16).toString("hex");
  const filename = `${safeBase}.${extension}`;
  const storagePath = path.join(getUploadDir(), filename);
  await fs.writeFile(storagePath, buffer);

  return {
    storagePath,
    filename,
    mimeType: normalizedMime(mimeType, extension),
    extension,
    size: buffer.length,
  };
}

export async function deleteStoredFile(storagePath: string): Promise<void> {
  try {
    await fs.unlink(storagePath);
  } catch {
    // file may already be missing
  }
}

export async function readStoredFile(storagePath: string): Promise<Buffer> {
  return fs.readFile(storagePath);
}

export async function getStorageUsage(): Promise<{ bytes: number; fileCount: number }> {
  try {
    const entries = await fs.readdir(getUploadDir());
    let bytes = 0;
    for (const entry of entries) {
      try {
        const stat = await fs.stat(path.join(getUploadDir(), entry));
        bytes += stat.size;
      } catch {
        /* skip */
      }
    }
    return { bytes, fileCount: entries.length };
  } catch {
    return { bytes: 0, fileCount: 0 };
  }
}
