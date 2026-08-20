"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Search, Shield, ShieldOff, Trash2, UserX, CheckCircle2 } from "lucide-react";
import { apiDelete, apiGet, apiPut, getErrorMessage } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input, Select } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/spinner";
import { ConfirmDialog } from "@/components/ui/modal";
import { useToast } from "@/components/ui/toast";
import { formatDate } from "@/lib/format";
import type { User } from "@/lib/types";

interface AdminUser extends User {
  createdAt?: string;
  _count?: { knowledgeBases: number; documents: number; chats: number; sessions: number };
}

export default function AdminUsersPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("");
  const [deleting, setDeleting] = useState<AdminUser | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["admin", "users", search, roleFilter],
    queryFn: () =>
      apiGet<{ total: number; items: AdminUser[] }>(
        `/admin/users?page=1&pageSize=50${search ? `&search=${encodeURIComponent(search)}` : ""}${roleFilter ? `&role=${roleFilter}` : ""}`,
      ),
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["admin", "users"] });

  const toggleSuspension = useMutation({
    mutationFn: ({ id, suspend }: { id: string; suspend: boolean }) =>
      apiPut(`/admin/users/${id}`, { isSuspended: suspend }),
    onSuccess: () => {
      invalidate();
      toast("success", "User status updated");
    },
    onError: (err) => toast("error", "Update failed", getErrorMessage(err)),
  });

  const toggleRole = useMutation({
    mutationFn: ({ id, role }: { id: string; role: string }) => apiPut(`/admin/users/${id}`, { role }),
    onSuccess: () => {
      invalidate();
      toast("success", "Role updated");
    },
    onError: (err) => toast("error", "Update failed", getErrorMessage(err)),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiDelete(`/admin/users/${id}`),
    onSuccess: () => {
      invalidate();
      setDeleting(null);
      toast("success", "User deleted");
    },
    onError: (err) => toast("error", "Delete failed", getErrorMessage(err)),
  });

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative min-w-56 flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search by name or email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)} className="w-36">
          <option value="">All roles</option>
          <option value="USER">User</option>
          <option value="ADMIN">Admin</option>
        </Select>
      </div>

      <Card className="overflow-hidden">
        {isLoading ? (
          <div className="space-y-2 p-4">
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/50 text-left text-xs uppercase tracking-wider text-muted-foreground">
                <th className="px-4 py-3 font-medium">User</th>
                <th className="px-4 py-3 font-medium">Role</th>
                <th className="hidden px-4 py-3 font-medium md:table-cell">Status</th>
                <th className="hidden px-4 py-3 font-medium md:table-cell">Resources</th>
                <th className="hidden px-4 py-3 font-medium lg:table-cell">Joined</th>
                <th className="px-4 py-3 text-right font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {data?.items.map((user) => (
                <tr key={user.id} className="hover:bg-accent/40">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="flex h-9 w-9 items-center justify-center rounded-full bg-secondary text-sm font-semibold">
                        {user.name?.charAt(0).toUpperCase() ?? "U"}
                      </div>
                      <div className="min-w-0">
                        <p className="truncate font-medium">{user.name}</p>
                        <p className="truncate text-xs text-muted-foreground">{user.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <Badge variant={user.role === "ADMIN" ? "default" : "secondary"}>{user.role}</Badge>
                      {user.role === "USER" && (
                        <button
                          onClick={() => toggleRole.mutate({ id: user.id, role: "ADMIN" })}
                          className="text-xs text-muted-foreground underline-offset-2 hover:text-foreground hover:underline"
                        >
                          Make admin
                        </button>
                      )}
                    </div>
                  </td>
                  <td className="hidden px-4 py-3 md:table-cell">
                    <Badge variant={user.isSuspended ? "destructive" : "success"}>
                      {user.isSuspended ? "Suspended" : "Active"}
                    </Badge>
                  </td>
                  <td className="hidden px-4 py-3 text-xs text-muted-foreground md:table-cell">
                    {user._count?.knowledgeBases} KBs · {user._count?.documents} docs · {user._count?.chats} chats
                  </td>
                  <td className="hidden px-4 py-3 text-muted-foreground lg:table-cell">
                    {formatDate(user.createdAt ?? "")}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1">
                      {user.isSuspended ? (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => toggleSuspension.mutate({ id: user.id, suspend: false })}
                          loading={toggleSuspension.isPending}
                          title="Unsuspend"
                        >
                          <CheckCircle2 className="h-4 w-4 text-[hsl(var(--success))]" />
                        </Button>
                      ) : (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => toggleSuspension.mutate({ id: user.id, suspend: true })}
                          loading={toggleSuspension.isPending}
                          title="Suspend"
                        >
                          <UserX className="h-4 w-4 text-[hsl(var(--warning))]" />
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => toggleRole.mutate({ id: user.id, role: user.role === "ADMIN" ? "USER" : "ADMIN" })}
                        title={user.role === "ADMIN" ? "Demote to user" : "Promote to admin"}
                      >
                        {user.role === "ADMIN" ? (
                          <ShieldOff className="h-4 w-4" />
                        ) : (
                          <Shield className="h-4 w-4" />
                        )}
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-destructive hover:bg-destructive/10"
                        onClick={() => setDeleting(user)}
                        title="Delete user"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>

      <p className="text-xs text-muted-foreground">Showing {data?.items.length ?? 0} of {data?.total ?? 0} users.</p>

      <ConfirmDialog
        open={!!deleting}
        onClose={() => setDeleting(null)}
        onConfirm={() => deleting && deleteMutation.mutate(deleting.id)}
        title="Delete user?"
        message={`This permanently deletes the account of "${deleting?.email}" and all their data. This cannot be undone.`}
        loading={deleteMutation.isPending}
      />
    </div>
  );
}
