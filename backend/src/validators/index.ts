import { z } from "zod";

const passwordSchema = z
  .string()
  .min(8, "Password must be at least 8 characters")
  .max(128, "Password must be at most 128 characters")
  .regex(/[a-zA-Z]/, "Password must contain at least one letter")
  .regex(/[0-9]/, "Password must contain at least one number");

export const registerSchema = z.object({
  email: z.string().email("Valid email is required").max(255),
  password: passwordSchema,
  name: z.string().trim().min(1, "Name is required").max(120),
});

export const loginSchema = z.object({
  email: z.string().email("Valid email is required").max(255),
  password: z.string().min(1, "Password is required"),
});

export const refreshSchema = z.object({
  refreshToken: z.string().min(1),
});

export const logoutSchema = z.object({
  refreshToken: z.string().optional(),
});

export const forgotPasswordSchema = z.object({
  email: z.string().email("Valid email is required").max(255),
});

export const resetPasswordSchema = z.object({
  token: z.string().min(1),
  password: passwordSchema,
});

export const verifyEmailSchema = z.object({
  token: z.string().min(1),
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: passwordSchema,
});

export const updateProfileSchema = z.object({
  name: z.string().trim().min(1).max(120).optional(),
  avatarUrl: z.string().url().max(500).nullable().optional(),
});

export const createKbSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(120),
  description: z.string().trim().max(500).optional(),
  icon: z.string().trim().min(1).max(50).optional(),
  color: z.string().trim().max(50).optional(),
  visibility: z.enum(["PRIVATE", "SHARED", "PUBLIC"]).optional(),
});

export const updateKbSchema = z.object({
  name: z.string().trim().min(1).max(120).optional(),
  description: z.string().trim().max(500).nullable().optional(),
  icon: z.string().trim().min(1).max(50).optional(),
  color: z.string().trim().max(50).optional(),
  visibility: z.enum(["PRIVATE", "SHARED", "PUBLIC"]).optional(),
});

export const renameDocumentSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(255),
});

export const chatSchema = z.object({
  question: z.string().trim().min(1, "Question is required").max(4000),
  kbId: z.string().uuid("Invalid knowledge base id").optional(),
  documentIds: z.array(z.string().uuid()).max(20).optional(),
  chatId: z.string().uuid().optional(),
});

export const documentTaskSchema = z.object({
  task: z.enum(["summarize", "keypoints", "flashcards", "quiz"]),
});

export const documentTaskTextSchema = z.object({
  text: z.string().min(1).max(100_000),
});

export const searchSchema = z.object({
  q: z.string().max(200).optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
});

export const idParamSchema = z.object({
  id: z.string().uuid("Invalid id"),
});

export const adminUpdateUserSchema = z.object({
  role: z.enum(["USER", "ADMIN"]).optional(),
  isSuspended: z.boolean().optional(),
  suspendReason: z.string().max(500).nullable().optional(),
});

export const adminSettingsSchema = z.object({
  key: z.string().trim().min(1).max(120),
  value: z.unknown(),
  description: z.string().max(500).optional(),
});

export const aiConfigSchema = z.object({
  model: z.string().trim().min(1).max(120).optional(),
  temperature: z.coerce.number().min(0).max(2).optional(),
});

export const promptTemplateSchema = z.object({
  systemPrompt: z.string().max(4000).optional(),
  chatPrompt: z.string().max(8000).optional(),
  followUpPrompt: z.string().max(4000).optional(),
  summarizePrompt: z.string().max(4000).optional(),
  keypointsPrompt: z.string().max(4000).optional(),
  flashcardsPrompt: z.string().max(4000).optional(),
  quizPrompt: z.string().max(4000).optional(),
});

export const usageQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  search: z.string().max(200).optional(),
  from: z.string().datetime().optional(),
  to: z.string().datetime().optional(),
});
export const addKbMemberSchema = z.object({
  userId: z.string().uuid("Invalid user id"),
  role: z.enum(["EDITOR", "VIEWER"]),
});

export const updateKbMemberRoleSchema = z.object({
  role: z.enum(["EDITOR", "VIEWER"]),
});
export const kbMemberParamSchema = z.object({
  id: z.string().uuid("Invalid knowledge base id"),
  userId: z.string().uuid("Invalid user id"),
});