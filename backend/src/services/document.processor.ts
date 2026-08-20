import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters";
import { env } from "../config/env.js";
import { logger } from "../config/logger.js";
import { cleanText, estimateTokens } from "../utils/text.js";
import { embedTexts } from "../ai/embeddings/embedding.service.js";
import { extractTextFromBuffer, type DocumentExtension } from "./document.extractor.js";
import { prisma } from "../config/database.js";
import { deleteChunksByDocument, insertEmbeddings } from "../repositories/embedding.repo.js";
import { updateDocument } from "../repositories/document.repo.js";
import { DOCUMENT_STATUS } from "../config/constants.js";

export interface Chunk {
  content: string;
  chunkIndex: number;
  tokenCount: number;
}

export async function extractDocumentText(
  extension: DocumentExtension,
  buffer: Buffer,
): Promise<string> {
  const raw = await extractTextFromBuffer(extension, buffer);
  return cleanText(raw);
}

export async function splitIntoChunks(text: string): Promise<Chunk[]> {
  const splitter = new RecursiveCharacterTextSplitter({
    chunkSize: env.RAG_CHUNK_SIZE_TOKENS,
    chunkOverlap: env.RAG_CHUNK_OVERLAP_TOKENS,
    lengthFunction: (t) => estimateTokens(t),
    separators: ["\n\n", "\n", ". ", "! ", "? ", "; ", ": ", " ", ""],
  });

  const docs = await splitter.splitText(text);
  return docs
    .map((content, chunkIndex) => ({
      content: content.trim(),
      chunkIndex,
      tokenCount: estimateTokens(content),
    }))
    .filter((chunk) => chunk.content.length > 0);
}

export interface ProcessResult {
  text: string;
  chunkCount: number;
  truncated: boolean;
}

const MAX_DOCUMENT_TEXT_LENGTH = 2_000_000;

export async function processDocument(
  documentId: string,
  kbId: string,
  userId: string,
  extension: DocumentExtension,
  buffer: Buffer,
): Promise<ProcessResult> {
  await updateDocument(documentId, { status: DOCUMENT_STATUS.PROCESSING });

  try {
    const text = await extractDocumentText(extension, buffer);
    if (text.length === 0) {
      throw new Error("No extractable text found in the document");
    }

    const truncated = text.length > MAX_DOCUMENT_TEXT_LENGTH;
    const usableText = truncated ? text.slice(0, MAX_DOCUMENT_TEXT_LENGTH) : text;

    const chunks = await splitIntoChunks(usableText);
    if (chunks.length === 0) {
      throw new Error("Document produced no indexable chunks");
    }

    await deleteChunksByDocument(documentId);

    const created = await prisma.$transaction(async (tx) => {
      return Promise.all(
        chunks.map((chunk) =>
          tx.documentChunk.create({
            data: {
              documentId,
              kbId,
              userId,
              content: chunk.content,
              chunkIndex: chunk.chunkIndex,
              tokenCount: chunk.tokenCount,
            },
          }),
        ),
      );
    });

    const batchSize = 32;
    for (let i = 0; i < created.length; i += batchSize) {
      const batch = created.slice(i, i + batchSize);
      const vectors = await embedTexts(batch.map((chunk) => chunk.content));
      await insertEmbeddings(
        batch.map((chunk, j) => ({
          chunkId: chunk.id,
          documentId,
          kbId,
          userId,
          vector: vectors[j],
          model: env.EMBEDDING_MODEL,
          dimensions: vectors[j].length,
        })),
      );
    }

    await updateDocument(documentId, {
      status: DOCUMENT_STATUS.PROCESSED,
      chunkCount: created.length,
      errorMessage: null,
    });

    return { text: usableText, chunkCount: created.length, truncated };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown processing error";
    logger.error(`[DocumentProcessor] document ${documentId} failed: ${message}`);
    await updateDocument(documentId, {
      status: DOCUMENT_STATUS.FAILED,
      errorMessage: message,
      chunkCount: 0,
    });
    throw error;
  }
}

export function reindexStatus(): string {
  return DOCUMENT_STATUS.PROCESSED;
}
