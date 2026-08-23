import { NotFoundError } from "../utils/errors.js";
import * as kbRepo from "../repositories/kb.repo.js";
import { deleteDocumentsByKb, listDocumentsByKb } from "../repositories/document.repo.js";
import { deleteChunksByKb } from "../repositories/embedding.repo.js";
import { trackEvent } from "../repositories/analytics.repo.js";
import { getStorageUsage } from "../storage/file.storage.js";
import { logToDb } from "../config/logger.js";
import { findKbMemberRole } from "../repositories/kb-member.repo.js";

export async function createKb(
  userId: string,
  data: {
    name: string;
    description?: string;
    icon?: string;
    color?: string;
    visibility?: "PRIVATE" | "SHARED" | "PUBLIC";
  }
) {
  const kb = await kbRepo.createKnowledgeBase({
    userId,
    name: data.name,
    description: data.description,
    icon: data.icon,
    color: data.color,
    visibility: data.visibility,
  });

  await kbRepo.createKbMember({
    kbId: kb.id,
    userId,
    role: "OWNER",
  });

  await trackEvent("kb.create", userId, { kbId: kb.id });

  return kb;
}

export async function listKbs(
  userId: string,
  options?: {
    search?: string;
    visibility?: "PRIVATE" | "SHARED" | "PUBLIC";
    archived?: boolean;
    sort?: "updated_desc" | "name_asc" | "name_desc";
  },
) {
  return kbRepo.listKnowledgeBases(userId, options);
}

export async function getKb(userId: string, kbId: string) {
  const kb = await kbRepo.findKnowledgeBaseById(kbId);

if (!kb) {
  throw new NotFoundError("Knowledge base not found");
}

if (kb.userId !== userId) {
  const memberRole = await findKbMemberRole(kbId, userId);

  if (!memberRole) {
    throw new NotFoundError("Knowledge base not found");
  }
}
  const documents = await listDocumentsByKb(kbId, userId);
  const storage = await getStorageUsage();
  return { ...kb, documents, totalSize: documents.reduce((sum, d) => sum + d.size, 0), storage };
}

export async function updateKb(
  userId: string,
  kbId: string,
  data: {
    name?: string;
    description?: string | null;
    icon?: string;
    color?: string;
    visibility?: "PRIVATE" | "SHARED" | "PUBLIC";
  }
) {
  const kb = await kbRepo.findKnowledgeBaseById(kbId);

  if (!kb || kb.userId !== userId) {
    throw new NotFoundError("Knowledge base not found");
  }

  const updated = await kbRepo.updateKnowledgeBase(kbId, {
    name: data.name,
    description: data.description ?? undefined,

    icon: data.icon,
    color: data.color,
    visibility: data.visibility,
  });

  await trackEvent("kb.update", userId, { kbId });

  return updated;
}
export async function archiveKb(userId: string, id: string) {
  const result = await kbRepo.archiveKnowledgeBase(userId, id);

  if (result.count === 0) {
    throw new Error("Knowledge base not found");
  }

  return { success: true };
}

export async function restoreKb(userId: string, id: string) {
  const result = await kbRepo.restoreKnowledgeBase(userId, id);

  if (result.count === 0) {
    throw new Error("Knowledge base not found");
  }

  return { success: true };
}
export async function deleteKb(userId: string, kbId: string) {
  const kb = await kbRepo.findKnowledgeBaseById(kbId);
  if (!kb || kb.userId !== userId) {
    throw new NotFoundError("Knowledge base not found");
  }
  await deleteChunksByKb(kbId);
  await deleteDocumentsByKb(kbId);
  await kbRepo.deleteKnowledgeBase(kbId);
  await trackEvent("kb.delete", userId, { kbId });
  logToDb("info", `Knowledge base deleted: ${kbId}`, { userId });
}

export async function getKbStats(userId: string) {
  return kbRepo.getKbStats(userId);
}
export async function getKnowledgeBaseStats(
  userId: string,
  kbId: string,
) {
  return kbRepo.getKnowledgeBaseStats(userId, kbId);
}