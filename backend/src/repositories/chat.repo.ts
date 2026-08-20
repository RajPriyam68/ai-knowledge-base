import { prisma } from "../config/database.js";
import type { Prisma } from "@prisma/client";

export interface ChatListItem {
  id: string;
  userId: string;
  kbId: string | null;
  title: string;
  createdAt: Date;
  updatedAt: Date;
  kb?: { id: string; name: string } | null;
  messageCount?: number;
}

export async function createChat(data: { userId: string; kbId?: string; title: string }) {
  return prisma.chat.create({ data });
}

export async function findChatById(id: string) {
  return prisma.chat.findUnique({ where: { id } });
}

export async function listChats(userId: string, search?: string) {
  const where: Prisma.ChatWhereInput = { userId };
  if (search) {
    where.title = { contains: search, mode: "insensitive" };
  }
  const items = await prisma.chat.findMany({
    where,
    include: {
      kb: { select: { id: true, name: true } },
      _count: { select: { messages: true } },
    },
    orderBy: { updatedAt: "desc" },
    take: 200,
  });
  return items;
}

export async function updateChatTitle(id: string, title: string) {
  return prisma.chat.update({ where: { id }, data: { title } });
}

export async function deleteChat(id: string) {
  return prisma.chat.delete({ where: { id } });
}

export async function touchChat(id: string) {
  return prisma.chat.update({ where: { id }, data: {} });
}

export async function countChats(where?: Prisma.ChatWhereInput) {
  return prisma.chat.count({ where });
}

export async function listMessagesByChat(chatId: string, limit = 200) {
  return prisma.message.findMany({
    where: { chatId },
    orderBy: { createdAt: "asc" },
    take: limit,
  });
}

export async function createMessage(data: {
  chatId: string;
  userId: string;
  role: string;
  content: string;
  citations?: unknown;
  documentIds?: string[];
}) {
  const { chatId, userId, role, content } = data;
  return prisma.message.create({
    data: {
      chatId,
      userId,
      role,
      content,
      citations: data.citations as Prisma.InputJsonValue | undefined,
      documentIds: data.documentIds ? (data.documentIds as Prisma.InputJsonValue) : undefined,
    },
  });
}

export async function getRecentUserMessages(userId: string, chatId: string, limit = 8) {
  return prisma.message.findMany({
    where: { chatId, userId },
    orderBy: { createdAt: "desc" },
    take: limit,
  });
}
