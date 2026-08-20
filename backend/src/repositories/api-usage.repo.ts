import { prisma } from "../config/database.js";
import type { Prisma } from "@prisma/client";

export async function listApiUsage(params: {
  page: number;
  pageSize: number;
  search?: string;
  from?: Date;
  to?: Date;
}) {
  const { page, pageSize, search, from, to } = params;
  const where: Prisma.ApiUsageWhereInput = {};
  if (search) where.endpoint = { contains: search };
  if (from || to) {
    where.createdAt = {};
    if (from) where.createdAt.gte = from;
    if (to) where.createdAt.lte = to;
  }

  const [total, items] = await Promise.all([
    prisma.apiUsage.count({ where }),
    prisma.apiUsage.findMany({
      where,
      include: { user: { select: { id: true, email: true, name: true } } },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
  ]);

  return { total, page, pageSize, items };
}

export async function apiUsageTotals(periodDays: number) {
  const since = new Date(Date.now() - periodDays * 24 * 60 * 60 * 1000);
  const [calls, byEndpoint, avgDuration, failures] = await Promise.all([
    prisma.apiUsage.count({ where: { createdAt: { gte: since } } }),
    prisma.$queryRaw<{ endpoint: string; count: bigint; avg_ms: number }[]>`
      SELECT endpoint, COUNT(*)::bigint AS count, AVG("durationMs")::float AS avg_ms
      FROM "ApiUsage"
      WHERE "createdAt" >= ${since}
      GROUP BY endpoint ORDER BY count DESC
    `,
    prisma.$queryRaw<{ avg_ms: number }[]>`
      SELECT AVG("durationMs")::float AS avg_ms FROM "ApiUsage" WHERE "createdAt" >= ${since}
    `,
    prisma.apiUsage.count({ where: { createdAt: { gte: since }, statusCode: { gte: 500 } } }),
  ]);
  return {
    calls,
    failures,
    avgDurationMs: Math.round(avgDuration[0]?.avg_ms ?? 0),
    byEndpoint: byEndpoint.map((e) => ({
      endpoint: e.endpoint,
      count: Number(e.count),
      avgDurationMs: Math.round(e.avg_ms),
    })),
  };
}

export async function storageByUser() {
  const rows = await prisma.$queryRaw<{
    userId: string;
    email: string;
    name: string;
    documents: bigint;
    bytes: bigint;
  }[]>`
    SELECT u.id AS "userId", u.email, u.name,
           COUNT(d.id)::bigint AS documents,
           COALESCE(SUM(d.size), 0)::bigint AS bytes
    FROM "User" u
    LEFT JOIN "Document" d ON d."userId" = u.id
    GROUP BY u.id, u.email, u.name
    ORDER BY bytes DESC
    LIMIT 20
  `;
  return rows.map((r) => ({
    userId: r.userId,
    email: r.email,
    name: r.name,
    documents: Number(r.documents),
    bytes: Number(r.bytes),
  }));
}
