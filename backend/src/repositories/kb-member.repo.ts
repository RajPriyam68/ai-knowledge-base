import { prisma } from "../config/database.js";

export async function findKbMemberRole(
  kbId: string,
  userId: string,
) {
  const member = await prisma.knowledgeBaseMember.findUnique({
    where: {
      kbId_userId: {
        kbId,
        userId,
      },
    },
    select: {
      role: true,
    },
  });

  return member?.role ?? null;
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
export async function listKbMembers(kbId: string) {
  return prisma.knowledgeBaseMember.findMany({
    where: { kbId },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
          avatarUrl: true,
        },
      },
    },
    orderBy: {
      createdAt: "asc",
    },
  });
}
export async function removeKbMember(
  kbId: string,
  userId: string,
) {
  return prisma.knowledgeBaseMember.delete({
    where: {
      kbId_userId: {
        kbId,
        userId,
      },
    },
  });
}
export async function updateKbMemberRole(
  kbId: string,
  userId: string,
  role: "EDITOR" | "VIEWER",
) {
  return prisma.knowledgeBaseMember.update({
    where: {
      kbId_userId: {
        kbId,
        userId,
      },
    },
    data: {
      role,
    },
  });
}