import { prisma } from "../config/database.js";
import { logger } from "../config/logger.js";
import { processDocument } from "../services/document.processor.js";
import { onDocumentFailed, onDocumentProcessed } from "../services/document.service.js";
import { readStoredFile } from "../storage/file.storage.js";

const queue: string[] = [];
let processing = false;

export function enqueueDocumentProcessing(documentId: string): void {
  queue.push(documentId);
  void drain();
}

async function drain(): Promise<void> {
  if (processing) return;
  processing = true;
  try {
    while (queue.length > 0) {
      const documentId = queue.shift()!;
      try {
        const doc = await prisma.document.findUnique({ where: { id: documentId } });
        if (!doc || doc.status === "PROCESSED") continue;

        const buffer = await readStoredFile(doc.storagePath);
        await processDocument(
          doc.id,
          doc.kbId,
          doc.userId,
          doc.extension as "pdf" | "docx" | "txt" | "md",
          buffer,
        );
        await onDocumentProcessed(doc);
        logger.info(`[Jobs] processed document ${doc.originalName} (${doc.id})`);
      } catch (error) {
        const message = error instanceof Error ? error.message : "unknown";
        try {
          const failedDoc = await prisma.document.findUnique({ where: { id: documentId } });
          if (failedDoc) await onDocumentFailed(failedDoc, message);
        } catch {
          /* ignore */
        }
        logger.error(`[Jobs] document processing failed for ${documentId}: ${message}`);
      }
    }
  } finally {
    processing = false;
  }
}
