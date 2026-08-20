import type { Request, Response, NextFunction } from "express";

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  role: string;
  isSuspended: boolean;
}

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: AuthUser;
      requestId?: string;
    }
  }
}

export type AsyncRequestHandler = (
  req: Request,
  res: Response,
  next: NextFunction,
) => Promise<unknown>;

export interface Citation {
  index: number;
  documentId: string;
  documentName: string;
  chunkId: string;
  text: string;
  score: number;
}

export interface RagResponse {
  answer: string;
  citations: Citation[];
  model: string;
  provider: "gemini" | "offline";
  tokenUsage?: { input: number; output: number };
  latencyMs: number;
}

export interface RetrievalHit {
  chunkId: string;
  documentId: string;
  documentName: string;
  kbId: string;
  content: string;
  score: number;
  chunkIndex: number;
}
