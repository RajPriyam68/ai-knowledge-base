import { Router } from "express";
import { authenticate, requireActive } from "../middleware/auth.js";
import * as documentController from "../controllers/document.controller.js";
import { validateBody, validateParams } from "../middleware/validate.js";
import { idParamSchema, renameDocumentSchema } from "../validators/index.js";
import { uploadLimiter } from "../middleware/rateLimiter.js";
import { handleUpload, validateFiles } from "../middleware/upload.js";

const router = Router();

router.use(authenticate, requireActive);

router.post("/upload", uploadLimiter, handleUpload, validateFiles, documentController.uploadDocuments);
router.get("/", documentController.listDocuments);
router.put("/:id", validateParams(idParamSchema), validateBody(renameDocumentSchema), documentController.renameDocument);
router.delete("/:id", validateParams(idParamSchema), documentController.deleteDocument);
router.get("/:id/preview", validateParams(idParamSchema), documentController.previewDocument);
router.post("/:id/reprocess", validateParams(idParamSchema), documentController.reprocessDocument);

export default router;
