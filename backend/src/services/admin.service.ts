import { BadRequestError, NotFoundError } from "../utils/errors.js";
import * as userRepo from "../repositories/user.repo.js";
import * as sessionRepo from "../repositories/session.repo.js";
import * as analyticsRepo from "../repositories/analytics.repo.js";
import * as apiUsageRepo from "../repositories/api-usage.repo.js";
import * as settingsRepo from "../repositories/settings.repo.js";
import { listSystemLogs, clearSystemLogs } from "../repositories/system-log.repo.js";
import { getStorageUsage } from "../storage/file.storage.js";
import { trackEvent } from "../repositories/analytics.repo.js";
import { env, isProduction } from "../config/env.js";
import { countKnowledgeBases } from "../repositories/kb.repo.js";
import { countDocuments, aggregateDocuments } from "../repositories/document.repo.js";
import { countChats } from "../repositories/chat.repo.js";
import { logToDb } from "../config/logger.js";
import { hasGeminiKey } from "../ai/llm/llm.provider.js";
import { isModelReady } from "../ai/embeddings/embedding.service.js";
import { DEFAULT_PROMPTS, getPrompts } from "../ai/prompts/prompts.js";
import { prisma } from "../config/database.js";

export async function adminListUsers(params: {
  page: number;
  pageSize: number;
  search?: string;
  role?: string;
  status?: string;
}) {
  return userRepo.listUsers(params);
}

export async function adminUpdateUser(actorId: string, userId: string, data: {
  role?: string;
  isSuspended?: boolean;
  suspendReason?: string | null;
}) {
  const user = await userRepo.findUserById(userId);
  if (!user) throw new NotFoundError("User not found");
  if (user.id === actorId && (data.role === "USER" || data.isSuspended === true)) {
    throw new BadRequestError("You cannot demote or suspend your own account");
  }

  const updateData: Record<string, unknown> = {};
  if (data.role && data.role !== user.role) {
    updateData.role = data.role;
  }
  if (data.isSuspended !== undefined && data.isSuspended !== user.isSuspended) {
    updateData.isSuspended = data.isSuspended;
    updateData.suspendReason = data.isSuspended ? (data.suspendReason ?? "Suspended by administrator") : null;
    if (data.isSuspended) {
      await sessionRepo.revokeUserSessions(userId);
    }
  }
  if (Object.keys(updateData).length === 0) return user;

  const updated = await userRepo.updateUser(userId, updateData as never);
  await trackEvent("admin.user.update", actorId, { userId, changes: updateData });
  logToDb("info", `Admin updated user ${userId}`, { actorId, changes: updateData });
  return updated;
}

export async function adminDeleteUser(actorId: string, userId: string) {
  const user = await userRepo.findUserById(userId);
  if (!user) throw new NotFoundError("User not found");
  if (user.id === actorId) {
    throw new BadRequestError("You cannot delete your own account");
  }
  await sessionRepo.revokeUserSessions(userId);
  await userRepo.deleteUser(userId);
  await trackEvent("admin.user.delete", actorId, { userId });
  logToDb("info", `Admin deleted user ${userId}`, { actorId });
}

export async function adminLogs(params: {
  page: number;
  pageSize: number;
  level?: string;
  search?: string;
}) {
  return listSystemLogs(params);
}

export async function adminClearLogs(days: number) {
  const removed = await clearSystemLogs(days);
  return { removed };
}

export async function adminAnalytics() {
  const summary = await analyticsRepo.getAnalyticsSummary();
  const storage = await getStorageUsage();
  const storageByUser = await apiUsageRepo.storageByUser();
  const apiTotals = await apiUsageRepo.apiUsageTotals(7);
  return {
    ...summary,
    storage: {
      onDiskBytes: storage.bytes,
      onDiskFiles: storage.fileCount,
      trackedBytes: summary.totalStorageBytes,
    },
    storageByUser,
    apiTotals,
  };
}

export async function adminApiUsage(params: {
  page: number;
  pageSize: number;
  search?: string;
  from?: Date;
  to?: Date;
}) {
  return apiUsageRepo.listApiUsage(params);
}

