export const APP_NAME = "AI Knowledge Base";
export const API_PREFIX = "/api";

export const ROLE = {
  USER: "USER",
  ADMIN: "ADMIN",
} as const;

export type Role = (typeof ROLE)[keyof typeof ROLE];

export const DOCUMENT_STATUS = {
  PENDING: "PENDING",
  PROCESSING: "PROCESSING",
  PROCESSED: "PROCESSED",
  FAILED: "FAILED",
} as const;

export type DocumentStatus = (typeof DOCUMENT_STATUS)[keyof typeof DOCUMENT_STATUS];

export const MESSAGE_ROLE = {
  USER: "USER",
  ASSISTANT: "ASSISTANT",
} as const;

export type MessageRole = (typeof MESSAGE_ROLE)[keyof typeof MESSAGE_ROLE];

export const NOTIFICATION_TYPE = {
  SYSTEM: "SYSTEM",
  DOCUMENT: "DOCUMENT",
  CHAT: "CHAT",
  ACCOUNT: "ACCOUNT",
} as const;

export type NotificationType = (typeof NOTIFICATION_TYPE)[keyof typeof NOTIFICATION_TYPE];

export const EMBEDDING_DIMENSIONS = 384;
export const EMBEDDING_MODEL = "all-MiniLM-L6-v2";

export const SUPPORTED_MIME_TYPES: Record<string, string> = {
  "application/pdf": "pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "docx",
  "text/plain": "txt",
  "text/markdown": "md",
};

export const DOWNLOAD_HISTORY_MAX_MESSAGES = 200;
