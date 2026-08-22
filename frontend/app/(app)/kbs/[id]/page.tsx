"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { notFound, useParams } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  BookOpen,
  MessageSquare,
  HardDrive,
  Users,
} from "lucide-react";
import { useState } from "react";
import {
  apiDelete,
  apiGet,
  apiPatch,
  apiPost,
  apiPut,
  getErrorMessage,
} from "@/lib/api";
import { useToast } from "@/components/ui/toast";
import { Input } from "@/components/ui/input";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/spinner";
import { DocumentUpload } from "@/components/documents/document-upload";
import { DocumentList } from "@/components/documents/document-list";
import { KbChat } from "@/components/kb/kb-chat";
import { cn } from "@/lib/utils";
import type { KnowledgeBase, DocumentItem } from "@/lib/types";

type KnowledgeBaseStats = {
  id: string;
  name: string;
  documents: number;
  chats: number;
  chunks: number;
  totalStorageBytes: number;
};

type Tab = "documents" | "members" | "chat";

export default function KbDetailPage() {
  const params = useParams<{ id: string }>();
  const kbId = params.id;
  const [tab, setTab] = useState<Tab>("documents");
  const [editingName, setEditingName] = useState(false);
const [nameValue, setNameValue] = useState("");
const [memberEmail, setMemberEmail] = useState("");
const [memberRole, setMemberRole] = useState<"EDITOR" | "VIEWER">("VIEWER");
const [showAddMember, setShowAddMember] = useState(false);

  const { data: kb, isLoading: kbLoading } = useQuery({
    queryKey: ["kb", "detail", kbId],
    queryFn: () => apiGet<KnowledgeBase>(`/kb/${kbId}`),
    retry: false,
  });

  const { data: docsData, isLoading: docsLoading, refetch: refetchDocs } = useQuery({
    queryKey: ["documents", kbId],
    queryFn: () => apiGet<{ items: DocumentItem[] }>(`/documents?kbId=${kbId}`),
  });
const {
  data: membersData,
  isLoading: membersLoading,
} = useQuery<
  Array<{
    id: string;
    role: "OWNER" | "EDITOR" | "VIEWER";
    user: {
      id: string;
      name: string;
      email: string;
      avatarUrl?: string | null;
    };
  }>
>({
  queryKey: ["kb-members", kbId],
  queryFn: () =>
    apiGet<
      Array<{
        id: string;
        role: "OWNER" | "EDITOR" | "VIEWER";
        user: {
          id: string;
          name: string;
          email: string;
          avatarUrl?: string | null;
        };
      }>
    >(`/kb/${kbId}/members`),
  enabled: !!kbId,
});
const { data: stats } = useQuery<KnowledgeBaseStats>({queryKey: ["kb-stats", kbId],
  queryFn: () => apiGet<KnowledgeBaseStats>(`/kb/${kbId}/stats`),
  enabled: !!kbId,
});
const { toast } = useToast();
const queryClient = useQueryClient();
const updateMutation = useMutation({
  mutationFn: (payload: {
    name?: string;
    description?: string;
    icon?: string;
    color?: string;
    visibility?: "PRIVATE" | "SHARED" | "PUBLIC";
  }) => apiPut(`/kb/${kbId}`, payload),

  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: ["kb", "detail", kbId] });
    queryClient.invalidateQueries({ queryKey: ["kb", "list"] });
    toast("success", "Knowledge base updated");
  },

  onError: (err) =>
    toast("error", "Failed to update", getErrorMessage(err)),
});
const archiveMutation = useMutation({
  mutationFn: () => apiPatch(`/kb/${kbId}/archive`, {}),

  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: ["kb", "detail", kbId] });
    queryClient.invalidateQueries({ queryKey: ["kb", "list"] });
    toast("success", "Knowledge base archived");
  },

  onError: (err) =>
    toast("error", "Failed to archive", getErrorMessage(err)),
});
const restoreMutation = useMutation({
  mutationFn: () => apiPatch(`/kb/${kbId}/restore`, {}),

  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: ["kb", "detail", kbId] });
    queryClient.invalidateQueries({ queryKey: ["kb", "list"] });
    toast("success", "Knowledge base restored");
  },

  onError: (err) =>
    toast("error", "Failed to restore", getErrorMessage(err)),
});
const deleteMutation = useMutation({
  mutationFn: () => apiDelete(`/kb/${kbId}`),

  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: ["kb", "list"] });
    queryClient.invalidateQueries({ queryKey: ["kb", "stats"] });
    toast("success", "Knowledge base deleted");
    window.location.href = "/kbs";
  },

  onError: (err) =>
    toast("error", "Failed to delete", getErrorMessage(err)),
});
  const addMemberMutation = useMutation({
  mutationFn: () =>
    apiPost(`/kb/${kbId}/members`, {
      userId: memberEmail.trim(),
      role: memberRole,
    }),

  onSuccess: () => {
    queryClient.invalidateQueries({
      queryKey: ["kb-members", kbId],
    });

    setMemberEmail("");
    setMemberRole("VIEWER");

    toast("success", "Member added");
  },

  onError: (err) =>
    toast("error", "Failed to add member", getErrorMessage(err)),
});

  if (kbLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-40 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!kb) {
    notFound();
  }

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/kbs"
          className="mb-3 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" /> Knowledge Bases
        </Link>
       <div className="flex flex-wrap items-start justify-between gap-4">
  <div className="flex min-w-0 items-start gap-3">
    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
      <BookOpen className="h-5 w-5" />
    </div>

    <div className="min-w-0">
      <div className="flex flex-wrap items-center gap-2">
        <h1 className="truncate text-2xl font-bold tracking-tight">
          {kb.name}
        </h1>
        <button
  type="button"
  onClick={() => {
    setNameValue(kb.name);
    setEditingName(true);
  }}
  className="text-sm text-primary hover:underline"
