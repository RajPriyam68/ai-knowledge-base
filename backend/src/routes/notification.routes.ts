import { Router } from "express";
import { authenticate, requireActive } from "../middleware/auth.js";
import * as notificationController from "../controllers/notification.controller.js";

const router = Router();

router.use(authenticate, requireActive);

router.get("/", notificationController.listAll);
router.get("/unread-count", notificationController.unreadCount);
router.patch("/:id/read", notificationController.markRead);
router.patch("/read-all", notificationController.markAllRead);

export default router;
