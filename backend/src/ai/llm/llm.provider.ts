import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import {
  HumanMessage,
  AIMessage,
  SystemMessage,
} from "@langchain/core/messages";
import type { BaseMessage } from "@langchain/core/messages";
import { env } from "../../config/env.js";
import { getSetting } from "../../repositories/settings.repo.js";
import { logger } from "../../config/logger.js";

export interface LlmConfig {
  model: string;
  temperature: number;
  maxTokens: number;
}

export interface ChatTurn {
  role: "user" | "assistant";
  content: string;
}

export interface GenerateOptions {
  system?: string;
  history?: ChatTurn[];
  json?: boolean;
  temperature?: number;
}

export interface GenerationResult {
  text: string;
  tokenUsage?: { input: number; output: number };
}

let geminiModel: ChatGoogleGenerativeAI | null = null;

export function hasGeminiKey(): boolean {
  return Boolean(env.GEMINI_API_KEY);
}

function getConfig(): LlmConfig {
  return {
    model: env.GEMINI_MODEL,
    temperature: env.GEMINI_TEMPERATURE,
    maxTokens: env.GEMINI_MAX_TOKENS,
  };
}

function getGeminiClient(config: LlmConfig): ChatGoogleGenerativeAI {
  if (!geminiModel) {
    geminiModel = new ChatGoogleGenerativeAI({
      apiKey: env.GEMINI_API_KEY,
      model: config.model,
      temperature: config.temperature,
      maxOutputTokens: config.maxTokens,
    });
  }
  return geminiModel;
}

function buildMessages(
  system: string | undefined,
  history: ChatTurn[],
  prompt: string,
): BaseMessage[] {

    const messages: BaseMessage[] = [];

    if (system) {
        messages.push(new SystemMessage(system));
    }

    for (const turn of history ?? []) {

        if (!turn.content) continue;

        if (turn.role === "user") {
            messages.push(new HumanMessage(turn.content));
        } else {
            messages.push(new AIMessage(turn.content));
        }
    }

    messages.push(new HumanMessage(prompt));

    return messages;
}

function parseJsonText(text: string): unknown {
  const trimmed = text.trim();
  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/);
  const candidate = fenced ? fenced[1].trim() : trimmed;
  try {
    return JSON.parse(candidate);
  } catch {
    const start = candidate.indexOf("[");
    const end = candidate.lastIndexOf("]");
    if (start !== -1 && end > start) {
      try {
        return JSON.parse(candidate.slice(start, end + 1));
      } catch {
        /* fall through */
      }
    }
    const objStart = candidate.indexOf("{");
    const objEnd = candidate.lastIndexOf("}");
    if (objStart !== -1 && objEnd > objStart) {
      try {
        return JSON.parse(candidate.slice(objStart, objEnd + 1));
      } catch {
        /* fall through */
      }
    }
    throw new Error("Could not parse JSON from model output");
  }
}

export async function generateWithGemini(
  prompt: string,
  options: GenerateOptions = {},
): Promise<GenerationResult> {
  const config = getConfig();
  const client = getGeminiClient(config);
  const messages = buildMessages(options.system, options.history ?? [], prompt);

  const content = await client.invoke(messages, {});
  const text = Array.isArray(content.content)
    ? content.content
        .map((c) =>
          typeof c === "string"
            ? c
            : c && typeof c === "object" && "text" in c && typeof (c as { text?: unknown }).text === "string"
              ? (c as { text: string }).text
              : "",
        )
        .join("")
    : String(content.content ?? "");

  const usage = content.usage_metadata as
    | { promptTokenCount?: number; candidatesTokenCount?: number }
    | undefined;

  return {
    text,
    tokenUsage: usage
      ? { input: usage.promptTokenCount ?? 0, output: usage.candidatesTokenCount ?? 0 }
      : undefined,
  };
}

export async function* streamWithGemini(
  prompt: string,
  options: GenerateOptions = {},
): AsyncGenerator<string> {
  const config = getConfig();
  const client = getGeminiClient(config);
  const messages = buildMessages(options.system, options.history ?? [], prompt);
  const stream = await client.stream(messages);
  for await (const chunk of stream) {
    const content = chunk.content;
    if (Array.isArray(content)) {
      for (const c of content) {
        if (typeof c === "string") yield c;
        else if (c && typeof c === "object" && "text" in c && typeof (c as { text?: unknown }).text === "string") yield (c as { text: string }).text;
      }
    } else if (content) {
      yield String(content);
    }
  }
}