export async function adminSettings() {
  const settings = await settingsRepo.listSettings();
  return settings.map((s) => ({
    key: s.key,
    value: s.value,
    description: s.description,
    updatedAt: s.updatedAt,
  }));
}

export async function adminSetSetting(actorId: string, key: string, value: unknown, description?: string) {
  if (key === "ai.model" || key === "ai.temperature") {
    const user = await userRepo.findUserById(actorId);
    if (!user || user.role !== "ADMIN") {
      throw new BadRequestError("Only admins may change AI configuration");
    }
  }
  const setting = await settingsRepo.setSetting(key, value, description);
  await trackEvent("admin.settings.update", actorId, { key });
  return setting;
}

export async function adminDeleteSetting(key: string) {
  try {
    await settingsRepo.deleteSetting(key);
  } catch {
    throw new NotFoundError("Setting not found");
  }
}

export async function adminAiConfig() {
  const [model, temperature, storage] = await Promise.all([
    settingsRepo.getSetting<string>("ai.model", env.GEMINI_MODEL),
    settingsRepo.getSetting<number>("ai.temperature", env.GEMINI_TEMPERATURE),
    getStorageUsage(),
  ]);
  return {
    model,
    temperature,
    provider: hasGeminiKey() ? "gemini" : "offline",
    apiKeyConfigured: hasGeminiKey(),
    maxTokens: env.GEMINI_MAX_TOKENS,
    embeddingModel: env.EMBEDDING_MODEL,
    embeddingReady: await isModelReady().catch(() => false),
    storage,
  };
}

export async function adminUpdateAiConfig(actorId: string, data: { model?: string; temperature?: number }) {
  if (data.model) await settingsRepo.setSetting("ai.model", data.model, "Active LLM model name");
  if (data.temperature !== undefined) {
    await settingsRepo.setSetting("ai.temperature", data.temperature, "LLM sampling temperature");
  }
  await trackEvent("admin.ai_config.update", actorId, data);
  return adminAiConfig();
}

export async function adminPrompts() {
  return getPrompts();
}

export async function adminUpdatePrompts(actorId: string, data: Partial<Record<keyof typeof DEFAULT_PROMPTS, string>>) {
  for (const [key, value] of Object.entries(data)) {
    if (value !== undefined && key in DEFAULT_PROMPTS) {
      await settingsRepo.setSetting(`prompt.${key}`, value, `Prompt template: ${key}`);
    }
  }
  await trackEvent("admin.prompts.update", actorId, { keys: Object.keys(data) });
  return getPrompts();
}

export async function adminResetPrompts() {
  for (const key of Object.keys(DEFAULT_PROMPTS)) {
    await settingsRepo.setSetting(`prompt.${key}`, DEFAULT_PROMPTS[key as keyof typeof DEFAULT_PROMPTS]);
  }
  return getPrompts();
}

export async function adminStats() {
  const [users, kbs, docs, chats, apiCalls] = await Promise.all([
    userRepo.countUsers(),
    countKnowledgeBases(),
    countDocuments(),
    countChats(),
    prisma.apiUsage.count(),
  ]);
  const docAgg = await aggregateDocuments();
  return {
    users,
    knowledgeBases: kbs,
    documents: docs,
    chats,
    apiCalls,
    totalStorageBytes: docAgg.totalSize,
    environment: env.NODE_ENV,
    production: isProduction,
    geminiEnabled: hasGeminiKey(),
  };
}

export async function adminHealth() {
  let dbOk = false;
  let dbLatencyMs = 0;
  try {
    const started = Date.now();
    await prisma.$queryRaw`SELECT 1`;
    dbLatencyMs = Date.now() - started;
    dbOk = true;
  } catch {
    dbOk = false;
  }
  return {
    status: dbOk ? "healthy" : "degraded",
    uptimeSeconds: Math.floor(process.uptime()),
    timestamp: new Date().toISOString(),
    database: { ok: dbOk, latencyMs: dbLatencyMs },
    ai: {
      provider: hasGeminiKey() ? "gemini" : "offline",
      configured: hasGeminiKey(),
      model: env.GEMINI_MODEL,
    },
    storage: await getStorageUsage(),
    memory: {
      heapUsedMB: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
      rssMB: Math.round(process.memoryUsage().rss / 1024 / 1024),
    },
  };
}
