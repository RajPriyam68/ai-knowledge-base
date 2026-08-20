import type { Request, Response } from "express";
import { asyncHandler } from "../utils/errors.js";
import { getParam } from "../utils/params.js";
import * as chatService from "../services/chat.service.js";
import { exportChatMarkdown, exportChatPdf } from "../services/chat.export.js";

export const sendChat = asyncHandler(async (req: Request, res: Response) => {
  const result = await chatService.sendChatMessage({
    userId: req.user!.id,
    question: req.body.question,
    kbId: req.body.kbId,
    documentIds: req.body.documentIds,
    chatId: req.body.chatId,
  });
  res.status(201).json({ success: true, data: result });
});

export const chatHistory = asyncHandler(async (req: Request, res: Response) => {
  const search = typeof req.query.q === "string" ? req.query.q : undefined;
  const items = await chatService.listChatHistory(req.user!.id, search);
  res.json({ success: true, data: { items } });
});

export const getChat = asyncHandler(async (req: Request, res: Response) => {
  const result = await chatService.getChatMessages(req.user!.id, getParam(req, "id"));
  res.json({ success: true, data: result });
});

export const deleteChat = asyncHandler(async (req: Request, res: Response) => {
  await chatService.deleteChat(req.user!.id, getParam(req, "id"));
  res.json({ success: true, message: "Chat deleted" });
});

export const exportChat = asyncHandler(async (req: Request, res: Response) => {
  const format = req.query.format === "pdf" ? "pdf" : "markdown";
  const result =
    format === "pdf"
      ? await exportChatPdf(req.user!.id, getParam(req, "id"))
      : await exportChatMarkdown(req.user!.id, getParam(req, "id"));
  res.setHeader("Content-Type", result.contentType);
  res.setHeader("Content-Disposition", `attachment; filename="${result.filename}"`);
  res.send(result.content);
});

export const summarize = asyncHandler(async (req: Request, res: Response) => {
  const result = await chatService.summarizeDocument(req.user!.id, getParam(req, "id"));
  res.json({ success: true, data: { text: result } });
});

export const keypoints = asyncHandler(async (req: Request, res: Response) => {
  const result = await chatService.keyPointsDocument(req.user!.id, getParam(req, "id"));
  res.json({ success: true, data: { text: result } });
});

export const flashcards = asyncHandler(async (req: Request, res: Response) => {
  const result = await chatService.generateFlashcards(req.user!.id, getParam(req, "id"));
  res.json({ success: true, data: { cards: result } });
});

export const quiz = asyncHandler(async (req: Request, res: Response) => {
  const result = await chatService.generateQuiz(req.user!.id, getParam(req, "id"));
  res.json({ success: true, data: { questions: result } });
});
