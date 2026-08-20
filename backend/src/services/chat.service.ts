import { NotFoundError } from "../utils/errors.js";
import * as chatRepo from "../repositories/chat.repo.js";
import * as docRepo from "../repositories/document.repo.js";

import {
  runRag,
  runDocumentTask,
  runFlashcards,
  runQuiz,
} from "../ai/rag/rag.pipeline.js";

import { trackEvent } from "../repositories/analytics.repo.js";
import { findKbMemberRole } from "../repositories/kb-member.repo.js";
import type { ChatTurn } from "../ai/llm/llm.provider.js";

function firstQuestionAsTitle(question: string): string {
  return question.replace(/\s+/g, " ").trim().slice(0, 60) || "New chat";
}

/**
 * Check whether the requesting user has access to the KB.
 *
 * OWNER / EDITOR / VIEWER are all allowed to use RAG
 * against a KB they are a member of.
 */
async function ensureKbAccess(userId: string, kbId: string) {
  const role = await findKbMemberRole(kbId, userId);

  if (!role || !["OWNER", "EDITOR", "VIEWER"].includes(role)) {
    throw new NotFoundError("Knowledge base not found");
  }
}

/**
 * Validate direct document access.
 *
 * Currently document-level RAG requires the document owner.
 * Shared-KB document access is intentionally handled separately.
 */
async function ensureDocOwnership(
  userId: string,
  documentIds: string[],
) {
  const docs = await Promise.all(
    documentIds.map((id) => docRepo.findDocumentById(id)),
  );

  for (const doc of docs) {
    if (!doc || doc.userId !== userId) {
      throw new NotFoundError("One or more documents were not found");
    }

    if (doc.status !== "PROCESSED") {
      throw new NotFoundError(
        `Document "${doc.originalName}" is not ready yet`,
      );
    }
  }

  return docs.filter(
    (d): d is NonNullable<typeof d> => Boolean(d),
  );
}

export async function sendChatMessage(params: {
  userId: string;
  question: string;
  kbId?: string;
  documentIds?: string[];
  chatId?: string;
}) {
  const { userId, question } = params;

  let chatId = params.chatId;

  let chat = chatId
    ? await chatRepo.findChatById(chatId)
    : null;

  if (chat && chat.userId !== userId) {
    throw new NotFoundError("Chat not found");
  }

  const history: ChatTurn[] = chat
    ? (
        await chatRepo.getRecentUserMessages(
          userId,
          chat.id,
        )
      )
        .reverse()
        .map((m) => ({
          role:
            m.role === "USER"
              ? ("user" as const)
              : ("assistant" as const),
          content: m.content,
        }))
    : [];

  const documentNames = new Map<string, string>();

  /**
   * RAG filters.
   *
   * userId is optional because KB-level RAG must not restrict
   * shared KB documents to the requesting user's own documents.
   */
  const filters: {
    kbIds?: string[];
    documentIds?: string[];
    userId?: string;
  } = {
    userId,
  };

  /**
   * KB-level RAG:
   *
   * OWNER / EDITOR / VIEWER can search the KB.
   *
   * Important:
   * Do NOT keep userId here because a shared KB can contain
   * documents uploaded by another user.
   */
  if (params.kbId) {
    await ensureKbAccess(userId, params.kbId);

    filters.kbIds = [params.kbId];

    delete filters.userId;
  }

  /**
   * Direct document-level RAG.
   *
   * This currently remains owner-only.
   */
  if (
    params.documentIds &&
    params.documentIds.length > 0
  ) {
    const docs = await ensureDocOwnership(
      userId,
      params.documentIds,
    );

    filters.documentIds = params.documentIds;

    docs.forEach((d) => {
      documentNames.set(d.id, d.originalName);
    });
  }

  /**
   * Create a new chat when necessary.
   */
  if (!chat) {
    const kbId =
      params.kbId ??
      (
        filters.documentIds &&
        filters.documentIds.length > 0
          ? null
          : null
      );

    chat = await chatRepo.createChat({
      userId,
      kbId: kbId ?? undefined,
      title: firstQuestionAsTitle(question),
    });

    chatId = chat.id;
  }

  /**
   * Store user's message.
   */
  await chatRepo.createMessage({
    chatId: chat.id,
    userId,
    role: "USER",
    content: question,
    documentIds: params.documentIds,
  });

  /**
   * Execute RAG.
   */
  const ragResult = await runRag({
    question,
    filters,
    history,
    documentNames,
  });

  /**
   * Store assistant response.
   */
  const assistantMessage = await chatRepo.createMessage({
    chatId: chat.id,
    userId,
    role: "ASSISTANT",
    content: ragResult.answer,
    citations: ragResult.citations,
    documentIds: params.documentIds,
  });

  await chatRepo.touchChat(chat.id);

  await trackEvent("chat.message", userId, {
    kbId: params.kbId,
    citations: ragResult.citations.length,
    provider: ragResult.provider,
  });

  return {
    chatId: chat.id,
    message: assistantMessage,
    answer: ragResult.answer,
    citations: ragResult.citations,
    model: ragResult.model,
    provider: ragResult.provider,
    tokenUsage: ragResult.tokenUsage,
    latencyMs: ragResult.latencyMs,
    followUps: ragResult.followUps,
  };
}

