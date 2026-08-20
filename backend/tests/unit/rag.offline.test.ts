import { describe, expect, it } from "vitest";
import {
  runDocumentTask,
  runFlashcards,
  runQuiz,
} from "../../src/ai/rag/rag.pipeline.js";

const SAMPLE = `# Introduction to PostgreSQL

PostgreSQL is a powerful open-source relational database management system. It emphasizes extensibility and standards compliance.

## Vector Search

Vector search enables semantic similarity queries over embeddings. pgvector extends PostgreSQL with vector storage and similarity operators.

## Indexing

Indexes speed up query performance dramatically. PostgreSQL supports B-tree, hash, and GiST indexes. pgvector adds HNSW and IVFFlat indexes for vector data.

## Transactions

Transactions guarantee atomicity, consistency, isolation, and durability. PostgreSQL provides full ACID compliance.
`;

describe("offline document tasks (no GEMINI_API_KEY)", () => {
  it("runDocumentTask summarize returns structured markdown", async () => {
    const result = await runDocumentTask("summarize", SAMPLE);
    expect(result).toContain("## Summary");
    expect(result).toContain("Offline demo mode");
  });

  it("runDocumentTask keypoints returns a numbered list", async () => {
    const result = await runDocumentTask("keypoints", SAMPLE);
    expect(result).toContain("## Key Points");
    expect(result).toMatch(/1\. /);
    expect(result).toContain("Offline demo mode");
  });

  it("runFlashcards produces question/answer cards", async () => {
    const cards = await runFlashcards(SAMPLE);
    expect(Array.isArray(cards)).toBe(true);
    expect(cards.length).toBeGreaterThan(0);
    for (const card of cards) {
      expect(typeof card.question).toBe("string");
      expect(card.question.length).toBeGreaterThan(0);
      expect(typeof card.answer).toBe("string");
      expect(card.answer.length).toBeGreaterThan(0);
    }
  });

  it("runQuiz produces questions with options and a valid correctIndex", async () => {
    const questions = await runQuiz(SAMPLE);
    expect(Array.isArray(questions)).toBe(true);
    expect(questions.length).toBeGreaterThan(0);
    for (const q of questions) {
      expect(q.options.length).toBeGreaterThanOrEqual(2);
      expect(q.correctIndex).toBeGreaterThanOrEqual(0);
      expect(q.correctIndex).toBeLessThan(q.options.length);
      expect(typeof q.explanation).toBe("string");
    }
  });

  it("handles empty text gracefully", async () => {
    const summary = await runDocumentTask("summarize", "");
    expect(typeof summary).toBe("string");
    const cards = await runFlashcards("");
    expect(Array.isArray(cards)).toBe(true);
  });
});
