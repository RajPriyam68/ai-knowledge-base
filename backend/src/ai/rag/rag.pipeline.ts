import { retrieve, type RetrievalFilters } from "../retriever/retriever.service.js";
import { getPrompts } from "../prompts/prompts.js";
import {
  buildContext,
  generateJson,
  getActiveAiSettings,
  hasGeminiKey,
} from "../llm/llm.provider.js";
import {
  generate,
  type ChatTurn,
} from "../llm/llm.provider.js";
import type { Citation, RagResponse, RetrievalHit } from "../../types/index.js";
import { env } from "../../config/env.js";
import { estimateTokens } from "../../utils/text.js";

export interface RagRequest {
  question: string;
  filters: RetrievalFilters;
  history?: ChatTurn[];
  documentNames?: Map<string, string>;
}

export interface RagResult extends RagResponse {
  followUps: string[];
  hits: RetrievalHit[];
}

function buildHistoryText(history: ChatTurn[]): string {
  return history
    .slice(-6)
    .map((turn) => `${turn.role === "user" ? "User" : "Assistant"}: ${turn.content}`)
    .join("\n");
}

function buildCitations(hits: RetrievalHit[]): Citation[] {
  return hits.map((hit, index) => ({
    index: index + 1,
    documentId: hit.documentId,
    documentName: hit.documentName,
    chunkId: hit.chunkId,
    text: hit.content.slice(0, 400),
    score: Math.round(hit.score * 1000) / 1000,
  }));
}

async function suggestFollowUps(
  question: string,
  answer: string,
  history: ChatTurn[],
): Promise<string[]> {
  const prompts = await getPrompts();
  const prompt = prompts.followUpPrompt
    .replace("{question}", question.slice(0, 500))
    .replace("{answer}", answer.slice(0, 2000))
    .replace("{history}", buildHistoryText(history).slice(0, 1500));
  const parsed = await generateJson<string[]>(prompt, {
    history: [],
    temperature: 0.6,
  });
  if (Array.isArray(parsed)) {
    return parsed.filter((s): s is string => typeof s === "string" && s.trim().length > 0).slice(0, 3);
  }
  return [];
}

async function buildRetrievalQuery(
  question: string,
  history: ChatTurn[] = [],
): Promise<string> {
 if (!history.length || !hasGeminiKey()) {
  return question;
}

  const recentHistory = history
    .slice(-4)
    .map((turn) => `${turn.role}: ${turn.content}`)
    .join("\n");

  const result = await generate(
    `Rewrite the current question into a standalone search query.

Use the conversation history only to resolve references such as:
- he / she / they
- it / this / that
- them / those
- omitted names or topics

Preserve the user's original intent.
Do not answer the question.
Do not add information that is not present in the conversation.
Return ONLY the standalone search query.

CONVERSATION HISTORY:
${recentHistory}

CURRENT QUESTION:
${question}`,
    {
      temperature: 0,
    },
  );

  const rewritten = result.text.trim();

  return rewritten || question;
}
export async function runRag(request: RagRequest): Promise<RagResult> {
  const startedAt = Date.now();
const { question, filters, history } = request;

const retrievalQuery = await buildRetrievalQuery(question, history);

const hits = await retrieve(retrievalQuery, filters);
  if (hits.length === 0) {
    const noAnswer =
      "I could not find any relevant information in your documents to answer that question. " +
      "Try rephrasing, or upload documents that contain the answer.";
    const settings = await getActiveAiSettings();
    return {
      answer: noAnswer,
      citations: [],
      model: settings.model,
      provider: hasGeminiKey() ? "gemini" : "offline",
      latencyMs: Date.now() - startedAt,
      followUps: [],
      hits: [],
    };
  }

  const prompts = await getPrompts();
  const contextHits = [];
let contextTokens = 0;

for (const hit of hits) {
  const hitTokens = estimateTokens(hit.content);

  if (
    contextHits.length > 0 &&
    contextTokens + hitTokens > env.RAG_CONTEXT_MAX_TOKENS
  ) {
    break;
  }

  contextHits.push(hit);
  contextTokens += hitTokens;
}

const context = buildContext(contextHits);
  const historyText = buildHistoryText(history ?? []);

  const prompt = prompts.chatPrompt
    .replace("{context}", context)
    .replace("{history}", historyText)
    .replace("{question}", question);

  const result = await generate(prompt, {
    system: prompts.systemPrompt,
    history: history ?? [],
  });

  const citations = buildCitations(contextHits);
  const followUps = await suggestFollowUps(question, result.text, history ?? []);

  const settings = await getActiveAiSettings();
  return {
    answer: result.text,
    citations,
    model: settings.model,
    provider: hasGeminiKey() ? "gemini" : "offline",
    tokenUsage: result.tokenUsage,
    latencyMs: Date.now() - startedAt,
    followUps,
    hits,
  };
}

