import type { Request, Response } from "express";
import { asyncHandler } from "../utils/errors.js";
import { getParam } from "../utils/params.js";
import {
  countUnread,
  listNotifications,
  markAllNotificationsRead,
  markNotificationRead,
} from "../services/notification.service.js";

export const listAll = asyncHandler(async (req: Request, res: Response) => {
  const page = Number(req.query.page ?? 1);
  const pageSize = Number(req.query.pageSize ?? 20);
  const result = await listNotifications(req.user!.id, page, pageSize);
  res.json({ success: true, data: result });
});

export const unreadCount = asyncHandler(async (req: Request, res: Response) => {
  const count = await countUnread(req.user!.id);
  res.json({ success: true, data: { count } });
});

export const markRead = asyncHandler(async (req: Request, res: Response) => {
  await markNotificationRead(getParam(req, "id"), req.user!.id);
  res.json({ success: true, message: "Notification marked as read" });
});

export const markAllRead = asyncHandler(async (req: Request, res: Response) => {
  await markAllNotificationsRead(req.user!.id);
  res.json({ success: true, message: "All notifications marked as read" });
});
