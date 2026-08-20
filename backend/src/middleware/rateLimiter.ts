import rateLimit from "express-rate-limit";
import { RateLimitError } from "../utils/errors.js";

export const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 600,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  message: { success: false, error: { code: "RATE_LIMITED", message: "Too many requests, please try again later." } },
  handler: (_req, _res, next) => next(new RateLimitError()),
});

export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 40,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  message: { success: false, error: { code: "RATE_LIMITED", message: "Too many authentication attempts, please try again later." } },
  handler: (_req, _res, next) => next(new RateLimitError()),
});

export const chatLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 20,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  message: { success: false, error: { code: "RATE_LIMITED", message: "Too many chat requests, please slow down." } },
  handler: (_req, _res, next) => next(new RateLimitError()),
});

export const uploadLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 30,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  message: { success: false, error: { code: "RATE_LIMITED", message: "Too many upload requests, please slow down." } },
  handler: (_req, _res, next) => next(new RateLimitError()),
});
