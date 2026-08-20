"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Bot, User, Send, Loader2, FileText, FileDown } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { apiGet, apiPost, getErrorMessage } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/spinner";
import { useToast } from "@/components/ui/toast";
import { cn } from "@/lib/utils";
import type { ChatMessage, ChatResult, ChatItem } from "@/lib/types";

export default function ChatConversationPage() {
  const params = useParams<{ id: string }>();
  const chatId = params.id;
  const router = useRouter();
  const { toast } = useToast();
  const bottomRef = useRef<HTMLDivElement>(null);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [localMessages, setLocalMessages] = useState<ChatMessage[]>([]);

  const { data, isLoading } = useQuery({
    queryKey: ["chat", "detail", chatId],
    queryFn: () => apiGet<{ chat: ChatItem; messages: ChatMessage[] }>(`/chat/${chatId}`),
    retry: false,
  });

  const messages = useMemo(
    () => [...(data?.messages ?? []), ...localMessages],
    [data, localMessages],
  );

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, sending]);

  if (!isLoading && !data) {
    return (
      <div className="py-20 text-center">
        <p className="text-sm text-muted-foreground">Chat not found.</p>
        <Button variant="secondary" className="mt-4" onClick={() => router.push("/chat")}>
          Back to chats
        </Button>
      </div>
    );
  }

  const send = async () => {
    const question = input.trim();
    if (!question || sending) return;
    setInput("");
    setSending(true);
    setLocalMessages((prev) => [
      ...prev,
      { id: `u-${Date.now()}`, chatId, role: "USER", content: question, citations: null, createdAt: new Date().toISOString() },
    ]);
    try {
      const result = await apiPost<ChatResult>("/chat", { question, chatId });
      setLocalMessages((prev) => [
        ...prev,
        {
          id: `a-${Date.now()}`,
          chatId,
          role: "ASSISTANT",
          content: result.answer,
          citations: result.citations,
          createdAt: new Date().toISOString(),
        },
      ]);
    } catch (err) {
      setLocalMessages((prev) => [
        ...prev,
        {
          id: `a-${Date.now()}`,
          chatId,
          role: "ASSISTANT",
          content: `Error: ${getErrorMessage(err)}`,
          citations: null,
          createdAt: new Date().toISOString(),
        },
      ]);
      toast("error", "Chat request failed", getErrorMessage(err));
    } finally {
      setSending(false);
    }
  };

  const exportChat = (format: "markdown" | "pdf") => {
    window.open(`/api/chat/export/${chatId}?format=${format}`, "_blank");
  };

  return (
    <div className="mx-auto flex max-w-4xl flex-col space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => router.push("/chat")} aria-label="Back">
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="truncate text-lg font-semibold">{data?.chat.title ?? "Loading..."}</h1>
            <p className="text-xs text-muted-foreground">
              {messages.length} messages
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => exportChat("markdown")}>
            <FileText className="h-3.5 w-3.5" /> MD
          </Button>
          <Button variant="outline" size="sm" onClick={() => exportChat("pdf")}>
            <FileDown className="h-3.5 w-3.5" /> PDF
          </Button>
        </div>
      </div>

      <Card className="flex min-h-[60vh] flex-col overflow-hidden">
        <div className="flex-1 space-y-4 overflow-y-auto p-4 md:p-6">
          {isLoading && messages.length === 0 ? (
            <div className="space-y-4">
              <Skeleton className="h-16 w-3/4" />
              <Skeleton className="h-24 w-2/3" />
            </div>
          ) : messages.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center py-16 text-center">
              <Bot className="mb-3 h-10 w-10 text-muted-foreground" />
              <p className="text-sm font-medium">Start the conversation</p>
              <p className="mt-1 max-w-sm text-sm text-muted-foreground">
                Ask a question below. The assistant will answer using your knowledge base documents.
              </p>
            </div>
          ) : (
            messages.map((message) => <MessageRow key={message.id} message={message} />)
          )}

          {sending && (
            <div className="flex items-start gap-3">
              <div className="mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                <Bot className="h-4 w-4" />
              </div>
              <div className="flex items-center gap-2 rounded-2xl rounded-tl-sm border border-border bg-card px-4 py-3 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" /> Thinking...
              </div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        <div className="border-t border-border p-3 md:p-4">
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
              placeholder="Continue the conversation..."
              className="min-h-[44px] flex-1"
              rows={1}
            />
            <Button onClick={() => void send()} disabled={!input.trim() || sending} className="h-11 px-4">
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}

function MessageRow({ message }: { message: ChatMessage }) {
  const isUser = message.role === "USER";
  return (
    <div className={cn("flex items-start gap-3", isUser && "flex-row-reverse")}>
      <div
        className={cn(
          "mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-full",
          isUser ? "bg-secondary text-secondary-foreground" : "bg-primary/10 text-primary",
        )}
      >
        {isUser ? <User className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
      </div>
      <div
        className={cn(
          "max-w-[85%] rounded-2xl border px-4 py-3 text-sm leading-relaxed",
          isUser
            ? "rounded-tr-sm border-primary/20 bg-primary text-primary-foreground"
            : "rounded-tl-sm border-border bg-card",
        )}
      >
        <ReactMarkdown remarkPlugins={[remarkGfm]}>{message.content}</ReactMarkdown>

        {message.citations && message.citations.length > 0 && (
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