type ContextChunk = {
  content: string;
  documentName?: string;
  chunkIndex?: number;
  score?: number;
};

function buildContextBlock(
  index: number,
  chunk: ContextChunk,
): string {
  const clean = chunk.content.replace(/\s+/g, " ").trim();

  const documentName = chunk.documentName?.trim() || "Unknown document";
  const chunkIndex =
    typeof chunk.chunkIndex === "number"
      ? chunk.chunkIndex
      : index - 1;

  const score =
    typeof chunk.score === "number"
      ? chunk.score.toFixed(3)
      : "n/a";

  return [
    `[${index}]`,
    `Document: ${documentName}`,
    `Chunk: ${chunkIndex}`,
    `Relevance: ${score}`,
    `Content: ${clean}`,
  ].join("\n");
}

export function buildContext(chunks: ContextChunk[]): string {
  return chunks
    .map((chunk, index) => buildContextBlock(index + 1, chunk))
    .join("\n\n");
}
export function fallbackAnswer(prompt: string): GenerationResult {
  const contextMatch = prompt.match(/CONTEXT:\n([\s\S]*?)\n\nCONVERSATION HISTORY:/);
  const questionMatch = prompt.match(/QUESTION:\n([\s\S]*?)\n\nRules:/) ??
    prompt.match(/QUESTION:\s*([\s\S]*)$/);
  const context = contextMatch ? contextMatch[1].trim() : "";
  const question = questionMatch ? questionMatch[1].trim().slice(0, 200) : "";

  if (!context) {
    return { text: "I could not find any relevant information in your documents to answer that question. Try rephrasing or uploading more documents.", tokenUsage: { input: 0, output: 0 } };
  }

  const firstBlock = context.split(/\[1\]/)[1]?.trim() ?? context.slice(0, 500);
  const answer = [
    "Here is what I found in your documents:",
    "",
    firstBlock.slice(0, 1200),
    "",
    question ? `> Question: ${question}` : "",
    "",
    "_(Offline demo mode: configure a GEMINI_API_KEY to enable AI-generated answers.)_",
  ]
    .filter(Boolean)
    .join("\n");

  return { text: answer, tokenUsage: { input: 0, output: 0 } };
}

export async function generate(
  prompt: string,
  options: GenerateOptions = {},
): Promise<GenerationResult> {
  if (hasGeminiKey()) {
    try {
      return await generateWithGemini(prompt, options);
    } catch (error) {
      logger.error("[LLM] Gemini generation failed, falling back to offline mode", error);
      return fallbackAnswer(prompt);
    }
  }
  if (options.json) {
    return { text: JSON.stringify([]), tokenUsage: { input: 0, output: 0 } };
  }
  return fallbackAnswer(prompt);
}

export async function* stream(
  prompt: string,
  options: GenerateOptions = {},
): AsyncGenerator<string> {
  if (hasGeminiKey()) {
    try {
      yield* streamWithGemini(prompt, options);
      return;
    } catch (error) {
      logger.error("[LLM] Gemini stream failed, falling back to offline mode", error);
    }
  }
  yield fallbackAnswer(prompt).text;
}

export async function generateJson<T>(
  prompt: string,
  options: GenerateOptions = {},
): Promise<T | null> {
  const result = await generate(prompt, { ...options, json: true });
  try {
    return parseJsonText(result.text) as T;
  } catch {
    logger.warn("[LLM] could not parse JSON output", result.text);
    return null;
  }
}

export async function getActiveAiSettings(): Promise<{
  model: string;
  provider: string;
  temperature: number;
  enabled: boolean;
}> {
  const [modelSetting, temperatureSetting] = await Promise.all([
    getSetting<string>("ai.model", env.GEMINI_MODEL),
    getSetting<number>("ai.temperature", env.GEMINI_TEMPERATURE),
  ]);
  return {
    model: modelSetting,
    provider: hasGeminiKey() ? "gemini" : "offline",
    temperature: temperatureSetting,
    enabled: hasGeminiKey(),
  };
}
