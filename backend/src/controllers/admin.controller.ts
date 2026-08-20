import type { Request, Response } from "express";
import { asyncHandler } from "../utils/errors.js";
import { getParam } from "../utils/params.js";
import * as adminService from "../services/admin.service.js";
import { BadRequestError } from "../utils/errors.js";

export const listUsers = asyncHandler(async (req: Request, res: Response) => {
  const page = Number(req.query.page ?? 1);
  const pageSize = Number(req.query.pageSize ?? 20);
  const search = typeof req.query.search === "string" ? req.query.search : undefined;
  const role = typeof req.query.role === "string" ? req.query.role : undefined;
  const status = typeof req.query.status === "string" ? req.query.status : undefined;
  const result = await adminService.adminListUsers({ page, pageSize, search, role, status });
  res.json({ success: true, data: result });
});

export const updateUser = asyncHandler(async (req: Request, res: Response) => {
  const user = await adminService.adminUpdateUser(req.user!.id, getParam(req, "id"), req.body);
  res.json({ success: true, data: user });
});

export const deleteUser = asyncHandler(async (req: Request, res: Response) => {
  await adminService.adminDeleteUser(req.user!.id, getParam(req, "id"));
  res.json({ success: true, message: "User deleted" });
});

export const getLogs = asyncHandler(async (req: Request, res: Response) => {
  const page = Number(req.query.page ?? 1);
  const pageSize = Number(req.query.pageSize ?? 20);
  const level = typeof req.query.level === "string" ? req.query.level : undefined;
  const search = typeof req.query.search === "string" ? req.query.search : undefined;
  const result = await adminService.adminLogs({ page, pageSize, level, search });
  res.json({ success: true, data: result });
});

export const clearLogs = asyncHandler(async (req: Request, res: Response) => {
  const days = Number(req.query.days ?? 30);
  const result = await adminService.adminClearLogs(days);
  res.json({ success: true, data: result });
});

export const getAnalytics = asyncHandler(async (_req: Request, res: Response) => {
  const result = await adminService.adminAnalytics();
  res.json({ success: true, data: result });
});

export const getApiUsage = asyncHandler(async (req: Request, res: Response) => {
  const page = Number(req.query.page ?? 1);
  const pageSize = Number(req.query.pageSize ?? 20);
  const search = typeof req.query.search === "string" ? req.query.search : undefined;
  const from = typeof req.query.from === "string" ? new Date(req.query.from) : undefined;
  const to = typeof req.query.to === "string" ? new Date(req.query.to) : undefined;
  if (from && Number.isNaN(from.getTime())) throw new BadRequestError("Invalid from date");
  if (to && Number.isNaN(to.getTime())) throw new BadRequestError("Invalid to date");
  const result = await adminService.adminApiUsage({ page, pageSize, search, from, to });
  res.json({ success: true, data: result });
});

export const getSettings = asyncHandler(async (_req: Request, res: Response) => {
  const result = await adminService.adminSettings();
  res.json({ success: true, data: { items: result } });
});

export const updateSetting = asyncHandler(async (req: Request, res: Response) => {
  const result = await adminService.adminSetSetting(
    req.user!.id,
    req.body.key,
    req.body.value,
    req.body.description,
  );
  res.json({ success: true, data: result });
});

export const deleteSetting = asyncHandler(async (req: Request, res: Response) => {
  await adminService.adminDeleteSetting(getParam(req, "key"));
  res.json({ success: true, message: "Setting deleted" });
});

export const getAiConfig = asyncHandler(async (_req: Request, res: Response) => {
  const result = await adminService.adminAiConfig();
  res.json({ success: true, data: result });
});

export const updateAiConfig = asyncHandler(async (req: Request, res: Response) => {
  const result = await adminService.adminUpdateAiConfig(req.user!.id, req.body);
  res.json({ success: true, data: result });
});

export const getPrompts = asyncHandler(async (_req: Request, res: Response) => {
  const result = await adminService.adminPrompts();
  res.json({ success: true, data: result });
});

export const updatePrompts = asyncHandler(async (req: Request, res: Response) => {
  const result = await adminService.adminUpdatePrompts(req.user!.id, req.body);
  res.json({ success: true, data: result });
});

export const resetPrompts = asyncHandler(async (_req: Request, res: Response) => {
  const result = await adminService.adminResetPrompts();
  res.json({ success: true, data: result });
});

export const getStats = asyncHandler(async (_req: Request, res: Response) => {
  const result = await adminService.adminStats();
  res.json({ success: true, data: result });
});

export const getHealth = asyncHandler(async (_req: Request, res: Response) => {
  const result = await adminService.adminHealth();
  res.status(result.status === "healthy" ? 200 : 503).json({ success: true, data: result });
});
