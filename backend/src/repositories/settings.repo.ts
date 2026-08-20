import { prisma } from "../config/database.js";

export async function getSetting<T>(key: string, fallback: T): Promise<T> {
  const row = await prisma.setting.findUnique({ where: { key } });
  if (!row) return fallback;
  return (row.value as T) ?? fallback;
}

export async function setSetting(key: string, value: unknown, description?: string) {
  return prisma.setting.upsert({
    where: { key },
    update: { value: value as object, description },
    create: { key, value: value as object, description },
  });
}

export async function listSettings() {
  return prisma.setting.findMany({ orderBy: { key: "asc" } });
}

export async function deleteSetting(key: string) {
  return prisma.setting.delete({ where: { key } });
}
