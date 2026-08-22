"use client";

import { useState } from "react";
import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Archive,
  ArchiveRestore,
  BookOpen,
  Brain,
  Database,
  Code,
  Folder,
  Plus,
  Pencil,
  Trash2,
  MoreHorizontal,
} from "lucide-react";
import { apiDelete, apiGet, apiPatch, apiPost, apiPut, getErrorMessage } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input, Textarea } from "@/components/ui/input";
import { Skeleton, EmptyState } from "@/components/ui/spinner";
import { Modal, ConfirmDialog } from "@/components/ui/modal";
import { useToast } from "@/components/ui/toast";
import type { KnowledgeBase } from "@/lib/types";

const KB_ICONS = {
  BookOpen,
  Brain,
  Database,
  Code,
  Folder,
} as const;
export default function KbsPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [createOpen, setCreateOpen] = useState(false);
  const [editing, setEditing] = useState<KnowledgeBase | null>(null);
  const [deleting, setDeleting] = useState<KnowledgeBase | null>(null);
  const [menuOpen, setMenuOpen] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [visibility, setVisibility] = useState<
  "ALL" | "PRIVATE" | "SHARED" | "PUBLIC"
>("ALL");
const [sort, setSort] = useState<
  "updated_desc" | "name_asc" | "name_desc"
>("updated_desc");
const [archived, setArchived] = useState(false);

