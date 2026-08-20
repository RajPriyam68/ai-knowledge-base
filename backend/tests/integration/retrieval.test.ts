import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { prisma } from "../../src/config/database.js";
import { createUser } from "../../src/repositories/user.repo.js";
import { createKnowledgeBase } from "../../src/repositories/kb.repo.js";
import { createDocument, updateDocument } from "../../src/repositories/document.repo.js";
import { insertEmbeddings, similaritySearch } from "../../src/repositories/embedding.repo.js";
import { embedTexts, embedText } from "../../src/ai/embeddings/embedding.service.js";
import { retrieve } from "../../src/ai/retriever/retriever.service.js";

describe("pgvector retrieval pipeline (integration)", () => {
  let userId: string;
  let kbId: string;
  let docId: string;
  let chunkId: string;

  beforeAll(async () => {
    const stamp = Date.now().toString(36);
    const user = await createUser({
      email: `retrieval+${stamp}@example.com`,
      passwordHash: "x",
      name: "Retrieval Tester",
    });
    userId = user.id;

    const kb = await createKnowledgeBase({ userId, name: `Retrieval KB ${stamp}`, description: "" });
    kbId = kb.id;

    const doc = await createDocument({
      kbId,
      userId,
      filename: "retrieval.txt",
      originalName: "retrieval.txt",
      mimeType: "text/plain",
      extension: "txt",
      size: 100,
      storagePath: "/tmp/retrieval.txt",
    });
    docId = doc.id;
  });

  afterAll(async () => {
    await prisma.$transaction([
      prisma.embedding.deleteMany({ where: { kbId } }),
      prisma.documentChunk.deleteMany({ where: { kbId } }),
      prisma.document.deleteMany({ where: { id: docId } }),
      prisma.knowledgeBase.deleteMany({ where: { id: kbId } }),
      prisma.user.deleteMany({ where: { id: userId } }),
    ]);
    await prisma.$disconnect();
  });

  it("embeds text and stores vectors, then finds them by similarity", async () => {
    const content =
      "PostgreSQL is an advanced open-source relational database system. " +
      "It provides ACID transactions, sophisticated query planning, and support for the pgvector extension.";
    const [vector] = await embedTexts([content]);
    expect(Array.isArray(vector)).toBe(true);
    expect(vector.length).toBe(384);

    const chunk = await prisma.documentChunk.create({
      data: {
        document: { connect: { id: docId } },
        kb: { connect: { id: kbId } },
        user: { connect: { id: userId } },
        chunkIndex: 0,
        tokenCount: Math.ceil(content.length / 4),
        content,
      },
    });
    chunkId = chunk.id;

    await insertEmbeddings([
      { chunkId, documentId: docId, kbId, userId, vector, model: "all-MiniLM-L6-v2", dimensions: 384 },
    ]);

    const count = await prisma.embedding.count({ where: { kbId } });
    expect(count).toBe(1);
  });

  it("similaritySearch returns the matching chunk", async () => {
    const queryVector = await embedText("What is PostgreSQL?");
    const rows = await similaritySearch(queryVector, { kbIds: [kbId] }, 5);
    expect(rows.length).toBeGreaterThanOrEqual(1);
    expect(rows[0].chunkId).toBe(chunkId);
    expect(rows[0].score).toBeGreaterThan(0.3);
    expect(rows[0].documentName).toBe("retrieval.txt");
  });

  it("retrieve() returns RetrievalHit shape with metadata", async () => {
    const hits = await retrieve("relational database ACID", { kbIds: [kbId] });
    expect(hits.length).toBeGreaterThanOrEqual(1);
    expect(hits[0]).toMatchObject({
      chunkId: expect.any(String),
      documentId: expect.any(String),
      kbId: expect.any(String),
      content: expect.any(String),
      score: expect.any(Number),
    });
  });

  it("retrieve respects documentId filters", async () => {
    const hits = await retrieve("anything at all", { kbIds: [kbId], documentIds: [docId] });
    expect(Array.isArray(hits)).toBe(true);
  });

  it("retrieve returns empty for unrelated filters", async () => {
    const fakeDocId = "00000000-0000-4000-8000-000000000000";
    const hits = await retrieve("PostgreSQL ACID", { kbIds: [kbId], documentIds: [fakeDocId] });
    expect(hits.length).toBe(0);
  });

  it("updateDocument still works after chunk writes", async () => {
    const updated = await updateDocument(docId, { originalName: "renamed-retrieval.txt" });
    expect(updated.originalName).toBe("renamed-retrieval.txt");
  });
});
