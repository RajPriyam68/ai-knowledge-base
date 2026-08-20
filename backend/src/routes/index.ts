import { Router } from "express";
import authRoutes from "./auth.routes.js";
import kbRoutes from "./kb.routes.js";
import documentRoutes from "./document.routes.js";
import chatRoutes from "./chat.routes.js";
import adminRoutes from "./admin.routes.js";
import notificationRoutes from "./notification.routes.js";

const router = Router();

router.use("/auth", authRoutes);
router.use("/kb", kbRoutes);
router.use("/documents", documentRoutes);
router.use("/chat", chatRoutes);
router.use("/admin", adminRoutes);
router.use("/notifications", notificationRoutes);

export default router;