const { data, isLoading } = useQuery({
  queryKey: ["kb", "list", search, visibility, sort, archived],
  queryFn: () => {
    const params = new URLSearchParams();
    if (search.trim()) {
      params.set("q", search.trim());
    }
    if (visibility !== "ALL") {
      params.set("visibility", visibility);
    }
    if (sort !== "updated_desc") {
  params.set("sort", sort);
}
    params.set("archived", String(archived));

    const query = params.toString();

    return apiGet<{ items: KnowledgeBase[] }>(
      query ? `/kb?${query}` : "/kb",
    );
  },
});
  const createMutation = useMutation({
    mutationFn: (payload: {name: string;
  description?: string;
  icon: string;
  color: string;
  visibility: "PRIVATE" | "SHARED" | "PUBLIC";  }) => apiPost<KnowledgeBase>("/kb", payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["kb", "list"] });
      queryClient.invalidateQueries({ queryKey: ["kb", "stats"] });
      setCreateOpen(false);
      toast("success", "Knowledge base created");
    },
    onError: (err) => toast("error", "Failed to create", getErrorMessage(err)),
  });

  const updateMutation = useMutation({
    mutationFn: ({
  id,
  payload,
}: {
  id: string;
  payload: {
    name?: string;
    description?: string;
    icon?: string;
    color?: string;
    visibility?: "PRIVATE" | "SHARED" | "PUBLIC";
  };
}) => apiPut<KnowledgeBase>(`/kb/${id}`, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["kb", "list"] });
      setEditing(null);
      toast("success", "Knowledge base updated");
    },
    onError: (err) => toast("error", "Failed to update", getErrorMessage(err)),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiDelete(`/kb/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["kb", "list"] });
      queryClient.invalidateQueries({ queryKey: ["kb", "stats"] });
      setDeleting(null);
      toast("success", "Knowledge base deleted");
    },
    onError: (err) => toast("error", "Failed to delete", getErrorMessage(err)),
  });

 const archiveMutation = useMutation({
  mutationFn: (id: string) =>
    apiPatch(`/kb/${id}/archive`, {}),

  onSuccess: () => {
    queryClient.invalidateQueries({
      queryKey: ["kb", "list"],
    });

    toast("success", "Knowledge base archived");
  },

  onError: (error) => {
    toast("error", "Archive failed", getErrorMessage(error));
  },
});
 const restoreMutation = useMutation({
  mutationFn: (id: string) =>
    apiPatch(`/kb/${id}/restore`, {}),

  onSuccess: () => {
    queryClient.invalidateQueries({
      queryKey: ["kb", "list"],
    });

    toast("success", "Knowledge base restored");
  },

  onError: (error) => {
    toast("error", "Restore failed", getErrorMessage(error));
  },
});
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Knowledge Bases</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Organize documents and chat with them using AI.
          </p>
        </div>
        <Button onClick={() => setCreateOpen(true)}>
          <Plus className="h-4 w-4" /> New Knowledge Base
        </Button>
      </div>
      <div className="flex items-center gap-3">
  <Input
    value={search}
    onChange={(e) => setSearch(e.target.value)}
    placeholder="Search knowledge bases..."
    className="max-w-md"
  />
  <select
  value={visibility}
  onChange={(e) =>
    setVisibility(
      e.target.value as "ALL" | "PRIVATE" | "SHARED" | "PUBLIC",
    )
  }
  className="h-10 rounded-md border px-3 text-sm"
>

  <option value="ALL">All Visibility</option>
  <option value="PRIVATE">Private</option>
  <option value="SHARED">Shared</option>
  <option value="PUBLIC">Public</option>
</select>
<select
  value={archived ? "archived" : "active"}
  onChange={(e) =>
    setArchived(e.target.value === "archived")
  }
  className="h-10 rounded-md border px-3 text-sm"
>
  <option value="active">Active</option>
  <option value="archived">Archived</option>
</select>
<select
  value={sort}
  onChange={(e) =>
    setSort(
      e.target.value as "updated_desc" | "name_asc" | "name_desc",
    )
  }
  className="h-10 rounded-md border px-3 text-sm"
>

  <option value="updated_desc">Recently Updated</option>
  <option value="name_asc">Name A → Z</option>
  <option value="name_desc">Name Z → A</option>
</select>
</div>
      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Skeleton className="h-40 w-full" />
          <Skeleton className="h-40 w-full" />
          <Skeleton className="h-40 w-full" />
        </div>
      ) : !data?.items.length ? (
        <EmptyState
          icon={<BookOpen className="h-10 w-10" />}
          title="No knowledge bases yet"
          description="Create your first knowledge base, upload documents, and start asking questions."
          action={
            <Button onClick={() => setCreateOpen(true)}>
              <Plus className="h-4 w-4" /> Create Knowledge Base
            </Button>
          }
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {data.items.map((kb) => (
            <Card key={kb.id} className="group relative">
              <CardHeader>
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2.5">
                    <div
  className="flex h-9 w-9 items-center justify-center rounded-lg text-white"
  style={{
    backgroundColor: kb.color || "#2563eb",
  }}
>
 {(() => {
  const Icon = KB_ICONS[kb.icon as keyof typeof KB_ICONS] ?? BookOpen;

  return <Icon className="h-4.5 w-4.5" />;
})()}
</div>

                    <div className="min-w-0">
                      <CardTitle className="truncate text-sm">{kb.name}</CardTitle>
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        {kb._count?.documents ?? 0} documents
                      </p>
                    </div>
                  </div>
                  <div className="relative">
                    <button
                      onClick={() => setMenuOpen(menuOpen === kb.id ? null : kb.id)}
                      className="rounded-lg p-1.5 text-muted-foreground hover:bg-accent"
                      aria-label="Actions"
                    >
                      <MoreHorizontal className="h-4 w-4" />
                    </button>
                    {menuOpen === kb.id && (
                      <>
                        <div className="fixed inset-0 z-10" onClick={() => setMenuOpen(null)} />
                        <div className="absolute right-0 z-20 mt-1 w-40 overflow-hidden rounded-lg border border-border bg-card shadow-lg">
                          <button
                            onClick={() => {
                              setEditing(kb);
                              setMenuOpen(null);
                            }}
                            className="flex w-full items-center gap-2 px-3 py-2 text-sm hover:bg-accent"
                          >
                            <Pencil className="h-3.5 w-3.5" /> Rename
                          </button>
   {archived ? (
  <button
    type="button"
    onClick={() => {
      setMenuOpen(null);
      restoreMutation.mutate(kb.id);
    }}
    disabled={restoreMutation.isPending}
    className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-muted"
  >
    <ArchiveRestore className="h-4 w-4" />
    Restore
  </button>
) : (
  <button
    type="button"
    onClick={() => {
      setMenuOpen(null);
      archiveMutation.mutate(kb.id);
    }}
    disabled={archiveMutation.isPending}
    className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-muted"
  >
    <Archive className="h-4 w-4" />
    Archive
  </button>
)}
                          <button
                            onClick={() => {
                              setDeleting(kb);
                              setMenuOpen(null);
                            }}
                            className="flex w-full items-center gap-2 px-3 py-2 text-sm text-destructive hover:bg-destructive/10"
                          >
                            <Trash2 className="h-3.5 w-3.5" /> Delete
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <p className="line-clamp-2 min-h-[2.5rem] text-sm text-muted-foreground">
                  {kb.description || "No description"}
                </p>
                <Link href={`/kbs/${kb.id}`}>
                  <Button variant="outline" size="sm" className="mt-4 w-full">
                    Open knowledge base
                  </Button>
                </Link>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <CreateKbModal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onSubmit={(payload) => createMutation.mutate(payload)}
        loading={createMutation.isPending}
      />

      <EditKbModal
        kb={editing}
        onClose={() => setEditing(null)}
        onSubmit={(payload) => editing && updateMutation.mutate({ id: editing.id, payload })}
        loading={updateMutation.isPending}
      />

      <ConfirmDialog
        open={!!deleting}
        onClose={() => setDeleting(null)}
        onConfirm={() => deleting && deleteMutation.mutate(deleting.id)}
        title="Delete knowledge base?"
        message={`This will permanently delete "${deleting?.name}" and all its documents and chats. This action cannot be undone.`}
        loading={deleteMutation.isPending}
      />
    </div>
  );
}

function CreateKbModal({
  open,
  onClose,
  onSubmit,
  loading,
}: {
  open: boolean;
  onClose: () => void;
  onSubmit: (
  payload: {
    name: string;
    description?: string;
    icon: string;
    color: string;
    visibility: "PRIVATE" | "SHARED" | "PUBLIC";
  }
) => void;
  loading: boolean;
}) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [icon, setIcon] = useState("BookOpen");
  const [color, setColor] = useState("#2563eb");
  const [visibility, setVisibility] = useState<"PRIVATE" | "SHARED" | "PUBLIC">("PRIVATE");
  return (
    <Modal
      open={open}
      onClose={onClose}
      title="New Knowledge Base"
      description="Create a workspace to organize your documents."
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button
            onClick={() => {
              if (!name.trim()) return;
             onSubmit({
  name: name.trim(),
  description: description.trim() || undefined,
  icon,
  color,
  visibility,
});
              setName("");
              setDescription("");
              setIcon("BookOpen");
              setColor("#2563eb");
              setVisibility("PRIVATE");
            }}
            loading={loading}
          >
            Create
          </Button>
        </>
      }
    >
      <div className="space-y-4">

  <Input
    label="Name"
    value={name}
    onChange={(e) => setName(e.target.value)}
    placeholder="e.g. Product Documentation"
    autoFocus
  />

  <Textarea
    label="Description (optional)"
    value={description}
    onChange={(e) => setDescription(e.target.value)}
    placeholder="What is this knowledge base about?"
  />

  <div>
    <label className="mb-1 block text-sm font-medium">
      Icon
    </label>

    <select
      value={icon}
      onChange={(e) => setIcon(e.target.value)}
      className="w-full rounded-lg border border-border bg-background px-3 py-2"
    >
      <option value="BookOpen">📚 Book</option>
      <option value="Brain">🧠 Brain</option>
      <option value="Database">🗄 Database</option>
      <option value="Code">💻 Code</option>
      <option value="Folder">📁 Folder</option>
    </select>
  </div>

  <div>
    <label className="mb-1 block text-sm font-medium">
      Color
    </label>

    <input
      type="color"
      value={color}
      onChange={(e) => setColor(e.target.value)}
      className="h-10 w-full cursor-pointer rounded-lg"
    />
  </div>

  <div>
    <label className="mb-1 block text-sm font-medium">
      Visibility
    </label>

    <select
      value={visibility}
      onChange={(e) =>
        setVisibility(
          e.target.value as
            | "PRIVATE"
            | "SHARED"
            | "PUBLIC"
        )
      }
      className="w-full rounded-lg border border-border bg-background px-3 py-2"
    >
      <option value="PRIVATE">Private</option>
      <option value="SHARED">Shared</option>
      <option value="PUBLIC">Public</option>
    </select>
  </div>

</div>
    </Modal>
  );
}

function EditKbModal({
  kb,
  onClose,
  onSubmit,
  loading,
}: {
  kb: KnowledgeBase | null;
  onClose: () => void;
  onSubmit: (
  payload: {
    name?: string;
    description?: string;

    icon?: string;
    color?: string;
    visibility?: "PRIVATE" | "SHARED" | "PUBLIC";
  }
) => void;
  loading: boolean;
}) {
  const [name, setName] = useState(kb?.name ?? "");
  const [description, setDescription] = useState(kb?.description ?? "");
  const [icon, setIcon] = useState(kb?.icon ?? "BookOpen");
  const [color, setColor] = useState(kb?.color ?? "#2563eb");
  const [visibility, setVisibility] = useState<
  "PRIVATE" | "SHARED" | "PUBLIC"
  >(kb?.visibility ?? "PRIVATE");


  return (
    <Modal
      open={!!kb}
      onClose={onClose}
      title="Edit Knowledge Base"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button
            onClick={() => onSubmit({
  name: name.trim(),
  description: description.trim() || undefined,
  icon,
  color,
  visibility,
})
 } loading={loading}
          >
            Save
          </Button>
        </>
      }
    >
     <Input
  label="Name"
  value={name}
  onChange={(e) => setName(e.target.value)}
  autoFocus
  placeholder={kb?.name}
/>

<Textarea
  label="Description"
  value={description}
  onChange={(e) => setDescription(e.target.value)}
  placeholder={kb?.description ?? "No description"}
/>

<div>
  <label className="mb-1 block text-sm font-medium">
    Icon
  </label>

  <select
    value={icon}
    onChange={(e) => setIcon(e.target.value)}
    className="w-full rounded-lg border border-border bg-background px-3 py-2"
  >
    <option value="BookOpen">📚 Book</option>
    <option value="Brain">🧠 Brain</option>
    <option value="Database">🗄 Database</option>
    <option value="Code">💻 Code</option>
    <option value="Folder">📁 Folder</option>
  </select>
</div>

<div>
  <label className="mb-1 block text-sm font-medium">
    Color
  </label>

  <input
    type="color"
    value={color}
    onChange={(e) => setColor(e.target.value)}
    className="h-10 w-full cursor-pointer rounded-lg"
  />
</div>

<div>
  <label className="mb-1 block text-sm font-medium">
    Visibility
  </label>

  <select
    value={visibility}
    onChange={(e) =>
      setVisibility(
        e.target.value as "PRIVATE" | "SHARED" | "PUBLIC"
      )
    }
    className="w-full rounded-lg border border-border bg-background px-3 py-2"
  >
    <option value="PRIVATE">Private</option>
    <option value="SHARED">Shared</option>
    <option value="PUBLIC">Public</option>
  </select>
</div>
    </Modal>
  );
}
