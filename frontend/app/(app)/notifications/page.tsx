"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Bell, BellOff, CheckCheck, Check, Info } from "lucide-react";
import { apiGet, apiPatch, getErrorMessage } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState, Skeleton } from "@/components/ui/spinner";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/toast";
import { cn } from "@/lib/utils";
import { timeAgo } from "@/lib/format";
import type { NotificationItem } from "@/lib/types";

export default function NotificationsPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ["notifications", "list"],
    queryFn: () => apiGet<{ items: NotificationItem[] }>("/notifications"),
  });

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["notifications"] });
  };

  const markRead = useMutation({
    mutationFn: (id: string) => apiPatch(`/notifications/${id}/read`),
    onSuccess: invalidate,
    onError: (err) => toast("error", "Failed to update", getErrorMessage(err)),
  });

  const markAllRead = useMutation({
    mutationFn: () => apiPatch("/notifications/read-all"),
    onSuccess: () => {
      invalidate();
      toast("success", "All notifications marked as read");
    },
    onError: (err) => toast("error", "Failed to update", getErrorMessage(err)),
  });

  const items = data?.items ?? [];
  const unread = items.filter((n) => !n.isRead).length;

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Notifications</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {unread > 0 ? `${unread} unread notification${unread > 1 ? "s" : ""}` : "You're all caught up."}
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={() => markAllRead.mutate()} disabled={unread === 0}>
          <CheckCheck className="h-4 w-4" /> Mark all read
        </Button>
      </div>

      {isLoading ? (
        <div className="space-y-2">
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-16 w-full" />
        </div>
      ) : items.length === 0 ? (
        <EmptyState
          icon={<BellOff className="h-10 w-10" />}
          title="No notifications"
          description="Notifications about document processing and system events will appear here."
        />
      ) : (
        <div className="space-y-2">
          {items.map((notification) => (
            <Card
              key={notification.id}
              className={cn("p-4 transition-colors", !notification.isRead && "border-primary/40 bg-primary/[0.03]")}
            >
              <div className="flex items-start gap-3">
                <div
                  className={cn(
                    "mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full",
                    notification.isRead ? "bg-muted text-muted-foreground" : "bg-primary/10 text-primary",
                  )}
                >
                  <Bell className="h-4 w-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-sm font-medium">{notification.title}</p>
                    <div className="flex shrink-0 items-center gap-2">
                      <span className="text-[11px] text-muted-foreground">
                        {timeAgo(notification.createdAt)}
                      </span>
                      {!notification.isRead && <Badge variant="default">New</Badge>}
                    </div>
                  </div>
                  {notification.body && (
                    <p className="mt-1 text-sm text-muted-foreground">{notification.body}</p>
                  )}
                </div>
                {!notification.isRead && (
                  <button
                    onClick={() => markRead.mutate(notification.id)}
                    className="rounded-lg p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground"
                    aria-label="Mark as read"
                  >
                    <Check className="h-4 w-4" />
                  </button>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}

      <p className="flex items-center justify-center gap-1.5 text-xs text-muted-foreground">
        <Info className="h-3.5 w-3.5" /> Notifications are kept for 30 days.
      </p>
    </div>
  );
}
