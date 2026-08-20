import { prisma } from "../config/database.js";
import type { Prisma } from "@prisma/client";

export async function createKnowledgeBase(data: {
  userId: string;
  name: string;
  description?: string;
  icon?: string;
  color?: string;
  visibility?: "PRIVATE" | "SHARED" | "PUBLIC";
}) {
  return prisma.knowledgeBase.create({ data });
}

export async function findKnowledgeBaseById(id: string) {
  return prisma.knowledgeBase.findUnique({ where: { id } });
}

export async function listKnowledgeBases(
  userId: string,
  options?: {
    search?: string;
    visibility?: "PRIVATE" | "SHARED" | "PUBLIC";
    archived?: boolean;
    sort?: "updated_desc" | "name_asc" | "name_desc";
  },
) {
  const where: Prisma.KnowledgeBaseWhereInput = {
    userId,
    isArchived: options?.archived ?? false,
  };

  if (options?.search?.trim()) {
    where.name = {
      contains: options.search.trim(),
      mode: "insensitive",
    };
  }

  if (options?.visibility) {
    where.visibility = options.visibility;
  }

  const items = await prisma.knowledgeBase.findMany({
    where,
    include: {
      _count: {
        select: {
          documents: true,
          chats: true,
        },
      },
    },
    orderBy:
  options?.sort === "name_asc"
    ? { name: "asc" }
    : options?.sort === "name_desc"
      ? { name: "desc" }
      : { updatedAt: "desc" },
  });

  const processed = await Promise.all(
    items.map(async (kb) => {
      const sum = await prisma.document.aggregate({
        where: {
          kbId: kb.id,
        },
        _sum: {
          size: true,
        },
      });

      return {
        ...kb,
        totalSize: sum._sum.size ?? 0,
      };
    }),
  );

  return processed;
}

export async function updateKnowledgeBase(
  id: string,
  data: {
    name?: string;
    description?: string;
    icon?: string;
    color?: string;
    visibility?: "PRIVATE" | "SHARED" | "PUBLIC";
  }
) {
  return prisma.knowledgeBase.update({
    where: { id },
    data,
  });
}
export async function archiveKnowledgeBase(
  userId: string,
  id: string,
) {
  return prisma.knowledgeBase.updateMany({
    where: {
      id,
      userId,
      isArchived: false,
    },
    data: {
      isArchived: true,
    },
  });
}

export async function restoreKnowledgeBase(
  userId: string,
  id: string,
) {
  return prisma.knowledgeBase.updateMany({
    where: {
      id,
      userId,
      isArchived: true,
    },
    data: {
      isArchived: false,
    },
  });
}
export async function deleteKnowledgeBase(id: string) {
  return prisma.knowledgeBase.delete({ where: { id } });
}

export async function countKnowledgeBases(where?: Prisma.KnowledgeBaseWhereInput) {
  return prisma.knowledgeBase.count({ where });
}

export async function getKbStats(userId: string) {
  const [kbs, docs] = await Promise.all([
    prisma.knowledgeBase.count({ where: { userId } }),
    prisma.document.aggregate({
      where: { userId },
      _sum: { size: true },
      _count: true,
    }),
  ]);
  return {
    knowledgeBases: kbs,
    documents: docs._count,
    totalStorageBytes: docs._sum.size ?? 0,
  };
}
export async function getKnowledgeBaseStats(
  userId: string,
  kbId: string,
) {
  const kb = await prisma.knowledgeBase.findFirst({
    where: {
      id: kbId,
      userId,
    },
    select: {
      id: true,
      name: true,
      _count: {
        select: {
          documents: true,
          chats: true,
          chunks: true,
        },
      },
    },
  });

  
  if (!kb) {
    return null;
  }


  const storage = await prisma.document.aggregate({
    where: {
      kbId,
      userId,
    },
    _sum: {
      size: true,
    },
  });

  return {
    id: kb.id,
    name: kb.name,
    documents: kb._count.documents,
    chats: kb._count.chats,
    chunks: kb._count.chunks,
    totalStorageBytes: storage._sum.size ?? 0,
  };
}
export async function createKbMember(data: {
  kbId: string;
  userId: string;
  role: "OWNER" | "EDITOR" | "VIEWER";
}) {
  return prisma.knowledgeBaseMember.create({
    data: {
      kbId: data.kbId,
      userId: data.userId,
      role: data.role,
    },
  });
}