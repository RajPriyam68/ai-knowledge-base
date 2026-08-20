"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import {
  BookOpen,
  FileText,
  Layers,
  MessagesSquare,
  ArrowRight,
  Clock,
} from "lucide-react";
import { apiGet } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/spinner";
import { EmptyState } from "@/components/ui/spinner";
import type { KbStats, KnowledgeBase, ChatItem } from "@/lib/types";
import { Button } from "@/components/ui/button";

export default function DashboardPage() {
  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ["kb", "stats"],
    queryFn: () => apiGet<KbStats>("/kb/stats"),
  });

  const { data: kbs, isLoading: kbsLoading } = useQuery({
    queryKey: ["kb", "list"],
    queryFn: () => apiGet<{ items: KnowledgeBase[] }>("/kb"),
  });

  const { data: chats, isLoading: chatsLoading } = useQuery({
    queryKey: ["chat", "history"],
    queryFn: () => apiGet<{ items: ChatItem[] }>("/chat/history"),
  });

  const statCards = [
    { label: "Knowledge Bases", value: stats?.kbCount ?? 0, icon: <BookOpen className="h-5 w-5" /> },
    { label: "Documents", value: stats?.documentCount ?? 0, icon: <FileText className="h-5 w-5" /> },
    { label: "Chunks", value: stats?.chunkCount ?? 0, icon: <Layers className="h-5 w-5" /> },
    { label: "Chats", value: stats?.chatCount ?? 0, icon: <MessagesSquare className="h-5 w-5" /> },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Overview of your knowledge base workspace.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {statCards.map((card) => (
          <Card key={card.label}>
            <CardContent className="flex items-center gap-3 p-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                {card.icon}
              </div>
              <div>
                <p className="text-lg font-bold leading-none">
                  {statsLoading ? <Skeleton className="h-6 w-10" /> : card.value}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">{card.label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader className="flex-row items-center justify-between space-y-0">
            <CardTitle>Recent Knowledge Bases</CardTitle>
            <Link href="/kbs">
              <Button variant="ghost" size="sm">
                View all <ArrowRight className="h-3.5 w-3.5" />
              </Button>
            </Link>
          </CardHeader>
          <CardContent>
            {kbsLoading ? (
              <div className="space-y-2">
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
              </div>
            ) : !kbs?.items.length ? (
              <EmptyState
                icon={<BookOpen className="h-8 w-8" />}
                title="No knowledge bases yet"
                description="Create your first knowledge base to start uploading documents."
                action={
                  <Link href="/kbs">
                    <Button size="sm">Create one</Button>
                  </Link>
                }
              />
            ) : (
              <ul className="divide-y divide-border">
                {kbs.items.slice(0, 5).map((kb) => (
                  <li key={kb.id}>
                    <Link
                      href={`/kbs/${kb.id}`}
                      className="flex items-center justify-between gap-3 py-3 transition-colors hover:bg-accent/50"
                    >
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium">{kb.name}</p>
                        {kb.description && (
                          <p className="truncate text-xs text-muted-foreground">{kb.description}</p>
                        )}
                      </div>
                      <Badge variant="secondary">{kb._count?.documents ?? 0} docs</Badge>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex-row items-center justify-between space-y-0">
            <CardTitle>Recent Chats</CardTitle>
            <Link href="/chat">
              <Button variant="ghost" size="sm">
                View all <ArrowRight className="h-3.5 w-3.5" />
              </Button>
            </Link>
          </CardHeader>
          <CardContent>
            {chatsLoading ? (
              <div className="space-y-2">
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
              </div>
            ) : !chats?.items.length ? (
              <EmptyState
                icon={<MessagesSquare className="h-8 w-8" />}
                title="No chats yet"
                description="Open a knowledge base and ask your first question."
              />
            ) : (
              <ul className="divide-y divide-border">
                {chats.items.slice(0, 5).map((chat) => (
                  <li key={chat.id}>
                    <Link
                      href={`/chat/${chat.id}`}
                      className="flex items-center justify-between gap-3 py-3 transition-colors hover:bg-accent/50"
                    >
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium">{chat.title}</p>
                        <p className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Clock className="h-3 w-3" />
                          {new Date(chat.updatedAt).toLocaleString()}
                        </p>
                      </div>
                      <Badge variant="outline">{chat._count?.messages ?? 0} messages</Badge>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
