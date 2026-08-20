"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Trash2, Save } from "lucide-react";
import { apiDelete, apiGet, apiPost, getErrorMessage } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/spinner";
import { Modal, ConfirmDialog } from "@/components/ui/modal";
import { useToast } from "@/components/ui/toast";
import { formatDate } from "@/lib/format";

interface SettingItem {
  key: string;
  value: unknown;
  description: string | null;
  updatedAt: string;
}

export default function AdminSettingsPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [newKey, setNewKey] = useState("");
  const [newValue, setNewValue] = useState("");
  const [editing, setEditing] = useState<SettingItem | null>(null);
  const [editValue, setEditValue] = useState("");
  const [deleting, setDeleting] = useState<SettingItem | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["admin", "settings"],
    queryFn: () => apiGet<SettingItem[]>("/admin/settings"),
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["admin", "settings"] });

  const createMutation = useMutation({
    mutationFn: (payload: { key: string; value: string }) => apiPost("/admin/settings", payload),
    onSuccess: () => {
      invalidate();
      setNewKey("");
      setNewValue("");
      toast("success", "Setting created");
    },
    onError: (err) => toast("error", "Failed to create setting", getErrorMessage(err)),
  });

  const updateMutation = useMutation({
    mutationFn: ({ key, value }: { key: string; value: string }) =>
      apiPost("/admin/settings", { key, value }),
    onSuccess: () => {
      invalidate();
      setEditing(null);
      toast("success", "Setting updated");
    },
    onError: (err) => toast("error", "Failed to update setting", getErrorMessage(err)),
  });

  const deleteMutation = useMutation({
    mutationFn: (key: string) => apiDelete(`/admin/settings/${encodeURIComponent(key)}`),
    onSuccess: () => {
      invalidate();
      setDeleting(null);
      toast("success", "Setting deleted");
    },
    onError: (err) => toast("error", "Failed to delete setting", getErrorMessage(err)),
  });

  const displayValue = (value: unknown): string => {
    if (value === null || value === undefined) return "null";
    if (typeof value === "object") return JSON.stringify(value);
    return String(value);
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Plus className="h-4 w-4" /> Add Setting
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap items-end gap-3">
          <Input
            label="Key"
            placeholder="e.g. app.siteName"
            value={newKey}
            onChange={(e) => setNewKey(e.target.value)}
            className="max-w-56"
          />
          <Input
            label="Value"
            placeholder="e.g. My Knowledge Base"
            value={newValue}
            onChange={(e) => setNewValue(e.target.value)}
            className="max-w-64"
          />
          <Button
            onClick={() => createMutation.mutate({ key: newKey.trim(), value: newValue })}
            disabled={!newKey.trim()}
            loading={createMutation.isPending}
          >
            <Save className="h-4 w-4" /> Add
          </Button>
        </CardContent>
      </Card>

      <Card className="overflow-hidden">
        {isLoading ? (
          <div className="space-y-2 p-4">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/50 text-left text-xs uppercase tracking-wider text-muted-foreground">
                <th className="px-4 py-3 font-medium">Key</th>
                <th className="px-4 py-3 font-medium">Value</th>
                <th className="hidden px-4 py-3 font-medium md:table-cell">Description</th>
                <th className="hidden px-4 py-3 font-medium lg:table-cell">Updated</th>
                <th className="px-4 py-3 text-right font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {(data ?? []).map((setting) => (
                <tr key={setting.key} className="hover:bg-accent/40">
                  <td className="px-4 py-3">
                    <code className="rounded bg-muted px-1.5 py-0.5 text-xs">{setting.key}</code>
                  </td>
                  <td className="max-w-[220px] truncate px-4 py-3 font-mono text-xs">
                    {displayValue(setting.value)}
                  </td>
                  <td className="hidden max-w-[220px] truncate px-4 py-3 text-muted-foreground md:table-cell">
                    {setting.description ?? "—"}
                  </td>
                  <td className="hidden px-4 py-3 text-xs text-muted-foreground lg:table-cell">
                    {formatDate(setting.updatedAt)}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setEditing(setting);
                          setEditValue(displayValue(setting.value));
                        }}
                      >
                        <Save className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-destructive hover:bg-destructive/10"
                        onClick={() => setDeleting(setting)}
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

      <Modal
        open={!!editing}
        onClose={() => setEditing(null)}
        title={`Edit setting: ${editing?.key}`}
        footer={
          <>
            <Button variant="secondary" onClick={() => setEditing(null)}>
              Cancel
            </Button>
            <Button
              onClick={() => editing && updateMutation.mutate({ key: editing.key, value: editValue })}
              loading={updateMutation.isPending}
            >
              Save
            </Button>
          </>
        }
      >
        <Input
          label="Value"
          value={editValue}
          onChange={(e) => setEditValue(e.target.value)}
          autoFocus
        />
        {editing?.description && (
          <p className="mt-2 text-xs text-muted-foreground">{editing.description}</p>
        )}
      </Modal>

      <ConfirmDialog
        open={!!deleting}
        onClose={() => setDeleting(null)}
        onConfirm={() => deleting && deleteMutation.mutate(deleting.key)}
        title="Delete setting?"
        message={`This will remove the setting "${deleting?.key}" and restore its default value.`}
        loading={deleteMutation.isPending}
      />
    </div>
  );
}
