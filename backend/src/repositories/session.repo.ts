import { prisma } from "../config/database.js";

export async function createSession(data: {
  userId: string;
  tokenHash: string;
  userAgent?: string;
  ip?: string;
  expiresAt: Date;
}) {
  return prisma.session.create({ data });
}

export async function findSessionByTokenHash(tokenHash: string) {
  return prisma.session.findUnique({ where: { tokenHash } });
}

export async function revokeSession(id: string) {
  return prisma.session.update({
    where: { id },
    data: { revokedAt: new Date() },
  });
}

export async function revokeUserSessions(userId: string, exceptSessionId?: string) {
  return prisma.session.updateMany({
    where: {
      userId,
      revokedAt: null,
      ...(exceptSessionId ? { id: { not: exceptSessionId } } : {}),
    },
    data: { revokedAt: new Date() },
  });
}

export async function deleteExpiredSessions() {
  const result = await prisma.session.deleteMany({
    where: { expiresAt: { lt: new Date() } },
  });
  return result.count;
}
