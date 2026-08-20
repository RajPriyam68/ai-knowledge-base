import type { NextFunction, Request, Response } from "express";
import { ForbiddenError, UnauthorizedError } from "../utils/errors.js";
import { requireValidAccessToken } from "../services/auth.service.js";
import { findUserById } from "../repositories/user.repo.js";
import type { AuthUser } from "../types/index.js";

function extractBearerToken(req: Request): string | undefined {
  const header = req.headers.authorization;
  if (header?.startsWith("Bearer ")) {
    return header.slice(7).trim();
  }
  return undefined;
}

export async function authenticate(req: Request, _res: Response, next: NextFunction) {
  try {
    const token = extractBearerToken(req);
    const payload = requireValidAccessToken(token);
    const user = await findUserById(payload.userId);
    if (!user) {
      throw new UnauthorizedError("Account no longer exists");
    }
    req.user = {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      isSuspended: user.isSuspended,
    } satisfies AuthUser;
    next();
  } catch (error) {
    next(error);
  }
}

export async function optionalAuthenticate(req: Request, _res: Response, next: NextFunction) {
  try {
    const token = extractBearerToken(req);
    if (!token) {
      next();
      return;
    }
    const payload = requireValidAccessToken(token);
    const user = await findUserById(payload.userId);
    if (user) {
      req.user = {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        isSuspended: user.isSuspended,
      };
    }
    next();
  } catch {
    next();
  }
}

export function requireActive(req: Request, _res: Response, next: NextFunction) {
  if (!req.user) {
    next(new UnauthorizedError("Authentication required"));
    return;
  }
  if (req.user.isSuspended) {
    next(new ForbiddenError("Your account has been suspended."));
    return;
  }
  next();
}

export function requireAdmin(req: Request, _res: Response, next: NextFunction) {
  if (!req.user) {
    next(new UnauthorizedError("Authentication required"));
    return;
  }
  if (req.user.role !== "ADMIN") {
    next(new ForbiddenError("Admin access required"));
    return;
  }
  next();
}

export function requireRole(role: string) {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!req.user) {
      next(new UnauthorizedError("Authentication required"));
      return;
    }
    if (req.user.role !== role) {
      next(new ForbiddenError(`Role "${role}" required`));
      return;
    }
    next();
  };
}
