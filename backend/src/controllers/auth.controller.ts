import type { Request, Response } from "express";
import { asyncHandler } from "../utils/errors.js";
import * as authService from "../services/auth.service.js";

function clientMeta(req: Request) {
  return {
    userAgent: req.headers["user-agent"],
    ip: req.ip ?? req.socket.remoteAddress,
  };
}

export const register = asyncHandler(async (req: Request, res: Response) => {
  const result = await authService.register(req.body, clientMeta(req).userAgent, clientMeta(req).ip);
  res.status(201).json({ success: true, data: result });
});

export const login = asyncHandler(async (req: Request, res: Response) => {
  const result = await authService.login(req.body, clientMeta(req).userAgent, clientMeta(req).ip);
  res.json({ success: true, data: result });
});

export const logout = asyncHandler(async (req: Request, res: Response) => {
  await authService.logout(req.body?.refreshToken);
  res.json({ success: true, message: "Logged out" });
});

export const refresh = asyncHandler(async (req: Request, res: Response) => {
  const result = await authService.refresh(
    req.body.refreshToken,
    clientMeta(req).userAgent,
    clientMeta(req).ip,
  );
  res.json({ success: true, data: result });
});

export const forgotPassword = asyncHandler(async (req: Request, res: Response) => {
  const result = await authService.forgotPassword(req.body.email);
  res.json({
    success: true,
    message: "If an account with that email exists, a reset link has been sent.",
    data: result,
  });
});

export const resetPassword = asyncHandler(async (req: Request, res: Response) => {
  await authService.resetPassword(req.body.token, req.body.password);
  res.json({ success: true, message: "Password has been reset. You can now log in." });
});

export const verifyEmail = asyncHandler(async (req: Request, res: Response) => {
  await authService.verifyEmail(req.body.token);
  res.json({ success: true, message: "Email verified successfully" });
});

export const me = asyncHandler(async (req: Request, res: Response) => {
  const user = await authService.getProfile(req.user!.id);
  res.json({
    success: true,
    data: {
      user: {
        id: user!.id,
        email: user!.email,
        name: user!.name,
        role: user!.role,
        avatarUrl: user!.avatarUrl,
        isEmailVerified: user!.isEmailVerified,
        isSuspended: user!.isSuspended,
        createdAt: user!.createdAt,
        lastLoginAt: user!.lastLoginAt,
      },
    },
  });
});

export const changePassword = asyncHandler(async (req: Request, res: Response) => {
  await authService.changePassword(req.user!.id, req.body.currentPassword, req.body.newPassword);
  res.json({ success: true, message: "Password changed successfully" });
});

export const updateProfile = asyncHandler(async (req: Request, res: Response) => {
  const user = await authService.getProfile(req.user!.id);
  const updated = await import("../repositories/user.repo.js").then((repo) =>
    repo.updateUser(req.user!.id, {
      name: req.body.name ?? user!.name,
      avatarUrl: req.body.avatarUrl !== undefined ? req.body.avatarUrl : user!.avatarUrl,
    }),
  );
  res.json({ success: true, data: { user: updated } });
});
