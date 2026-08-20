import { Router } from "express";
import { authenticate, requireAdmin, requireActive } from "../middleware/auth.js";
import * as adminController from "../controllers/admin.controller.js";
import { validateBody, validateParams } from "../middleware/validate.js";
import {
  adminSettingsSchema,
  adminUpdateUserSchema,
  aiConfigSchema,
  idParamSchema,
  promptTemplateSchema,
} from "../validators/index.js";

const router = Router();

router.use(authenticate, requireActive, requireAdmin);

router.get("/users", adminController.listUsers);
router.put("/users/:id", validateParams(idParamSchema), validateBody(adminUpdateUserSchema), adminController.updateUser);
router.delete("/users/:id", validateParams(idParamSchema), adminController.deleteUser);

router.get("/logs", adminController.getLogs);
router.delete("/logs", adminController.clearLogs);

router.get("/analytics", adminController.getAnalytics);
router.get("/api-usage", adminController.getApiUsage);

router.get("/settings", adminController.getSettings);
router.post("/settings", validateBody(adminSettingsSchema), adminController.updateSetting);
router.delete("/settings/:key", adminController.deleteSetting);

router.get("/ai/config", adminController.getAiConfig);
router.put("/ai/config", validateBody(aiConfigSchema), adminController.updateAiConfig);

router.get("/prompts", adminController.getPrompts);
router.put("/prompts", validateBody(promptTemplateSchema), adminController.updatePrompts);
router.post("/prompts/reset", adminController.resetPrompts);

router.get("/stats", adminController.getStats);
router.get("/health", adminController.getHealth);

export default router;
