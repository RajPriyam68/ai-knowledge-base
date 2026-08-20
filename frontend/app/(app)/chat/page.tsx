"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { MessagesSquare, MessageSquareText, Trash2, Clock } from "lucide-react";
import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiDelete, apiGet, getErrorMessage } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { EmptyState, Skeleton } from "@/components/ui/spinner";
import { ConfirmDialog } from "@/components/ui/modal";
import { useToast } from "@/components/ui/toast";
import { timeAgo } from "@/lib/format";
import type { ChatItem } from "@/lib/types";

export default function ChatHistoryPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [deleting, setDeleting] = useState<ChatItem | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["chat", "history", search],
    queryFn: () => apiGet<{ items: ChatItem[] }>(`/chat/history${search ? `?q=${encodeURIComponent(search)}` : ""}`),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiDelete(`/chat/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["chat", "history"] });
      setDeleting(null);
      toast("success", "Chat deleted");
    },
    onError: (err) => toast("error", "Failed to delete chat", getErrorMessage(err)),
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Chat History</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Your past conversations with your knowledge bases.
        </p>
      </div>

      <div className="max-w-sm">
        <Input
          placeholder="Search conversations..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {isLoading ? (
        <div className="space-y-2">
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-16 w-full" />
        </div>
      ) : !data?.items.length ? (
        <EmptyState
          icon={<MessagesSquare className="h-10 w-10" />}
          title={search ? "No matching chats" : "No chats yet"}
          description={
            search
              ? "Try a different search term."
              : "Open a knowledge base and ask a question to start a conversation."
          }
          action={
            !search ? (
              <Link href="/kbs">
                <Button>Browse Knowledge Bases</Button>
              </Link>
            ) : undefined
          }
        />
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {data.items.map((chat) => (
            <Card key={chat.id} className="group relative p-4 transition-shadow hover:shadow-md">
              <div className="flex items-start justify-between gap-3">
                <Link href={`/chat/${chat.id}`} className="min-w-0 flex-1">
                  <div className="flex items-center gap-2.5">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                      <MessageSquareText className="h-4 w-4" />
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">{chat.title}</p>
                      <p className="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground">
                        <Clock className="h-3 w-3" /> {timeAgo(chat.updatedAt)}
                      </p>
                    </div>
                  </div>
                </Link>
                <button
                  onClick={() => setDeleting(chat)}
                  className="rounded-lg p-1.5 text-muted-foreground opacity-0 transition-opacity hover:bg-destructive/10 hover:text-destructive group-hover:opacity-100"
                  aria-label="Delete chat"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
              {chat.kb && (
                <p className="mt-2 text-xs text-muted-foreground">
                  KB: <span className="font-medium">{chat.kb.name}</span>
                </p>
              )}
            </Card>
          ))}
        </div>
      )}

      <ConfirmDialog
        open={!!deleting}
        onClose={() => setDeleting(null)}
        onConfirm={() => deleting && deleteMutation.mutate(deleting.id)}
        title="Delete conversation?"
        message={`This will permanently delete "${deleting?.title}".`}
        loading={deleteMutation.isPending}
      />
    </div>
  );
}
