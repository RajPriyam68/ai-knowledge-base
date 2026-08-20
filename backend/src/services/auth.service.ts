import {
  BadRequestError,
  ConflictError,
  ForbiddenError,
  NotFoundError,
  UnauthorizedError,
} from "../utils/errors.js";
import { hashPassword, verifyPassword } from "../utils/password.js";
import {
  issuePasswordResetToken,
  randomToken,
  sha256,
  signAccessToken,
  signRefreshToken,
  verifyAccessToken,
  verifyRefreshToken,
} from "../utils/tokens.js";
import * as userRepo from "../repositories/user.repo.js";
import * as sessionRepo from "../repositories/session.repo.js";
import { env } from "../config/env.js";
import { sendPasswordResetEmail, sendVerificationEmail } from "./email.service.js";
import { trackEvent } from "../repositories/analytics.repo.js";
import { logger } from "../config/logger.js";

const REFRESH_TOKEN_EXPIRES_MS = msFromString(env.JWT_REFRESH_EXPIRES_IN);

function msFromString(input: string): number {
  const match = /^(\d+)\s*(s|m|h|d)$/.exec(input.trim());
  if (!match) return 15 * 60 * 1000;
  const value = Number(match[1]);
  const unit = match[2];
  const multipliers: Record<string, number> = { s: 1000, m: 60_000, h: 3_600_000, d: 86_400_000 };
  return value * multipliers[unit];
}

export interface AuthResult {
  user: {
    id: string;
    email: string;
    name: string;
    role: string;
    avatarUrl: string | null;
    isEmailVerified: boolean;
    isSuspended: boolean;
  };
  accessToken: string;
  refreshToken: string;
}

async function buildAuthResult(user: {
  id: string;
  email: string;
  name: string;
  role: string;
  avatarUrl: string | null;
  isEmailVerified: boolean;
  isSuspended: boolean;
}, userAgent?: string, ip?: string): Promise<AuthResult> {
  const sessionId = randomToken(16);
  const refreshToken = signRefreshToken(user.id, sessionId);
  const tokenHash = sha256(refreshToken);

  const expiresAt = new Date(Date.now() + REFRESH_TOKEN_EXPIRES_MS);
  await sessionRepo.createSession({
    userId: user.id,
    tokenHash,
    userAgent: userAgent ? userAgent.slice(0, 500) : undefined,
    ip: ip ? ip.slice(0, 64) : undefined,
    expiresAt,
  });

  const accessToken = signAccessToken({ id: user.id, email: user.email, role: user.role });
  return { user, accessToken, refreshToken };
}

export async function register(data: {
  email: string;
  password: string;
  name: string;
}, userAgent?: string, ip?: string) {
  const email = data.email.toLowerCase().trim();
  const existing = await userRepo.findUserByEmail(email);
  if (existing) {
    throw new ConflictError("An account with this email already exists");
  }

  const passwordHash = await hashPassword(data.password);
  const user = await userRepo.createUser({ email, passwordHash, name: data.name.trim() });

  const verificationToken = randomToken(24);
  await userRepo.updateUser(user.id, {
    emailVerificationTokenHash: sha256(verificationToken),
  });

  await sendVerificationEmail(email, user.name, verificationToken);

  let verifiedUser = user;
  if (!env.EMAIL_VERIFICATION_REQUIRED) {
    verifiedUser = await userRepo.updateUser(user.id, {
      isEmailVerified: true,
      emailVerifiedAt: new Date(),
      emailVerificationTokenHash: null,
    });
  }

  await trackEvent("user.register", user.id, { email });
  return buildAuthResult(verifiedUser, userAgent, ip);
}

export async function login(data: { email: string; password: string }, userAgent?: string, ip?: string) {
  const email = data.email.toLowerCase().trim();
  const user = await userRepo.findUserByEmail(email);
  if (!user) {
    throw new UnauthorizedError("Invalid email or password");
  }
  if (user.isSuspended) {
    throw new ForbiddenError("Your account has been suspended. Contact an administrator.");
  }
  const valid = await verifyPassword(data.password, user.passwordHash);
  if (!valid) {
    throw new UnauthorizedError("Invalid email or password");
  }
  if (env.EMAIL_VERIFICATION_REQUIRED && !user.isEmailVerified) {
    throw new ForbiddenError("Please verify your email address before logging in.");
  }

  await userRepo.updateUser(user.id, { lastLoginAt: new Date() });
  await trackEvent("user.login", user.id);

  return buildAuthResult(
    {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      avatarUrl: user.avatarUrl,
      isEmailVerified: user.isEmailVerified,
      isSuspended: user.isSuspended,
    },
    userAgent,
    ip,
  );
}

export async function logout(refreshToken: string): Promise<void> {
  if (!refreshToken) return;
  const tokenHash = sha256(refreshToken);
  const session = await sessionRepo.findSessionByTokenHash(tokenHash);
  if (session && !session.revokedAt) {
    await sessionRepo.revokeSession(session.id);
  }
}