export async function listChatHistory(
  userId: string,
  search?: string,
) {
  return chatRepo.listChats(userId, search);
}

export async function getChatMessages(
  userId: string,
  chatId: string,
) {
  const chat = await chatRepo.findChatById(chatId);

  if (!chat || chat.userId !== userId) {
    throw new NotFoundError("Chat not found");
  }

  const messages =
    await chatRepo.listMessagesByChat(chatId);

  return { chat, messages };
}

export async function deleteChat(
  userId: string,
  chatId: string,
) {
  const chat = await chatRepo.findChatById(chatId);

  if (!chat || chat.userId !== userId) {
    throw new NotFoundError("Chat not found");
  }

  await chatRepo.deleteChat(chatId);

  await trackEvent("chat.delete", userId, {
    chatId,
  });
}

export async function summarizeDocument(
  userId: string,
  documentId: string,
) {
  const doc =
    await docRepo.findDocumentById(documentId);

  if (!doc || doc.userId !== userId) {
    throw new NotFoundError("Document not found");
  }

  if (doc.status !== "PROCESSED") {
    throw new NotFoundError(
      "Document is not ready yet",
    );
  }

  const chunks =
    await docRepo.listChunksByDocument(documentId);

  const text = chunks
    .map((c) => c.content)
    .join("\n\n")
    .slice(0, 30_000);

  return runDocumentTask("summarize", text);
}

export async function keyPointsDocument(
  userId: string,
  documentId: string,
) {
  const doc =
    await docRepo.findDocumentById(documentId);

  if (!doc || doc.userId !== userId) {
    throw new NotFoundError("Document not found");
  }

  if (doc.status !== "PROCESSED") {
    throw new NotFoundError(
      "Document is not ready yet",
    );
  }

  const chunks =
    await docRepo.listChunksByDocument(documentId);

  const text = chunks
    .map((c) => c.content)
    .join("\n\n")
    .slice(0, 30_000);

  return runDocumentTask("keypoints", text);
}

export async function generateFlashcards(
  userId: string,
  documentId: string,
) {
  const doc =
    await docRepo.findDocumentById(documentId);

  if (!doc || doc.userId !== userId) {
    throw new NotFoundError("Document not found");
  }

  if (doc.status !== "PROCESSED") {
    throw new NotFoundError(
      "Document is not ready yet",
    );
  }

  const chunks =
    await docRepo.listChunksByDocument(documentId);

  const text = chunks
    .map((c) => c.content)
    .join("\n\n")
    .slice(0, 30_000);

  return runFlashcards(text);
}

export async function generateQuiz(
  userId: string,
  documentId: string,
) {
  const doc =
    await docRepo.findDocumentById(documentId);

  if (!doc || doc.userId !== userId) {
    throw new NotFoundError("Document not found");
  }

  if (doc.status !== "PROCESSED") {
    throw new NotFoundError(
      "Document is not ready yet",
    );
  }

  const chunks =
    await docRepo.listChunksByDocument(documentId);

  const text = chunks
    .map((c) => c.content)
    .join("\n\n")
    .slice(0, 30_000);

  return runQuiz(text);
}