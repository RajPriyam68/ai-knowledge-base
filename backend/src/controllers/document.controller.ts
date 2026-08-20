import type { Request, Response } from "express";
import { asyncHandler } from "../utils/errors.js";
import { getParam } from "../utils/params.js";
import * as docService from "../services/document.service.js";
import { BadRequestError } from "../utils/errors.js";

export const uploadDocuments = asyncHandler(async (req: Request, res: Response) => {
  const kbId = req.body.kbId as string | undefined;
  if (!kbId) {
    throw new BadRequestError("kbId is required");
  }
  const files = (req.files as Express.Multer.File[] | undefined) ?? [];
  const result = await docService.uploadDocuments(req.user!.id, kbId, files);
  res.status(201).json({ success: true, data: result });
});

export const listDocuments = asyncHandler(async (req: Request, res: Response) => {
  const kbId = typeof req.query.kbId === "string" ? req.query.kbId : undefined;
  const search = typeof req.query.q === "string" ? req.query.q : undefined;
  const items = await docService.listDocuments(req.user!.id, kbId, search);
  res.json({ success: true, data: { items } });
});

export const renameDocument = asyncHandler(async (req: Request, res: Response) => {
  const doc = await docService.renameDocument(req.user!.id, getParam(req, "id"), req.body.name);
  res.json({ success: true, data: doc });
});

export const deleteDocument = asyncHandler(async (req: Request, res: Response) => {
  await docService.deleteDocument(req.user!.id, getParam(req, "id"));
  res.json({ success: true, message: "Document deleted" });
});

export const previewDocument = asyncHandler(async (req: Request, res: Response) => {
  const result = await docService.previewDocument(req.user!.id, getParam(req, "id"));
  res.json({ success: true, data: result });
});

export const reprocessDocument = asyncHandler(async (req: Request, res: Response) => {
  const doc = await docService.reprocessFailed(req.user!.id, getParam(req, "id"));
  res.json({ success: true, data: doc, message: "Document queued for reprocessing" });
});
