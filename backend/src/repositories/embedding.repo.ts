import { prisma } from "../config/database.js";

export async function deleteChunksByDocument(documentId: string) {
  await prisma.embedding.deleteMany({ where: { documentId } });
  await prisma.documentChunk.deleteMany({ where: { documentId } });
}

export async function deleteChunksByKb(kbId: string) {
  await prisma.embedding.deleteMany({ where: { kbId } });
  await prisma.documentChunk.deleteMany({ where: { kbId } });
}

export async function deleteEmbeddingsByKb(kbId: string) {
  await prisma.embedding.deleteMany({ where: { kbId } });
}

export async function insertEmbeddings(rows: {
  chunkId: string;
  documentId: string;
  kbId: string;
  userId: string;
  vector: number[];
  model: string;
  dimensions: number;
}[]) {
  if (rows.length === 0) return;
  const values = rows
    .map(
      (row) =>
        `(gen_random_uuid(), '${row.chunkId}'::uuid, '${row.documentId}'::uuid, '${row.kbId}'::uuid, '${row.userId}'::uuid, '[${row.vector.join(",")}]'::vector, '${row.model}', ${row.dimensions})`,
    )
    .join(",\n");
  await prisma.$executeRawUnsafe(`
    INSERT INTO "Embedding" ("id", "chunkId", "documentId", "kbId", "userId", "vector", "model", "dimensions")
    VALUES ${values}
  `);
}

export interface SimilarityRow {
  chunkId: string;
  documentId: string;
  documentName: string;
  kbId: string;
  content: string;
  chunkIndex: number;
  score: number;
}
export async function similaritySearch(
  embedding: number[],
  filters: {
    kbIds?: string[];
    documentIds?: string[];
    userId?: string;
  },
  topK: number,
): Promise<SimilarityRow[]> {
  // Validate the query embedding before sending it to pgvector.
  if (
    !Array.isArray(embedding) ||
    embedding.length === 0 ||
    embedding.some((value) => !Number.isFinite(value))
  ) {
    throw new Error("Invalid query embedding");
  }

  // Protect the database from invalid or excessive LIMIT values.
  const safeTopK = Math.min(
    Math.max(Math.floor(topK), 1),
    20,
  );

  // Keep the vector as a query parameter instead of interpolating
  // the complete vector directly into the SQL string.
  const vectorValue = `[${embedding.join(",")}]`;

  const conditions: string[] = [
    `u.vector IS NOT NULL`,
  ];

  const params: unknown[] = [vectorValue];

  // $1 = query vector
  // Dynamic filters start from $2.
  let paramIdx = 2;

  if (filters.kbIds && filters.kbIds.length > 0) {
    conditions.push(
      `u."kbId" = ANY($${paramIdx++}::uuid[])`,
    );
    params.push(filters.kbIds);
  }

  if (
    filters.documentIds &&
    filters.documentIds.length > 0
  ) {
    conditions.push(
      `u."documentId" = ANY($${paramIdx++}::uuid[])`,
    );
    params.push(filters.documentIds);
  }

  if (filters.userId) {
    conditions.push(
      `u."userId" = $${paramIdx++}::uuid`,
    );
    params.push(filters.userId);
  }

  const sql = `
    SELECT
      c."id" AS "chunkId",
      c."documentId" AS "documentId",
      d."originalName" AS "documentName",
      c."kbId" AS "kbId",
      c."content" AS "content",
      c."chunkIndex" AS "chunkIndex",
      (1 - (u.vector <=> $1::vector)) AS score
    FROM "Embedding" u
    JOIN "DocumentChunk" c
      ON c."id" = u."chunkId"
    JOIN "Document" d
      ON d."id" = c."documentId"
    WHERE ${conditions.join(" AND ")}
    ORDER BY u.vector <=> $1::vector ASC
    LIMIT ${safeTopK}
  `;

  const rows =
    await prisma.$queryRawUnsafe<SimilarityRow[]>(
      sql,
      ...params,
    );

  return rows.map((row) => ({
    ...row,
    score: Number(row.score),
  }));
}


export async function countEmbeddings() {
  return prisma.$queryRawUnsafe<{ count: bigint }[]>(
    `SELECT COUNT(*)::bigint AS count FROM "Embedding"`,
  );
}