export async function runDocumentTask(
  task: "summarize" | "keypoints",
  text: string,
): Promise<string> {
  if (!hasGeminiKey()) {
    return task === "summarize" ? offlineSummarize(text) : offlineKeypoints(text);
  }
  const prompts = await getPrompts();
  const promptTemplate = task === "summarize" ? prompts.summarizePrompt : prompts.keypointsPrompt;
  const chunkSize = Math.max(2000, env.RAG_CHUNK_SIZE_TOKENS * 6);
  const pieces: string[] = [];
  for (let i = 0; i < text.length; i += chunkSize) {
    pieces.push(text.slice(i, i + chunkSize));
  }
  const prompt = promptTemplate.replace("{text}", pieces[0] ?? text);
  const result = await generate(prompt, {
    system: prompts.systemPrompt,
    temperature: 0.3,
  });
  return result.text;
}

export async function runFlashcards(text: string): Promise<{ question: string; answer: string }[]> {
  if (!hasGeminiKey()) {
    return offlineFlashcards(text);
  }
  const prompts = await getPrompts();
  const trimmed = text.slice(0, 8000);
  const prompt = prompts.flashcardsPrompt.replace("{text}", trimmed);
  const parsed = await generateJson<{ question: string; answer: string }[]>(prompt, {
    temperature: 0.5,
  });
  if (!Array.isArray(parsed)) return [];
  return parsed
    .filter(
      (c): c is { question: string; answer: string } =>
        typeof c?.question === "string" && typeof c?.answer === "string",
    )
    .slice(0, 12);
}

export async function runQuiz(
  text: string,
): Promise<{ question: string; options: string[]; correctIndex: number; explanation: string }[]> {
  if (!hasGeminiKey()) {
    return offlineQuiz(text);
  }
  const prompts = await getPrompts();
  const trimmed = text.slice(0, 8000);
  const prompt = prompts.quizPrompt.replace("{text}", trimmed);
  const parsed = await generateJson<{
    questions?: { question: string; options: string[]; correctIndex: number; explanation: string }[];
  }>(prompt, { temperature: 0.5 });

  const questions = parsed && Array.isArray((parsed as { questions?: unknown[] }).questions)
    ? (parsed as { questions: { question: string; options: string[]; correctIndex: number; explanation: string }[] }).questions
    : [];

  return questions
    .filter((q) => typeof q?.question === "string" && Array.isArray(q.options) && q.options.length > 0)
    .map((q) => ({
      question: q.question,
      options: q.options.slice(0, 4),
      correctIndex: Math.min(Math.max(Number(q.correctIndex) || 0, 0), q.options.length - 1),
      explanation: q.explanation ?? "",
    }))
    .slice(0, 10);
}

export function estimateContextTokens(hits: RetrievalHit[]): number {
  return hits.reduce((sum, hit) => sum + estimateTokens(hit.content), 0);
}

