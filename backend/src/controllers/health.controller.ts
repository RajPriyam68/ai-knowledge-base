import type { Request, Response } from "express";
import { asyncHandler } from "../utils/errors.js";
import { prisma } from "../config/database.js";

export const healthCheck = asyncHandler(
  async (_req: Request, res: Response) => {
    res.status(200).json({
      status: "ok",
      service: "ai-knowledge-base-api",
      version: "1.0.0",
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
    });
  },
);

export const readinessCheck = asyncHandler(
  async (_req: Request, res: Response) => {
    const started = Date.now();

    try {
      await prisma.$queryRaw`SELECT 1`;

      res.status(200).json({
        status: "ok",
        service: "ai-knowledge-base-api",
        version: "1.0.0",
        uptime: process.uptime(),
        database: "ok",
        latencyMs: Date.now() - started,
        timestamp: new Date().toISOString(),
      });
    } catch (err) {
      const error = err instanceof Error ? err.message : "unknown";

      res.status(503).json({
        status: "degraded",
        service: "ai-knowledge-base-api",
        version: "1.0.0",
        uptime: process.uptime(),
        database: "error",
        error,
        latencyMs: Date.now() - started,
        timestamp: new Date().toISOString(),
      });
    }
  },
);