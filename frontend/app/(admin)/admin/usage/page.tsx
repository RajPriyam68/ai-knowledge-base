"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Activity } from "lucide-react";
import { apiGet } from "@/lib/api";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton, EmptyState } from "@/components/ui/spinner";
import { formatDate } from "@/lib/format";
import type { ApiUsageRow } from "@/lib/types";

export default function AdminUsagePage() {
  const [endpoint, setEndpoint] = useState("");
  const [page, setPage] = useState(1);
  const [appliedEndpoint, setAppliedEndpoint] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["admin", "usage", appliedEndpoint, page],
    queryFn: () =>
      apiGet<{ total: number; page: number; pageSize: number; items: ApiUsageRow[] }>(
        `/admin/api-usage?page=${page}&pageSize=25${appliedEndpoint ? `&search=${encodeURIComponent(appliedEndpoint)}` : ""}`,
      ),
  });

  const totalPages = data ? Math.max(1, Math.ceil(data.total / 25)) : 1;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <Input
          placeholder="Filter by endpoint..."
          value={endpoint}
          onChange={(e) => setEndpoint(e.target.value)}
          className="max-w-64"
        />
        <Button
          variant="outline"
          size="md"
          onClick={() => {
            setAppliedEndpoint(endpoint.trim());
            setPage(1);
          }}
        >
          Apply
        </Button>
      </div>

      <Card className="overflow-hidden">
        {isLoading ? (
          <div className="space-y-2 p-4">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
        ) : !data?.items.length ? (
          <EmptyState
            icon={<Activity className="h-10 w-10" />}
            title="No API activity"
            description="Requests will appear here as users interact with the API."
          />
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/50 text-left text-xs uppercase tracking-wider text-muted-foreground">
                <th className="px-4 py-3 font-medium">Time</th>
                <th className="px-4 py-3 font-medium">Method</th>
                <th className="px-4 py-3 font-medium">Endpoint</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="hidden px-4 py-3 font-medium md:table-cell">Duration</th>
                <th className="hidden px-4 py-3 font-medium lg:table-cell">User</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {data.items.map((row) => (
                <tr key={row.id} className="hover:bg-accent/40">
                  <td className="px-4 py-2.5 text-xs text-muted-foreground">{formatDate(row.createdAt)}</td>
                  <td className="px-4 py-2.5">
                    <Badge variant="outline">{row.method}</Badge>
                  </td>
                  <td className="px-4 py-2.5">
                    <code className="rounded bg-muted px-1.5 py-0.5 text-xs">{row.endpoint}</code>
                  </td>
                  <td className="px-4 py-2.5">
                    <Badge variant={row.statusCode >= 500 ? "destructive" : row.statusCode >= 400 ? "warning" : "success"}>
                      {row.statusCode}
                    </Badge>
                  </td>
                  <td className="hidden px-4 py-2.5 text-xs text-muted-foreground md:table-cell">
                    {row.durationMs}ms
                  </td>
                  <td className="hidden px-4 py-2.5 text-xs text-muted-foreground lg:table-cell">
                    {row.user?.email ?? "anonymous"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>

      <div className="flex items-center justify-between">
        <p className="text-xs text-muted-foreground">
          Page {data?.page ?? 1} of {totalPages} · {data?.total ?? 0} requests
        </p>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
            Previous
          </Button>
          <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>
            Next
          </Button>
        </div>
      </div>
    </div>
  );
}