>
  Rename
</button>
{kb.isArchived ? (
  <button
    type="button"
    disabled={restoreMutation.isPending}
    onClick={() => restoreMutation.mutate()}
    className="text-sm text-primary hover:underline disabled:opacity-50"
  >
    {restoreMutation.isPending ? "Restoring..." : "Restore"}
  </button>
) : (
  <button
    type="button"
    disabled={archiveMutation.isPending}
    onClick={() => archiveMutation.mutate()}
    className="text-sm text-primary hover:underline disabled:opacity-50"
  >
    {archiveMutation.isPending ? "Archiving..." : "Archive"}
  </button>
)}
<button
  type="button"
  disabled={deleteMutation.isPending}
  onClick={() => {
    const confirmed = window.confirm(
      `Delete "${kb.name}" permanently? This action cannot be undone.`,
    );

    if (confirmed) {
      deleteMutation.mutate();
    }
  }}
  className="text-sm text-destructive hover:underline disabled:opacity-50"
>
  {deleteMutation.isPending ? "Deleting..." : "Delete"}
</button>

        <Badge variant="secondary">
          {kb.visibility ?? "PRIVATE"}
        </Badge>

        {kb.isArchived && (
          <Badge variant="outline">
            Archived
          </Badge>
        )}
      </div>
{editingName && (
  <div className="mt-2 flex items-center gap-2">
    <input
      value={nameValue}
      onChange={(e) => setNameValue(e.target.value)}
      className="h-9 rounded-md border border-border bg-background px-3 text-sm"
      autoFocus
    />

    <button
      type="button"
      disabled={!nameValue.trim() || updateMutation.isPending}
      onClick={() => {
        updateMutation.mutate(
          { name: nameValue.trim() },
          {
            onSuccess: () => {
              setEditingName(false);
            },
          },
        );
      }}
      className="rounded-md bg-primary px-3 py-2 text-sm text-primary-foreground disabled:opacity-50"
    >
      {updateMutation.isPending ? "Saving..." : "Save"}
    </button>

    <button
      type="button"
      onClick={() => setEditingName(false)}
      className="rounded-md border border-border px-3 py-2 text-sm"
    >
      Cancel
    </button>
  </div>
)}
      {kb.description && (
        <p className="mt-1 text-sm text-muted-foreground">
          {kb.description}
        </p>
      )}

      <div className="mt-3 flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
        <span className="inline-flex items-center gap-1.5">
          <BookOpen className="h-4 w-4" />
          {stats?.documents ?? kb._count?.documents ?? 0} documents
        </span>

        <span className="inline-flex items-center gap-1.5">
          <MessageSquare className="h-4 w-4" />
          {stats?.chats ?? kb._count?.chats ?? 0} chats
        </span>

        <span className="inline-flex items-center gap-1.5">
          <HardDrive className="h-4 w-4" />
          {formatBytes(stats?.totalStorageBytes ?? kb.totalSize ?? 0)}
        </span>
      </div>
    </div>
  </div>
