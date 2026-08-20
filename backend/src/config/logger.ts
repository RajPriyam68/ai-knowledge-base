import winston from "winston";
import { env } from "./env.js";

const { combine, timestamp, errors, json, colorize, simple } = winston.format;

const consoleFormat = env.NODE_ENV === "production" ? json() : combine(colorize(), simple());

export const logger = winston.createLogger({
  level: env.NODE_ENV === "test" ? "error" : "info",
  format: combine(errors({ stack: true }), timestamp(), json()),
  defaultMeta: { service: "ai-knowledge-base" },
  transports: [
    new winston.transports.Console({ format: consoleFormat }),
    new winston.transports.File({
      filename: "logs/combined.log",
      format: combine(errors({ stack: true }), timestamp(), json()),
      maxsize: 10 * 1024 * 1024,
      maxFiles: 5,
    }),
    new winston.transports.File({
      filename: "logs/error.log",
      level: "error",
      format: combine(errors({ stack: true }), timestamp(), json()),
      maxsize: 10 * 1024 * 1024,
      maxFiles: 5,
    }),
  ],
});

export type LogLevel = "info" | "warn" | "error" | "debug";

export function logToDb(level: LogLevel, message: string, meta?: Record<string, unknown>): void {
  void import("../repositories/system-log.repo.js")
    .then((mod) => mod.recordSystemLog(level, message, meta))
    .catch(() => undefined);
}
