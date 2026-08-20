export interface User {
  id: string;
  email: string;
  name: string;
  role: "USER" | "ADMIN";
  avatarUrl: string | null;
  isEmailVerified: boolean;
  isSuspended: boolean;
}

export interface AuthResponse {
  user: User;
  accessToken: string;
  refreshToken: string;
}

export interface KnowledgeBase {
  id: string;
  name: string;
  description: string | null;
  icon: string;
  color: string;
  createdAt: string;
  updatedAt: string;
  visibility: "PRIVATE" | "SHARED" | "PUBLIC";
  isArchived?: boolean;
  _count?: { documents: number; chunks: number, chats: number; };
  
totalSize?: number;
}

export interface DocumentItem {
  id: string;
  kbId: string;
  originalName: string;
  filename: string;
  mimeType: string;
  extension: string;
  size: number;
  status: "PENDING" | "PROCESSING" | "PROCESSED" | "FAILED";
  errorMessage: string | null;
  chunkCount: number;
  createdAt: string;
  kb?: { id: string; name: string };
  _count?: { chunks: number };
}

export interface Citation {
  index: number;
  documentId: string;
  documentName: string;
  chunkId: string;
  text: string;
  score: number;
}

export interface ChatMessage {
  id: string;
  chatId: string;
  role: "USER" | "ASSISTANT";
  content: string;
  citations: Citation[] | null;
  createdAt: string;
}

export interface ChatItem {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  kbId: string | null;
  kb?: { id: string; name: string } | null;
  _count?: { messages: number };
}

export interface ChatResult {
  chatId: string;
  answer: string;
  citations: Citation[];
  model: string;
  provider: string;
  tokenUsage: { inputTokens: number; outputTokens: number } | null;
  latencyMs: number;
  followUps: string[];
}

export interface NotificationItem {
  id: string;
  type: string;
  title: string;
  body: string | null;
  isRead: boolean;
  createdAt: string;
}

export interface Flashcard {
  question: string;
  answer: string;
}

export interface QuizQuestion {
  question: string;
  options: string[];
  correctIndex: number;
  explanation: string;
}

export interface KbStats {
  kbCount: number;
  documentCount: number;
  chunkCount: number;
  chatCount: number;
  storageBytes: number;
}

export interface ApiErrorPayload {
  code: string;
  message: string;
  details?: unknown;
}

export interface AnalyticsOverview {
  users: number;
  kbs: number;
  documents: number;
  chunks: number;
  chats: number;
  messages: number;
  apiCalls: number;
  errors: number;
  storageBytes: number;
}

export interface AdminLog {
  id: string;
  level: string;
  message: string;
  meta: unknown;
  createdAt: string;
}

export interface ApiUsageRow {
  id: string;
  userId: string | null;
  endpoint: string;
  method: string;
  statusCode: number;
  durationMs: number;
  createdAt: string;
  user?: { email: string } | null;
}