</div>
      </div>

      <div className="flex gap-1 rounded-lg border border-border bg-card p-1">
        {(["documents", "members", "chat"] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={cn(
              "flex-1 rounded-md px-4 py-2 text-sm font-medium capitalize transition-colors",
              tab === t ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-accent",
            )}
          >
            {t}
          </button>
        ))}
      </div>

   { tab === "documents" ? (
  
  <div className="space-y-6">
    <Card>
      <CardHeader>
        <CardTitle>Upload Documents</CardTitle>
      </CardHeader>

      <CardContent>
        <DocumentUpload
          kbId={kbId}
          onUploaded={() => void refetchDocs()}
        />
      </CardContent>
    </Card>

    {docsLoading ? (
      <Skeleton className="h-64 w-full" />
    ) : (
      <Card>
        <CardHeader>
          <CardTitle>
            Documents ({docsData?.items?.length ?? 0})
          </CardTitle>
        </CardHeader>

        <CardContent>
          <DocumentList
            documents={docsData?.items ?? []}
          />
        </CardContent>
      </Card>
    )}
  </div>
) : tab === "members" ? (
  <>
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>Members</CardTitle>
          <p className="text-sm text-muted-foreground">
            Manage who can access this knowledge base.
          </p>
        </div>

        <Button onClick={() => setShowAddMember(true)}>
          <Users className="mr-2 h-4 w-4" />
          Add Member
        </Button>
      </CardHeader>

      <CardContent>
        {membersLoading ? (
          <Skeleton className="h-32 w-full" />
        ) : membersData?.length ? (
          <div className="space-y-3">
            {membersData.map((member) => (
              <div
                key={member.id}
                className="flex items-center justify-between rounded-lg border border-border p-4"
              >
                <div className="min-w-0">
                  <p className="font-medium">{member.user.name}</p>
                  <p className="truncate text-sm text-muted-foreground">
                    {member.user.email}
                  </p>
                </div>

                <Badge variant="secondary">{member.role}</Badge>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">
            No members found.
          </p>
        )}
      </CardContent>
    </Card>

    {showAddMember && (
      <Card>
        <CardHeader>
          <CardTitle>Add Member</CardTitle>
        </CardHeader>

        <CardContent className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">User ID</label>

            <Input
              placeholder="Enter user ID"
              value={memberEmail}
              onChange={(e) => setMemberEmail(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Role</label>

            <select
              className="w-full rounded-md border bg-background px-3 py-2 text-sm"
              value={memberRole}
              onChange={(e) =>
                setMemberRole(e.target.value as "EDITOR" | "VIEWER")
              }
            >
              <option value="VIEWER">Viewer</option>
              <option value="EDITOR">Editor</option>
            </select>
          </div>

          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => setShowAddMember(false)}
            >
              Cancel
            </Button>

            <Button
              onClick={() => addMemberMutation.mutate()}
              disabled={
                !memberEmail.trim() || addMemberMutation.isPending
              }
            >
              {addMemberMutation.isPending ? "Adding..." : "Add Member"}
            </Button>
          </div>
        </CardContent>
      </Card>
    )}
  </>

) : (
  <Card className="overflow-hidden">
    <CardHeader className="border-b border-border bg-muted/30">
      <CardTitle>Ask {kb.name}</CardTitle>
    </CardHeader>

    <CardContent className="p-0">
      <KbChat kbId={kbId} />
    </CardContent>
  </Card>
)}
    </div>
  );
}
function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";

  const units = ["B", "KB", "MB", "GB", "TB"];
  const index = Math.floor(Math.log(bytes) / Math.log(1024));

  return `${(bytes / Math.pow(1024, index)).toFixed(
    index === 0 ? 0 : 1
  )} ${units[index] ?? "TB"}`;
}
