import { embedText } from "../embeddings/embedding.service.js";
import { similaritySearch } from "../../repositories/embedding.repo.js";
import { env } from "../../config/env.js";
import type { RetrievalHit } from "../../types/index.js";

export interface RetrievalFilters {
  kbIds?: string[];
  documentIds?: string[];
  userId?: string;
}

export async function retrieve(
  query: string,
  filters: RetrievalFilters,
  topK = env.RAG_TOP_K,
): Promise<RetrievalHit[]> {
  if (!query.trim()) return [];
  const queryEmbedding = await embedText(query);
  const rows = await similaritySearch(queryEmbedding, filters, topK);
  const filteredRows = rows.filter(
  (row) => row.score >= env.RAG_MIN_SIMILARITY,
);
  console.log(
  "[RAG RETRIEVAL]",
  rows.map((row) => ({
    document: row.documentName,
    chunkIndex: row.chunkIndex,
    score: Number(row.score).toFixed(4),
  })),
);
return filteredRows.map((row) => ({
  chunkId: row.chunkId,
  documentId: row.documentId,
  documentName: row.documentName,
  kbId: row.kbId,
  content: row.content,
  score: row.score,
  chunkIndex: row.chunkIndex,
}));
}