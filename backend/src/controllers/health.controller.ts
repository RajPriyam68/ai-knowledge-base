import type { Request, Response } from "express";
import { asyncHandler } from "../utils/errors.js";
import { prisma } from "../config/database.js";

export const healthCheck = asyncHandler(async (_req: Request, res: Response) => {
  const started = Date.now();
  let database = "ok";
  let error: string | null = null;
  try {
    await prisma.$queryRaw`SELECT 1`;
  } catch (err) {
    database = "error";
    error = err instanceof Error ? err.message : "unknown";
  }
  res.status(database === "ok" ? 200 : 503).json({
    status: database === "ok" ? "ok" : "degraded",
    service: "ai-knowledge-base-api",
    version: "1.0.0",
    uptime: process.uptime(),
    database,
    ...(error ? { error } : {}),
    latencyMs: Date.now() - started,
    timestamp: new Date().toISOString(),
  });
});
