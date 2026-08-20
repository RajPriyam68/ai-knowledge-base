"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import {
  Users,
  BookOpen,
  FileText,
  MessagesSquare,
  Activity,
  Cpu,
  Database,
  ArrowRight,
} from "lucide-react";
import { apiGet } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/spinner";
import { humanFileSize } from "@/lib/format";
import type { AnalyticsOverview } from "@/lib/types";

interface AdminStats {
  users: number;
  knowledgeBases: number;
  documents: number;
  chats: number;
  apiCalls: number;
  totalStorageBytes: number;
  environment: string;
  production: boolean;
  geminiEnabled: boolean;
}

interface AdminHealth {
  status: string;
  uptimeSeconds: number;
  database: { ok: boolean; latencyMs: number };
  ai: { provider: string; configured: boolean; model: string };
  storage: { bytes: number; fileCount: number };
  memory: { heapUsedMB: number; rssMB: number };
}

export default function AdminOverviewPage() {
  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ["admin", "stats"],
    queryFn: () => apiGet<AdminStats>("/admin/stats"),
  });
  const { data: health, isLoading: healthLoading } = useQuery({
    queryKey: ["admin", "health"],
    queryFn: () => apiGet<AdminHealth>("/admin/health"),
  });
  const { data: analytics } = useQuery({
    queryKey: ["admin", "analytics"],
    queryFn: () => apiGet<AnalyticsOverview>("/admin/analytics"),
  });

  const cards = [
    { label: "Users", value: stats?.users, icon: <Users className="h-5 w-5" />, href: "/admin/users" },
    { label: "Knowledge Bases", value: stats?.knowledgeBases, icon: <BookOpen className="h-5 w-5" />, href: "/admin" },
    { label: "Documents", value: stats?.documents, icon: <FileText className="h-5 w-5" />, href: "/admin" },
    { label: "Chats", value: stats?.chats, icon: <MessagesSquare className="h-5 w-5" />, href: "/admin" },
    { label: "API Calls", value: stats?.apiCalls, icon: <Activity className="h-5 w-5" />, href: "/admin/usage" },
  ];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-5">
        {cards.map((card) => (
          <Link key={card.label} href={card.href}>
            <Card className="transition-shadow hover:shadow-md">
              <CardContent className="p-4">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  {card.icon}
                </div>
                <p className="mt-3 text-xl font-bold leading-none">
                  {statsLoading ? <Skeleton className="h-6 w-10" /> : card.value}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">{card.label}</p>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Database className="h-4 w-4" /> System Health
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            {healthLoading ? (
              <Skeleton className="h-24 w-full" />
            ) : (
              <>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Status</span>
                  <Badge variant={health?.status === "healthy" ? "success" : "destructive"}>
                    {health?.status}
                  </Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Database</span>
                  <span className="font-medium">
                    {health?.database.ok ? "Connected" : "Error"} ({health?.database.latencyMs}ms)
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Uptime</span>
                  <span className="font-medium">{health?.uptimeSeconds}s</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Memory (heap)</span>
                  <span className="font-medium">{health?.memory.heapUsedMB} MB</span>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Cpu className="h-4 w-4" /> AI Configuration
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            {healthLoading ? (
              <Skeleton className="h-24 w-full" />
            ) : (
              <>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Provider</span>
                  <Badge variant={health?.ai.configured ? "success" : "warning"}>
                    {health?.ai.provider}
                  </Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Model</span>
                  <span className="font-medium">{health?.ai.model}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Storage on disk</span>
                  <span className="font-medium">{humanFileSize(health?.storage.bytes ?? 0)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Environment</span>
                  <span className="font-medium">{stats?.environment}</span>
                </div>
                <Link href="/admin/ai-config" className="inline-flex items-center gap-1 text-xs text-primary hover:underline">
                  Configure AI <ArrowRight className="h-3 w-3" />
                </Link>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Platform Totals</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-4 text-sm md:grid-cols-4">
          <div>
            <p className="text-muted-foreground">Total storage</p>
            <p className="text-lg font-bold">{humanFileSize(stats?.totalStorageBytes ?? 0)}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Analytics events</p>
            <p className="text-lg font-bold">{analytics?.apiCalls ?? 0}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Chunks indexed</p>
            <p className="text-lg font-bold">{analytics?.chunks ?? 0}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Errors</p>
            <p className="text-lg font-bold">{analytics?.errors ?? 0}</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
