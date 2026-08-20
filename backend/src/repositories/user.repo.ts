import { prisma } from "../config/database.js";
import type { Prisma } from "@prisma/client";

const publicUserSelect = {
  id: true,
  email: true,
  name: true,
  avatarUrl: true,
  role: true,
  isEmailVerified: true,
  isSuspended: true,
  suspendReason: true,
  lastLoginAt: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.UserSelect;

export async function findUserByEmail(email: string) {
  return prisma.user.findUnique({ where: { email: email.toLowerCase() } });
}

export async function findUserById(id: string) {
  return prisma.user.findUnique({ where: { id } });
}

export async function createUser(data: {
  email: string;
  passwordHash: string;
  name: string;
  role?: string;
}) {
  return prisma.user.create({
    data: {
      email: data.email.toLowerCase(),
      passwordHash: data.passwordHash,
      name: data.name,
      role: data.role ?? "USER",
    },
    select: publicUserSelect,
  });
}

export async function updateUser(
  id: string,
  data: Partial<{
    name: string;
    avatarUrl: string | null;
    passwordHash: string;
    isEmailVerified: boolean;
    emailVerifiedAt: Date | null;
    emailVerificationTokenHash: string | null;
    resetPasswordTokenHash: string | null;
    resetPasswordExpiresAt: Date | null;
    isSuspended: boolean;
    suspendReason: string | null;
    role: string;
    lastLoginAt: Date;
    passwordChangedAt: Date;
  }>,
) {
  return prisma.user.update({
    where: { id },
    data,
    select: publicUserSelect,
  });
}

export async function listUsers(params: {
  page: number;
  pageSize: number;
  search?: string;
  role?: string;
  status?: string;
}) {
  const { page, pageSize, search, role, status } = params;
  const where: Prisma.UserWhereInput = {};
  if (search) {
    where.OR = [
      { name: { contains: search, mode: "insensitive" } },
      { email: { contains: search, mode: "insensitive" } },
    ];
  }
  if (role) where.role = role;
  if (status === "suspended") where.isSuspended = true;
  if (status === "active") where.isSuspended = false;

  const [total, users] = await Promise.all([
    prisma.user.count({ where }),
    prisma.user.findMany({
      where,
      select: {
        ...publicUserSelect,
        _count: {
          select: { knowledgeBases: true, documents: true, chats: true, sessions: true },
        },
      },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
  ]);

  return { total, page, pageSize, items: users };
}

export async function updateUserByEmail(email: string, data: Prisma.UserUpdateInput) {
  return prisma.user.update({ where: { email: email.toLowerCase() }, data });
}

export async function findAllByResetToken(tokenHash: string) {
  return prisma.user.findMany({ where: { resetPasswordTokenHash: tokenHash } });
}

export async function findByVerificationToken(tokenHash: string) {
  return prisma.user.findFirst({ where: { emailVerificationTokenHash: tokenHash } });
}

export async function countUsers(where?: Prisma.UserWhereInput) {
  return prisma.user.count({ where });
}

export async function deleteUser(id: string) {
  return prisma.user.delete({ where: { id } });
}