// -----------------------------------------------------------------------------
// Offline (no GEMINI_API_KEY) deterministic implementations
// -----------------------------------------------------------------------------

function splitSentences(text: string): string[] {
  return text
    .replace(/\s+/g, " ")
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 30);
}

function parseSections(text: string): { heading: string; body: string }[] {
  const lines = text.split("\n");
  const sections: { heading: string; body: string[] }[] = [];
  let current: { heading: string; body: string[] } = { heading: "Overview", body: [] };
  for (const line of lines) {
    const trimmed = line.trim();
    if (/^#{1,3}\s+/.test(trimmed)) {
      if (current.body.length > 0) sections.push(current);
      current = { heading: trimmed.replace(/^#{1,3}\s+/, ""), body: [] };
    } else if (trimmed) {
      current.body.push(trimmed);
    }
  }
  if (current.body.length > 0) sections.push(current);
  return sections.map((s) => ({ heading: s.heading, body: s.body.join(" ") }));
}

function offlineSummarize(text: string): string {
  const sections = parseSections(text);
  const parts = sections.map((s) => {
    const sentences = splitSentences(s.body);
    const lead = sentences.slice(0, 2).join(" ") || s.body.slice(0, 240);
    return `### ${s.heading}\n${lead}`;
  });
  const lead = parts.shift() ?? "";
  const rest = parts.length > 0 ? `\n\n${parts.join("\n\n")}` : "";
  const suffix =
    "\n\n_(Offline demo mode: configure a GEMINI_API_KEY to enable AI-generated summaries.)_";
  return `## Summary\n\n${lead}${rest}${suffix}`;
}

function offlineKeypoints(text: string): string {
  const sentences = splitSentences(text);
  const seen = new Set<string>();
  const points: string[] = [];
  for (const sentence of sentences) {
    const first = sentence.slice(0, 60).toLowerCase();
    if (seen.has(first)) continue;
    seen.add(first);
    points.push(sentence.replace(/\.$/, ""));
    if (points.length >= 8) break;
  }
  const list = points.length > 0 ? points.map((p, i) => `${i + 1}. ${p}`).join("\n") : text.slice(0, 600);
  return `## Key Points\n\n${list}\n\n_(Offline demo mode: configure a GEMINI_API_KEY to enable AI-generated key points.)_`;
}

function offlineFlashcards(text: string): { question: string; answer: string }[] {
  const sections = parseSections(text).filter((s) => s.heading !== "Overview");
  const cards: { question: string; answer: string }[] = [];
  for (const section of sections) {
    const sentences = splitSentences(section.body);
    const answer = sentences.slice(0, 2).join(" ") || section.body.slice(0, 300);
    if (answer.length > 20) {
      cards.push({ question: `What is covered under "${section.heading}"?`, answer });
    }
    if (cards.length >= 6) break;
  }
  if (cards.length === 0 && text.trim()) {
    const sentences = splitSentences(text);
    cards.push({
      question: "What is the document about?",
      answer: sentences.slice(0, 3).join(" ") || text.slice(0, 300),
    });
  }
  return cards.slice(0, 10);
}

function offlineQuiz(
  text: string,
): { question: string; options: string[]; correctIndex: number; explanation: string }[] {
  const sections = parseSections(text).filter((s) => s.heading !== "Overview");
  const questions: { question: string; options: string[]; correctIndex: number; explanation: string }[] =
    [];
  for (const section of sections.slice(0, 5)) {
    const sentences = splitSentences(section.body);
    if (sentences.length < 1) continue;
    const correct = sentences[0];
    const distractors = sentences.slice(1, 4);
    const options = [
      correct.slice(0, 120),
      ...distractors.map((d) => d.slice(0, 120)),
    ].filter(Boolean);
    if (options.length < 2) continue;
    questions.push({
      question: `Which statement best describes "${section.heading}"?`,
      options,
      correctIndex: 0,
      explanation: correct.slice(0, 200),
    });
  }
  return questions;
}
