import "dotenv/config";
import { z } from "zod";

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().int().positive().default(5000),
  DATABASE_URL: z.string().min(1).default(
    "postgresql://akb:akb_password@localhost:5432/ai_knowledge_base?schema=public",
  ),
  JWT_ACCESS_SECRET: z.string().min(16).default("dev_access_secret_change_me_1234567890"),
  JWT_REFRESH_SECRET: z.string().min(16).default("dev_refresh_secret_change_me_1234567890"),
  JWT_ACCESS_EXPIRES_IN: z.string().default("15m"),
  JWT_REFRESH_EXPIRES_IN: z.string().default("7d"),
  CLIENT_URL: z.string().url().default("http://localhost:3000"),
  API_URL: z.string().default("http://localhost:5000/api"),
  CORS_ORIGINS: z.string().default("http://localhost:3000"),
  EMAIL_VERIFICATION_REQUIRED: z
    .string()
    .default("false")
    .transform((v) => v === "true"),
  LOG_EMAILS_INSTEAD_OF_SEND: z
    .string()
    .default("true")
    .transform((v) => v === "true"),
  GEMINI_API_KEY: z.string().optional().default(""),
  GEMINI_MODEL: z.string().default("gemini-2.5-flash"),
  GEMINI_MAX_TOKENS: z.coerce.number().int().positive().default(1024),
  GEMINI_TEMPERATURE: z.coerce.number().min(0).max(2).default(0.2),
  EMBEDDING_MODEL: z.string().default("all-MiniLM-L6-v2"),
  EMBEDDING_CACHE_DIR: z.string().default("./.model-cache"),
  UPLOAD_DIR: z.string().default("./uploads"),
  MAX_FILE_SIZE_MB: z.coerce.number().int().positive().default(20),
  ALLOWED_EXTENSIONS: z.string().default("pdf,docx,txt,md"),
  RAG_CONTEXT_MAX_TOKENS: z.coerce.number().int().positive().default(6000),
  RAG_CHUNK_SIZE_TOKENS: z.coerce.number().int().positive().default(1000),
  RAG_CHUNK_OVERLAP_TOKENS: z.coerce.number().int().min(0).default(200),
  RAG_TOP_K: z.coerce.number().int().positive().default(5),
  RAG_MIN_SIMILARITY: z.coerce.number().min(-1).max(1).default(0.10),
  RAG_LANGUAGE: z.string().default("auto"),
  ADMIN_EMAIL: z.string().email().default("admin@example.com"),
  ADMIN_PASSWORD: z.string().min(8).default("Admin123!"),
  JOB_CLEANUP_INTERVAL_MINUTES: z.coerce.number().int().positive().default(15),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  const issues = parsed.error.issues
    .map((issue) => `  - ${issue.path.join(".")}: ${issue.message}`)
    .join("\n");
  console.error(`[ENV] Invalid environment variables:\n${issues}`);
  process.exit(1);
}

export const env = parsed.data;

export const isProduction = env.NODE_ENV === "production";
export const isTest = env.NODE_ENV === "test";
