import { NotFoundError } from "../utils/errors.js";
import * as docRepo from "../repositories/document.repo.js";
import * as kbRepo from "../repositories/kb.repo.js";
import { deleteStoredFile, saveUpload } from "../storage/file.storage.js";
import { deleteChunksByDocument } from "../repositories/embedding.repo.js";
import { trackEvent } from "../repositories/analytics.repo.js";
import { notifyDocumentFailed, notifyDocumentProcessed } from "./notification.service.js";
import { enqueueDocumentProcessing } from "../jobs/document-queue.js";
import { readStoredFile } from "../storage/file.storage.js";
import { logToDb } from "../config/logger.js";

export async function uploadDocuments(
  userId: string,
  kbId: string,
  files: Express.Multer.File[],
) {
  const kb = await kbRepo.findKnowledgeBaseById(kbId);
  if (!kb || kb.userId !== userId) {
    throw new NotFoundError("Knowledge base not found");
  }

  const uploaded: Awaited<ReturnType<typeof docRepo.createDocument>>[] = [];
  const errors: { name: string; message: string }[] = [];

  for (const file of files) {
    try {
      const stored = await saveUpload(file.originalname, file.buffer, file.mimetype);
      const doc = await docRepo.createDocument({
        kbId,
        userId,
        filename: stored.filename,
        originalName: file.originalname,
        mimeType: stored.mimeType,
        extension: stored.extension,
        size: stored.size,
        storagePath: stored.storagePath,
      });
      uploaded.push(doc);
      enqueueDocumentProcessing(doc.id);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Upload failed";
      errors.push({ name: file.originalname, message });
    }
  }

  await trackEvent("document.upload", userId, {
    kbId,
    uploaded: uploaded.length,
    failed: errors.length,
  });

  return { uploaded, errors };
}

export async function listDocuments(userId: string, kbId?: string, search?: string) {
  if (kbId) {
    return docRepo.listDocumentsByKb(kbId, userId);
  }
  return docRepo.listDocumentsByUser(userId, search);
}

export async function renameDocument(userId: string, documentId: string, newName: string) {
  const doc = await docRepo.findDocumentById(documentId);
  if (!doc || doc.userId !== userId) {
    throw new NotFoundError("Document not found");
  }
  return docRepo.updateDocument(documentId, { originalName: newName });
}

export async function deleteDocument(userId: string, documentId: string) {
  const doc = await docRepo.findDocumentById(documentId);
  if (!doc || doc.userId !== userId) {
    throw new NotFoundError("Document not found");
  }
  await deleteChunksByDocument(documentId);
  await docRepo.deleteDocument(documentId);
  await deleteStoredFile(doc.storagePath);
  await trackEvent("document.delete", userId, { documentId });
  logToDb("info", `Document deleted: ${doc.originalName}`, { userId });
}

export async function previewDocument(userId: string, documentId: string, maxChars = 50_000) {
  const doc = await docRepo.findDocumentById(documentId);
  if (!doc || doc.userId !== userId) {
    throw new NotFoundError("Document not found");
  }
  if (doc.status === "FAILED") {
    return { document: doc, text: "", error: doc.errorMessage };
  }
  if (doc.status === "PROCESSING") {
    return { document: doc, text: "", processing: true };
  }
  const buffer = await readStoredFile(doc.storagePath);
  const { extractTextFromBuffer } = await import("./document.extractor.js");
  const text = await extractTextFromBuffer(doc.extension as "pdf" | "docx" | "txt" | "md", buffer);
  return { document: doc, text: text.slice(0, maxChars), processing: false };
}

export async function reprocessFailed(userId: string, documentId: string) {
  const doc = await docRepo.findDocumentById(documentId);
  if (!doc || doc.userId !== userId) {
    throw new NotFoundError("Document not found");
  }
  enqueueDocumentProcessing(documentId);
  return docRepo.updateDocument(documentId, { status: "PROCESSING", errorMessage: null });
}

export async function onDocumentProcessed(doc: { id: string; userId: string; originalName: string }) {
  await notifyDocumentProcessed(doc.userId, doc.originalName);
}

export async function onDocumentFailed(doc: { id: string; userId: string; originalName: string }, reason: string) {
  await notifyDocumentFailed(doc.userId, doc.originalName, reason);
}
