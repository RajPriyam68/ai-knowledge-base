import { Router } from "express";
import { authenticate, requireActive } from "../middleware/auth.js";
import * as chatController from "../controllers/chat.controller.js";
import { validateBody, validateParams } from "../middleware/validate.js";
import { chatSchema, idParamSchema } from "../validators/index.js";
import { chatLimiter } from "../middleware/rateLimiter.js";

const router = Router();

router.use(authenticate, requireActive);

router.post("/", chatLimiter, validateBody(chatSchema), chatController.sendChat);
router.get("/history", chatController.chatHistory);
router.get("/export/:id", validateParams(idParamSchema), chatController.exportChat);
router.get("/:id", validateParams(idParamSchema), chatController.getChat);
router.delete("/:id", validateParams(idParamSchema), chatController.deleteChat);

router.post("/documents/:id/summarize", validateParams(idParamSchema), chatController.summarize);
router.post("/documents/:id/keypoints", validateParams(idParamSchema), chatController.keypoints);
router.post("/documents/:id/flashcards", validateParams(idParamSchema), chatController.flashcards);
router.post("/documents/:id/quiz", validateParams(idParamSchema), chatController.quiz);

export default router;
