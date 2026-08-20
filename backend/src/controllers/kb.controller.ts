import type { Request, Response } from "express";
import { asyncHandler } from "../utils/errors.js";
import { getParam } from "../utils/params.js";
import * as kbService from "../services/kb.service.js";

export const listKbs = asyncHandler(async (req: Request, res: Response) => {
  const search =
    typeof req.query.q === "string"
      ? req.query.q
      : undefined;

  const visibility =
    req.query.visibility === "PRIVATE" ||
    req.query.visibility === "SHARED" ||
    req.query.visibility === "PUBLIC"
      ? req.query.visibility
      : undefined;

  const archived =
    req.query.archived === "true"
      ? true
      : req.query.archived === "false"
        ? false
        : undefined;
   const sort =
  req.query.sort === "name_asc" ||
  req.query.sort === "name_desc" ||
  req.query.sort === "updated_desc"
    ? req.query.sort
    : undefined;     

  const items = await kbService.listKbs(req.user!.id, {
    search,
    visibility,
    archived,
    sort
  });

  res.json({ success: true, data: { items } });
});

export const createKb = asyncHandler(async (req: Request, res: Response) => {
  const kb = await kbService.createKb(req.user!.id, req.body);
  res.status(201).json({ success: true, data: kb });
});

export const getKb = asyncHandler(async (req: Request, res: Response) => {
  const data = await kbService.getKb(req.user!.id, getParam(req, "id"));
  res.json({ success: true, data });
});

export const updateKb = asyncHandler(async (req: Request, res: Response) => {
  const kb = await kbService.updateKb(req.user!.id, getParam(req, "id"), req.body);
  res.json({ success: true, data: kb });
});

export const archiveKb = asyncHandler(async (req: Request, res: Response) => {
  const id = Array.isArray(req.params.id)
    ? req.params.id[0]
    : req.params.id;

  const result = await kbService.archiveKb(
    req.user!.id,
    id,
  );

  res.json({
    success: true,
    data: result,
  });
});

export const restoreKb = asyncHandler(async (req: Request, res: Response) => {
  const id = Array.isArray(req.params.id)
    ? req.params.id[0]
    : req.params.id;

  const result = await kbService.restoreKb(
    req.user!.id,
    id,
  );

  res.json({
    success: true,
    data: result,
  });
});
export const deleteKb = asyncHandler(async (req: Request, res: Response) => {
  await kbService.deleteKb(req.user!.id, getParam(req, "id"));
  res.json({ success: true, message: "Knowledge base deleted" });
});

export const getKbStats = asyncHandler(async (req: Request, res: Response) => {
  const data = await kbService.getKbStats(req.user!.id);
  res.json({ success: true, data });
});
export const getKnowledgeBaseStats = asyncHandler(
  async (req: Request, res: Response) => {
    const kbId = req.params.id;

    if (!kbId || Array.isArray(kbId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid knowledge base ID",
      });
    }

    const data = await kbService.getKnowledgeBaseStats(
      req.user!.id,
      kbId,
    );

    if (!data) {
      return res.status(404).json({
        success: false,
        message: "Knowledge base not found",
      });
    }

    res.json({
      success: true,
      data,
    });
  },
);