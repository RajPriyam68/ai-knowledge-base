import { getSetting } from "../../repositories/settings.repo.js";

export interface PromptConfig {
  systemPrompt: string;
  chatPrompt: string;
  followUpPrompt: string;
  summarizePrompt: string;
  keypointsPrompt: string;
  flashcardsPrompt: string;
  quizPrompt: string;
}

export const DEFAULT_PROMPTS: PromptConfig = {
  systemPrompt: [
 
  "You are a helpful, accurate AI assistant for a knowledge base platform.",
  "Answer questions strictly and exclusively using the provided CONTEXT.",
  "Treat the CONTEXT as the only authoritative source for document-based questions.",
  "Do not use outside knowledge, assumptions, memory, or general world knowledge.",
  "If the answer is not explicitly supported by the CONTEXT, say that the information is not available in the provided documents.",
  "Ignore context sections that are irrelevant to the user's question.",
  "Never combine unrelated documents to construct an answer.",
  "Use citations like [1], [2] only when the corresponding context section supports the statement.",
  "Never invent, infer, or hallucinate facts that are not supported by the CONTEXT.",
  "Use markdown formatting for clarity. Keep answers concise and well-structured.",
].join("\n"),
  
   chatPrompt:
  "You are answering questions about the user's documents.\n\n" +
  "CONTEXT:\n{context}\n\n" +
  "CONVERSATION HISTORY:\n{history}\n\n" +
  "QUESTION:\n{question}\n\n" +
  "Rules:\n" +
  "1. Use ONLY information from the CONTEXT to answer the QUESTION.\n" +
  "2. First determine which context sections are relevant to the QUESTION.\n" +
  "3. Ignore irrelevant or unrelated context sections completely.\n" +
  "4. Do not use outside knowledge, memory, assumptions, or general knowledge.\n" +
  "5. If the relevant CONTEXT does not contain enough information to answer the QUESTION, respond: \"The information is not available in the provided documents.\"\n" +
  "6. Never combine unrelated documents to create an answer.\n" +
  "7. Cite supporting sources inline like [1], [2], matching the context block numbers.\n" +
  "8. Only cite a source when it actually supports the statement.\n" +
  "9. Be precise, concise, and professional.",
  followUpPrompt:
    "Based on the current conversation context, suggest 3 short follow-up questions the user might ask next. " +
    "Return ONLY a JSON array of strings, no markdown.\n\n" +
    "CONVERSATION:\n{history}\n\n" +
    "LAST QUESTION: {question}\n" +
    "LAST ANSWER: {answer}\n" +
    "Follow-up questions JSON array:",
  summarizePrompt:
    "Summarize the following document content in a clear, structured summary. " +
    "Use sections and bullet points when helpful.\n\nDOCUMENT:\n{text}\n\nSUMMARY:",
  keypointsPrompt:
    "Extract the most important key points from the following content. " +
    "Return a numbered list of concise, standalone key points.\n\nCONTENT:\n{text}\n\nKEY POINTS:",
  flashcardsPrompt:
    "Generate flashcards from the following content for study purposes. " +
    "Return ONLY a JSON array of objects with fields \"question\" and \"answer\". " +
    "Generate between 5 and 10 flashcards.\n\nCONTENT:\n{text}\n\nFLASHCARDS JSON:",
  quizPrompt:
    "Generate a quiz from the following content. Return ONLY a JSON object with shape " +
    '{"questions": [{"question": string, "options": string[], "correctIndex": number, "explanation": string}]}. ' +
    "Generate 5 questions, each with 4 options and exactly one correct answer.\n\nCONTENT:\n{text}\n\nQUIZ JSON:",
};

export async function getPrompts(): Promise<PromptConfig> {
  const [systemPrompt, chatPrompt, followUpPrompt, summarizePrompt, keypointsPrompt, flashcardsPrompt, quizPrompt] =
    await Promise.all([
      getSetting<string>("prompt.systemPrompt", DEFAULT_PROMPTS.systemPrompt),
      getSetting<string>("prompt.chatPrompt", DEFAULT_PROMPTS.chatPrompt),
      getSetting<string>("prompt.followUpPrompt", DEFAULT_PROMPTS.followUpPrompt),
      getSetting<string>("prompt.summarizePrompt", DEFAULT_PROMPTS.summarizePrompt),
      getSetting<string>("prompt.keypointsPrompt", DEFAULT_PROMPTS.keypointsPrompt),
      getSetting<string>("prompt.flashcardsPrompt", DEFAULT_PROMPTS.flashcardsPrompt),
      getSetting<string>("prompt.quizPrompt", DEFAULT_PROMPTS.quizPrompt),
    ]);

  return {
    systemPrompt,
    chatPrompt,
    followUpPrompt,
    summarizePrompt,
    keypointsPrompt,
    flashcardsPrompt,
    quizPrompt,
  };
}

export async function resetPrompts(): Promise<void> {
  await import("../../repositories/settings.repo.js").then(async (mod) => {
    for (const key of Object.keys(DEFAULT_PROMPTS)) {
      await mod.setSetting(`prompt.${key}`, DEFAULT_PROMPTS[key as keyof PromptConfig]);
    }
  });
}
