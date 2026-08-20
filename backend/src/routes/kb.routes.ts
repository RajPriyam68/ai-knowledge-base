import { Router } from "express";
import { authenticate, requireActive } from "../middleware/auth.js";
import { requireKbRole } from "../middleware/kb-permission.js";
import * as kbController from "../controllers/kb.controller.js";
import * as kbMemberController from "../controllers/kb-member.controller.js";
import { validateBody, validateParams } from "../middleware/validate.js";
import {
  addKbMemberSchema,
  createKbSchema,
  idParamSchema,
  kbMemberParamSchema,
  updateKbMemberRoleSchema,
  updateKbSchema,
} from "../validators/index.js";


const router = Router();

router.use(authenticate, requireActive);

router.get("/", kbController.listKbs);
router.post("/", validateBody(createKbSchema), kbController.createKb);
router.get("/stats", kbController.getKbStats);
router.get(
  "/:id/stats",
  validateParams(idParamSchema),
  requireKbRole("OWNER", "EDITOR", "VIEWER"),
  kbController.getKnowledgeBaseStats,
);
router.get(
  "/:id",
  validateParams(idParamSchema),
  requireKbRole("OWNER", "EDITOR", "VIEWER"),
  kbController.getKb,
);
router.get(
  "/:id/members",
  validateParams(idParamSchema),
  requireKbRole("OWNER", "EDITOR", "VIEWER"),
  kbMemberController.listMembers,
);
router.post(
  "/:id/members",
  validateParams(idParamSchema),
  validateBody(addKbMemberSchema),
  requireKbRole("OWNER"),
  kbMemberController.addMember,
);
router.delete(
  "/:id/members/:userId",
  validateParams(kbMemberParamSchema),
  requireKbRole("OWNER"),
  kbMemberController.removeMember,
);
router.put(
  "/:id/members/:userId",
  validateParams(kbMemberParamSchema),
  validateBody(updateKbMemberRoleSchema),
  requireKbRole("OWNER"),
  kbMemberController.updateMemberRole,
);
router.put(
  "/:id",
  validateParams(idParamSchema),
  requireKbRole("OWNER", "EDITOR"),
  validateBody(updateKbSchema),
  kbController.updateKb,
);
router.delete(
  "/:id",
  validateParams(idParamSchema),
  requireKbRole("OWNER"),
  kbController.deleteKb,
);
router.patch(
  "/:id/archive",
  validateParams(idParamSchema),
  requireKbRole("OWNER"),
  kbController.archiveKb,
);

router.patch(
  "/:id/restore",
  validateParams(idParamSchema),
  requireKbRole("OWNER"),
  kbController.restoreKb,
);
export default router;
