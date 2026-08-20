"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Send, Sparkles, Bot, User, Loader2 } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { apiPost, getErrorMessage } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/input";
import { useToast } from "@/components/ui/toast";
import { cn } from "@/lib/utils";
import type { ChatResult, Citation } from "@/lib/types";

interface LocalMessage {
  id: string;
  role: "USER" | "ASSISTANT";
  content: string;
  citations: Citation[];
  provider?: string;
}

export function KbChat({ kbId }: { kbId: string }) {
  const router = useRouter();
  const { toast } = useToast();
  const [messages, setMessages] = useState<LocalMessage[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, sending]);

  const send = async (text?: string) => {
    const question = (text ?? input).trim();
    if (!question || sending) return;
    setInput("");
    setSending(true);
    setMessages((prev) => [
      ...prev,
      { id: `u-${Date.now()}`, role: "USER", content: question, citations: [] },
    ]);
    try {
      const result = await apiPost<ChatResult>("/chat", {
        question,
        kbId,
      });
      setMessages((prev) => [
        ...prev,
        {
          id: `a-${Date.now()}`,
          role: "ASSISTANT",
          content: result.answer,
          citations: result.citations,
          provider: result.provider,
        },
      ]);
      if (result.chatId) {
        router.replace(`/chat/${result.chatId}`);
      }
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        {
          id: `a-${Date.now()}`,
          role: "ASSISTANT",
          content: `Error: ${getErrorMessage(err)}`,
          citations: [],
        },
      ]);
      toast("error", "Chat request failed", getErrorMessage(err));
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="flex h-full min-h-[480px] flex-col">
      <div className="flex-1 space-y-4 overflow-y-auto p-4">
        {messages.length === 0 && (
          <div className="flex h-full flex-col items-center justify-center py-16 text-center">
            <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
              <Sparkles className="h-6 w-6" />
            </div>
            <h3 className="text-sm font-semibold">Ask this knowledge base</h3>
            <p className="mt-1 max-w-sm text-sm text-muted-foreground">
              Ask questions about the documents in this knowledge base. Answers include citations
              back to the source material.
            </p>
          </div>
        )}

        {messages.map((message) => (
          <MessageBubble key={message.id} message={message} />
        ))}

        {sending && (
          <div className="flex items-start gap-3">
            <div className="mt-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
              <Bot className="h-4 w-4" />
            </div>
            <div className="flex items-center gap-2 rounded-2xl rounded-tl-sm border border-border bg-card px-4 py-3 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Thinking...
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      <div className="border-t border-border p-3">
        <div className="flex items-end gap-2">
          <Textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                void send();
              }
            }}
            placeholder="Ask a question about your documents..."
            className="min-h-[44px] flex-1"
            rows={1}
          />
          <Button
            onClick={() => void send()}
            disabled={!input.trim() || sending}
            className="h-11 px-4"
            aria-label="Send"
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
        <p className="mt-1.5 text-center text-[11px] text-muted-foreground">
          Answers are grounded in your uploaded documents with AI-provided citations.
        </p>
      </div>
    </div>
  );
}

function MessageBubble({ message }: { message: LocalMessage }) {
  const isUser = message.role === "USER";
  return (
    <div className={cn("flex items-start gap-3", isUser && "flex-row-reverse")}>
      <div
        className={cn(
          "mt-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold",
          isUser ? "bg-secondary text-secondary-foreground" : "bg-primary/10 text-primary",
        )}
      >
        {isUser ? <User className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
      </div>
      <div
        className={cn(
          "max-w-[85%] rounded-2xl border px-4 py-3 text-sm",
          isUser
            ? "rounded-tr-sm border-primary/20 bg-primary text-primary-foreground"
            : "rounded-tl-sm border-border bg-card",
        )}
      >
        <ReactMarkdown remarkPlugins={[remarkGfm]}>{message.content}</ReactMarkdown>

        {message.citations.length > 0 && (
          <div className="mt-3 border-t border-border/60 pt-2">
            <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
              Sources
            </p>
            <ul className="mt-1 space-y-0.5">
              {message.citations.map((citation) => (
                <li key={citation.index} className="text-xs text-muted-foreground">
                  [{citation.index}] {citation.documentName}{" "}
                  <span className="text-[10px]">(score {citation.score})</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}
