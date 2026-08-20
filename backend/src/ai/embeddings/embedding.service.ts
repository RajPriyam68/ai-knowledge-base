import { env as txEnv, pipeline } from "@huggingface/transformers";
import { env as appEnv } from "../../config/env.js";
import { EMBEDDING_DIMENSIONS } from "../../config/constants.js";
import { logger } from "../../config/logger.js";

type FeatureExtractionPipeline = (texts: string[], options?: {
  pooling?: string;
  normalize?: boolean;
}) => Promise<{ data: ArrayLike<number>; dims: number[] }>;

let extractorPromise: Promise<FeatureExtractionPipeline> | null = null;

function configureEnvironment(): void {
  txEnv.cacheDir = appEnv.EMBEDDING_CACHE_DIR;
  txEnv.allowLocalModels = true;
  txEnv.allowRemoteModels = true;
}

async function getExtractor(): Promise<FeatureExtractionPipeline> {
  configureEnvironment();
  if (!extractorPromise) {
    logger.info(`[Embeddings] loading model "${appEnv.EMBEDDING_MODEL}"...`);
    extractorPromise = pipeline(
      "feature-extraction",
      `Xenova/${appEnv.EMBEDDING_MODEL}`,
    ) as Promise<FeatureExtractionPipeline>;
    extractorPromise.catch((err) => {
      logger.error("[Embeddings] model load failed", err);
      extractorPromise = null;
    });
  }
  return extractorPromise;
}

export async function embedTexts(texts: string[]): Promise<number[][]> {
  const extractor = await getExtractor();
  const cleanTexts = texts.map((t) => t.replace(/\0/g, "").trim());
  const output = await extractor(cleanTexts, { pooling: "mean", normalize: true });
  const dims = output.dims ?? [cleanTexts.length, EMBEDDING_DIMENSIONS];
  const flat = Array.from(output.data);
  const vectorLength = dims[dims.length - 1];
  const vectors: number[][] = [];
  for (let i = 0; i < cleanTexts.length; i++) {
    const start = i * vectorLength;
    vectors.push(Array.from(flat.slice(start, start + vectorLength)));
  }
  return vectors;
}

export async function embedText(text: string): Promise<number[]> {
  const vectors = await embedTexts([text]);
  return vectors[0];
}

export async function isModelReady(): Promise<boolean> {
  try {
    await getExtractor();
    return true;
  } catch {
    return false;
  }
}

export function getEmbeddingDimensions(): number {
  return EMBEDDING_DIMENSIONS;
}
