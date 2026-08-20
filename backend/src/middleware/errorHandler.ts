import type { NextFunction, Request, Response } from "express";
import { AppError } from "../utils/errors.js";
import { env } from "../config/env.js";
import { logger, logToDb } from "../config/logger.js";
import { trackApiUsage } from "../repositories/analytics.repo.js";

export function notFoundHandler(_req: Request, res: Response) {
  res.status(404).json({
    success: false,
    error: { code: "NOT_FOUND", message: "Route not found" },
  });
}

export async function errorHandler(
  error: unknown,
  req: Request,
  res: Response,
  _next: NextFunction,
) {
  let statusCode = 500;
  let code = "INTERNAL_ERROR";
  let message = "Internal server error";
  let details: unknown;

  if (error instanceof AppError) {
    statusCode = error.statusCode;
    code = error.code;
    message = error.message;
    details = error.details;
  } else if (error instanceof SyntaxError && "body" in error) {
    statusCode = 400;
    code = "INVALID_JSON";
    message = "Invalid JSON payload";
  } else {
    logger.error(`[Error] ${req.method} ${req.originalUrl}`, error);
  }

  if (statusCode >= 500) {
    logToDb("error", `${req.method} ${req.originalUrl}: ${message}`, {
      code,
      stack: error instanceof Error ? error.stack : undefined,
    });
  }

  if (!res.headersSent) {
    res.status(statusCode).json({
      success: false,
      error: {
        code,
        message,
        ...(details !== undefined ? { details } : {}),
        ...(statusCode >= 500 && env.NODE_ENV !== "production" ? { stack: (error as Error)?.stack } : {}),
      },
    });
  }
}

export function apiUsageTracker(req: Request, res: Response, next: NextFunction) {
  const started = Date.now();
  res.on("finish", () => {
    const durationMs = Date.now() - started;
    const originalPath = req.originalUrl.split("?")[0];
    if (originalPath.startsWith("/api")) {
      trackApiUsage({
        userId: req.user?.id,
        endpoint: originalPath.slice(4),
        method: req.method,
        statusCode: res.statusCode,
        durationMs,
      });
    }
  });
  next();
}
