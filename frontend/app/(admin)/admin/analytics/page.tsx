"use client";

import { useQuery } from "@tanstack/react-query";
import { Users, BookOpen, FileText, MessagesSquare, Cpu, HardDrive, ArrowUpRight } from "lucide-react";
import { apiGet } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/spinner";
import { humanFileSize } from "@/lib/format";

interface AnalyticsData {
  totalUsers: number;
  newUsers7d: number;
  totalKnowledgeBases: number;
  totalDocuments: number;
  totalChats: number;
  totalMessages: number;
  totalChunks: number;
  totalStorageBytes: number;
  totalApiCalls: number;
  aiCalls7d: number;
  usersByRole: { role: string; count: number }[];
  events7d: { date: string; count: number }[];
  popularEndpoints: { endpoint: string; count: number }[];
  documentsByDay: { date: string; count: number }[];
  storage: { onDiskBytes: number; onDiskFiles: number; trackedBytes: number };
  storageByUser: { userId: string; email: string; name: string; documents: number; bytes: number }[];
  apiTotals: unknown;
}

function MiniBarChart({ data, label }: { data: { date: string; count: number }[]; label: string }) {
  const max = Math.max(1, ...data.map((d) => d.count));
  return (
    <div>
      <p className="mb-2 text-xs font-medium text-muted-foreground">{label}</p>
      {data.length === 0 ? (
        <p className="py-6 text-center text-xs text-muted-foreground">No data in the last 7 days</p>
      ) : (
        <div className="flex h-24 items-end gap-1">
          {data.map((d) => (
            <div key={d.date} className="flex flex-1 flex-col items-center gap-1">
              <div
                className="w-full rounded-t bg-primary/70 transition-all"
                style={{ height: `${Math.max(4, (d.count / max) * 80)}px` }}
                title={`${d.date}: ${d.count}`}
              />
              <span className="text-[9px] text-muted-foreground">
                {new Date(d.date).toLocaleDateString(undefined, { month: "numeric", day: "numeric" })}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function AdminAnalyticsPage() {
  const { data, isLoading } = useQuery({
    queryKey: ["admin", "analytics"],
    queryFn: () => apiGet<AnalyticsData>("/admin/analytics"),
  });

  if (isLoading) {
    return (
      <div className="grid gap-4 lg:grid-cols-2">
        <Skeleton className="h-48 w-full" />
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }

  const cards = [
    { label: "Users", value: data?.totalUsers, sub: `${data?.newUsers7d ?? 0} new in 7d`, icon: <Users className="h-4 w-4" /> },
    { label: "Knowledge Bases", value: data?.totalKnowledgeBases, sub: "total", icon: <BookOpen className="h-4 w-4" /> },
    { label: "Documents", value: data?.totalDocuments, sub: "total", icon: <FileText className="h-4 w-4" /> },
    { label: "Chats", value: data?.totalChats, sub: `${data?.totalMessages ?? 0} messages`, icon: <MessagesSquare className="h-4 w-4" /> },
    { label: "API Calls", value: data?.totalApiCalls, sub: `${data?.aiCalls7d ?? 0} AI calls in 7d`, icon: <ArrowUpRight className="h-4 w-4" /> },
    { label: "Chunks Indexed", value: data?.totalChunks, sub: "vectorized", icon: <Cpu className="h-4 w-4" /> },
  ];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
        {cards.map((card) => (
          <Card key={card.label}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <p className="text-xs text-muted-foreground">{card.label}</p>
                <div className="text-primary">{card.icon}</div>
              </div>
              <p className="mt-2 text-2xl font-bold leading-none">{card.value}</p>
              <p className="mt-1 text-xs text-muted-foreground">{card.sub}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Events (last 7 days)</CardTitle>
          </CardHeader>
          <CardContent>
            <MiniBarChart data={data?.events7d ?? []} label="Analytics events per day" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Documents Uploaded (last 7 days)</CardTitle>
          </CardHeader>
          <CardContent>
            <MiniBarChart data={data?.documentsByDay ?? []} label="Documents per day" />
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Popular Endpoints (7d)</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {(data?.popularEndpoints ?? []).map((ep) => (
                <li key={ep.endpoint} className="flex items-center justify-between text-sm">
                  <code className="rounded bg-muted px-2 py-0.5 text-xs">{ep.endpoint}</code>
                  <span className="font-medium">{ep.count}</span>
                </li>
              ))}
              {(data?.popularEndpoints ?? []).length === 0 && (
                <p className="text-sm text-muted-foreground">No API activity in the last 7 days.</p>
              )}
            </ul>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Storage by User</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {(data?.storageByUser ?? []).map((u) => (
                <li key={u.userId} className="flex items-center justify-between text-sm">
                  <div className="min-w-0">
                    <p className="truncate font-medium">{u.name}</p>
                    <p className="truncate text-xs text-muted-foreground">{u.email}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-medium">{humanFileSize(u.bytes)}</p>
                    <p className="text-xs text-muted-foreground">{u.documents} docs</p>
                  </div>
                </li>
              ))}
              {(data?.storageByUser ?? []).length === 0 && (
                <p className="text-sm text-muted-foreground">
                  <HardDrive className="mr-1 inline h-4 w-4" />
                  No documents stored yet.
                </p>
              )}
            </ul>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
