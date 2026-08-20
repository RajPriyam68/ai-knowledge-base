import { prisma } from "../config/database.js";

export async function recordSystemLog(
  level: string,
  message: string,
  meta?: Record<string, unknown>,
) {
  try {
    await prisma.systemLog.create({
      data: { level, message, meta: meta ? (meta as object) : undefined },
    });
  } catch (error) {
    console.error("[SystemLog] failed to persist log:", error);
  }
}

export interface SystemLogQuery {
  level?: string;
  search?: string;
  page: number;
  pageSize: number;
}

export async function listSystemLogs(query: SystemLogQuery) {
  const { level, search, page, pageSize } = query;
  const where: Record<string, unknown> = {};
  if (level) where.level = level;
  if (search) {
    where.message = { contains: search, mode: "insensitive" };
  }

  const [total, items] = await Promise.all([
    prisma.systemLog.count({ where }),
    prisma.systemLog.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
  ]);

  return { total, page, pageSize, items };
}

export async function clearSystemLogs(olderThanDays: number) {
  const cutoff = new Date(Date.now() - olderThanDays * 24 * 60 * 60 * 1000);
  const result = await prisma.systemLog.deleteMany({ where: { createdAt: { lt: cutoff } } });
  return result.count;
}
