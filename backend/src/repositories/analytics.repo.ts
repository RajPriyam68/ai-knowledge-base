import { prisma } from "../config/database.js";

export async function trackEvent(
  event: string,
  userId?: string,
  metadata?: Record<string, unknown>,
) {
  try {
    await prisma.analyticsEvent.create({
      data: {
        event,
        userId: userId ?? null,
        metadata: metadata ? (metadata as object) : undefined,
      },
    });
  } catch {
    // analytics must never break the request path
  }
}

export async function trackApiUsage(data: {
  userId?: string;
  endpoint: string;
  method: string;
  statusCode: number;
  durationMs: number;
  model?: string;
  tokensIn?: number;
  tokensOut?: number;
}) {
  try {
    await prisma.apiUsage.create({
      data: {
        userId: data.userId ?? null,
        endpoint: data.endpoint,
        method: data.method,
        statusCode: data.statusCode,
        durationMs: data.durationMs,
        model: data.model,
        tokensIn: data.tokensIn,
        tokensOut: data.tokensOut,
      },
    });
  } catch {
    // never break the request path
  }
}

export interface AnalyticsSummary {
  totalUsers: number;
  newUsers7d: number;
  totalKnowledgeBases: number;
  totalDocuments: number;
  totalChats: number;
  totalMessages: number;
  totalChunks: number;
  totalStorageBytes: number;
  totalApiCalls: number;
  aiCalls7d: number;
  usersByRole: { role: string; count: number }[];
  events7d: { date: string; count: number }[];
  popularEndpoints: { endpoint: string; count: number }[];
  documentsByDay: { date: string; count: number }[];
}

export async function getAnalyticsSummary(): Promise<AnalyticsSummary> {
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

  const [
    totalUsers,
    newUsers7d,
    totalKnowledgeBases,
    totalDocuments,
    totalChats,
    totalMessages,
    chunksAgg,
    storageAgg,
    totalApiCalls,
    aiCalls7d,
    usersByRole,
    events7d,
    popularEndpoints,
    documentsByDay,
  ] = await Promise.all([
    prisma.user.count(),
    prisma.user.count({ where: { createdAt: { gte: sevenDaysAgo } } }),
    prisma.knowledgeBase.count(),
    prisma.document.count(),
    prisma.chat.count(),
    prisma.message.count(),
    prisma.$queryRaw<{ count: bigint }[]>`
      SELECT COUNT(*)::bigint AS count FROM "DocumentChunk"
    `,
    prisma.document.aggregate({ _sum: { size: true } }),
    prisma.apiUsage.count(),
    prisma.apiUsage.count({
      where: { createdAt: { gte: sevenDaysAgo }, endpoint: { contains: "/chat" } },
    }),
    prisma.user.groupBy({ by: ["role"], _count: true }),
    prisma.$queryRaw<{ date: string; count: bigint }[]>`
      SELECT to_char("createdAt", 'YYYY-MM-DD') AS date, COUNT(*)::bigint AS count
      FROM "AnalyticsEvent"
      WHERE "createdAt" >= ${sevenDaysAgo}
      GROUP BY date ORDER BY date ASC
    `,
    prisma.$queryRaw<{ endpoint: string; count: bigint }[]>`
      SELECT endpoint, COUNT(*)::bigint AS count
      FROM "ApiUsage"
      WHERE "createdAt" >= ${sevenDaysAgo}
      GROUP BY endpoint ORDER BY count DESC LIMIT 10
    `,
    prisma.$queryRaw<{ date: string; count: bigint }[]>`
      SELECT to_char("createdAt", 'YYYY-MM-DD') AS date, COUNT(*)::bigint AS count
      FROM "Document"
      WHERE "createdAt" >= ${sevenDaysAgo}
      GROUP BY date ORDER BY date ASC
    `,
  ]);

  return {
    totalUsers,
    newUsers7d,
    totalKnowledgeBases,
    totalDocuments,
    totalChats,
    totalMessages,
    totalChunks: Number(chunksAgg[0]?.count ?? 0),
    totalStorageBytes: storageAgg._sum.size ?? 0,
    totalApiCalls,
    aiCalls7d: Number(aiCalls7d),
    usersByRole: usersByRole.map((r) => ({ role: r.role, count: r._count })),
    events7d: events7d.map((e) => ({ date: e.date, count: Number(e.count) })),
    popularEndpoints: popularEndpoints.map((e) => ({
      endpoint: e.endpoint,
      count: Number(e.count),
    })),
    documentsByDay: documentsByDay.map((e) => ({ date: e.date, count: Number(e.count) })),
  };
}
