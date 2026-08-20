import { Router } from "express";
import { authLimiter } from "../middleware/rateLimiter.js";
import * as authController from "../controllers/auth.controller.js";
import { validateBody } from "../middleware/validate.js";
import {
  changePasswordSchema,
  forgotPasswordSchema,
  loginSchema,
  logoutSchema,
  refreshSchema,
  registerSchema,
  resetPasswordSchema,
  updateProfileSchema,
  verifyEmailSchema,
} from "../validators/index.js";
import { authenticate, requireActive } from "../middleware/auth.js";

const router = Router();

router.post("/register", authLimiter, validateBody(registerSchema), authController.register);
router.post("/login", authLimiter, validateBody(loginSchema), authController.login);
router.post("/logout", validateBody(logoutSchema), authController.logout);
router.post("/refresh", authLimiter, validateBody(refreshSchema), authController.refresh);
router.post("/forgot-password", authLimiter, validateBody(forgotPasswordSchema), authController.forgotPassword);
router.post("/reset-password", authLimiter, validateBody(resetPasswordSchema), authController.resetPassword);
router.post("/verify-email", authLimiter, validateBody(verifyEmailSchema), authController.verifyEmail);

router.get("/me", authenticate, requireActive, authController.me);
router.post("/change-password", authenticate, requireActive, validateBody(changePasswordSchema), authController.changePassword);
router.put("/profile", authenticate, requireActive, validateBody(updateProfileSchema), authController.updateProfile);

export default router;