export async function refresh(refreshToken: string, userAgent?: string, ip?: string) {
  if (!refreshToken) {
    throw new UnauthorizedError("Missing refresh token");
  }

  let payload;
  try {
    payload = verifyRefreshToken(refreshToken);
  } catch {
    throw new UnauthorizedError("Invalid or expired refresh token");
  }

  const tokenHash = sha256(refreshToken);
  const session = await sessionRepo.findSessionByTokenHash(tokenHash);
  if (!session || session.revokedAt) {
    throw new UnauthorizedError("Session has been revoked. Please log in again.");
  }
  if (session.expiresAt < new Date()) {
    throw new UnauthorizedError("Session has expired. Please log in again.");
  }

  const user = await userRepo.findUserById(payload.sub);
  if (!user) {
    throw new UnauthorizedError("Account no longer exists");
  }
  if (user.isSuspended) {
    throw new ForbiddenError("Your account has been suspended.");
  }

  await sessionRepo.revokeSession(session.id);
  const newSessionId = randomToken(16);
  const newRefreshToken = signRefreshToken(user.id, newSessionId);
  await sessionRepo.createSession({
    userId: user.id,
    tokenHash: sha256(newRefreshToken),
    userAgent: userAgent ? userAgent.slice(0, 500) : undefined,
    ip: ip ? ip.slice(0, 64) : undefined,
    expiresAt: new Date(Date.now() + REFRESH_TOKEN_EXPIRES_MS),
  });

  const accessToken = signAccessToken({ id: user.id, email: user.email, role: user.role });
  return { accessToken, refreshToken: newRefreshToken };
}

export async function forgotPassword(email: string): Promise<{ token?: string }> {
  const user = await userRepo.findUserByEmail(email.toLowerCase().trim());
  if (!user) {
    return {}; // do not leak account existence
  }

  const token = issuePasswordResetToken();
  await userRepo.updateUser(user.id, {
    resetPasswordTokenHash: sha256(token),
    resetPasswordExpiresAt: new Date(Date.now() + 60 * 60 * 1000),
  });

  await sendPasswordResetEmail(user.email, user.name, token);
  return { token: env.LOG_EMAILS_INSTEAD_OF_SEND ? token : undefined };
}

export async function resetPassword(token: string, newPassword: string): Promise<void> {
  if (!token) {
    throw new BadRequestError("Reset token is required");
  }
  const tokenHash = sha256(token);

  const users = await userRepo.findAllByResetToken(tokenHash);
  const user = users[0];
  if (!user) {
    throw new BadRequestError("Invalid or expired reset token");
  }
  if (user.resetPasswordExpiresAt && user.resetPasswordExpiresAt < new Date()) {
    throw new BadRequestError("Reset token has expired. Please request a new one.");
  }

  const passwordHash = await hashPassword(newPassword);
  await userRepo.updateUser(user.id, {
    passwordHash,
    passwordChangedAt: new Date(),
    resetPasswordTokenHash: null,
    resetPasswordExpiresAt: null,
  });
  await sessionRepo.revokeUserSessions(user.id);
  await trackEvent("user.password_reset", user.id);
}

export async function verifyEmail(token: string): Promise<void> {
  if (!token) {
    throw new BadRequestError("Verification token is required");
  }
  const tokenHash = sha256(token);
  const user = await userRepo.findByVerificationToken(tokenHash);
  if (!user) {
    throw new BadRequestError("Invalid or expired verification token");
  }
  await userRepo.updateUser(user.id, {
    isEmailVerified: true,
    emailVerifiedAt: new Date(),
    emailVerificationTokenHash: null,
  });
  await trackEvent("user.email_verified", user.id);
}

export async function changePassword(userId: string, currentPassword: string, newPassword: string) {
  const user = await userRepo.findUserById(userId);
  if (!user) {
    throw new NotFoundError("User not found");
  }
  const valid = await verifyPassword(currentPassword, user.passwordHash);
  if (!valid) {
    throw new BadRequestError("Current password is incorrect");
  }
  const passwordHash = await hashPassword(newPassword);
  await userRepo.updateUser(userId, {
    passwordHash,
    passwordChangedAt: new Date(),
  });
  await sessionRepo.revokeUserSessions(userId);
  await trackEvent("user.password_changed", userId);
}

export function getProfile(userId: string) {
  return userRepo.findUserById(userId);
}

export function requireValidAccessToken(token: string | undefined) {
  if (!token) {
    throw new UnauthorizedError("Authentication required");
  }
  try {
    const payload = verifyAccessToken(token);
    return { userId: payload.sub, role: payload.role, email: payload.email };
  } catch {
    throw new UnauthorizedError("Invalid or expired access token");
  }
}

export async function bootstrapAdmin(): Promise<void> {
  const adminCount = await userRepo.countUsers({ role: "ADMIN" });
  if (adminCount > 0) return;
  const existing = await userRepo.findUserByEmail(env.ADMIN_EMAIL);
  if (existing) {
    if (existing.role !== "ADMIN") {
      await userRepo.updateUser(existing.id, { role: "ADMIN" });
    }
    return;
  }
  const passwordHash = await hashPassword(env.ADMIN_PASSWORD);
  await userRepo.createUser({
    email: env.ADMIN_EMAIL,
    passwordHash,
    name: "Administrator",
    role: "ADMIN",
  });
  await userRepo.updateUserByEmail(env.ADMIN_EMAIL, {
    isEmailVerified: true,
    emailVerifiedAt: new Date(),
  });
  logger.info(`[Auth] Bootstrapped admin account: ${env.ADMIN_EMAIL}`);
}

export function verifyCurrentUserActive(user: { isSuspended: boolean }) {
  if (user.isSuspended) {
    throw new ForbiddenError("Your account has been suspended.");
  }
}
