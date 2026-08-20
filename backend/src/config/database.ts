import { PrismaClient } from "@prisma/client";
import { env } from "./env.js";

declare global {
  var __prisma: PrismaClient | undefined;
}

function createClient(): PrismaClient {
  const client = new PrismaClient({
    log: env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
  });
  return client;
}

export const prisma: PrismaClient = globalThis.__prisma ?? createClient();

if (env.NODE_ENV !== "production") {
  globalThis.__prisma = prisma;
}
