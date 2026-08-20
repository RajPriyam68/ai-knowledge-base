import { prisma } from "../config/database.js";
import type { Prisma } from "@prisma/client";

export async function createDocument(data: {
  kbId: string;
  userId: string;
  filename: string;
  originalName: string;
  mimeType: string;
  extension: string;
  size: number;
  storagePath: string;
}) {
  return prisma.document.create({ data });
}

export async function findDocumentById(id: string) {
  return prisma.document.findUnique({ where: { id } });
}

export async function listDocumentsByKb(kbId: string, userId: string) {
  return prisma.document.findMany({
    where: { kbId, userId },
    include: { _count: { select: { chunks: true } } },
    orderBy: { createdAt: "desc" },
  });
}

export async function listDocumentsByUser(userId: string, search?: string) {
  const where: Prisma.DocumentWhereInput = { userId };
  if (search) {
    where.originalName = { contains: search, mode: "insensitive" };
  }
  return prisma.document.findMany({
    where,
    include: {
      kb: { select: { id: true, name: true } },
      _count: { select: { chunks: true } },
    },
    orderBy: { createdAt: "desc" },
  });
}

export async function updateDocument(
  id: string,
  data: Partial<{
    filename: string;
    originalName: string;
    status: string;
    errorMessage: string | null;
    chunkCount: number;
  }>,
) {
  return prisma.document.update({ where: { id }, data });
}

export async function deleteDocument(id: string) {
  return prisma.document.delete({ where: { id } });
}

export async function deleteDocumentsByKb(kbId: string) {
  return prisma.document.deleteMany({ where: { kbId } });
}

export async function countDocuments(where?: Prisma.DocumentWhereInput) {
  return prisma.document.count({ where });
}

export async function aggregateDocuments(where?: Prisma.DocumentWhereInput) {
  const agg = await prisma.document.aggregate({
    where,
    _sum: { size: true },
    _count: true,
  });
  return { count: agg._count, totalSize: agg._sum.size ?? 0 };
}

export async function listChunksByDocument(documentId: string) {
  return prisma.documentChunk.findMany({
    where: { documentId },
    orderBy: { chunkIndex: "asc" },
  });
}
