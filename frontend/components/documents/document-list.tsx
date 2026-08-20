"use client";

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  FileText,
  Pencil,
  Trash2,
  FileSearch,
  ListOrdered,
  Layers,
  HelpCircle,
  Loader2,
  RefreshCw,
} from "lucide-react";
import { apiDelete, apiPost, apiPut, getErrorMessage } from "@/lib/api";
import { Badge, statusBadgeVariant } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Modal, ConfirmDialog } from "@/components/ui/modal";
import { useToast } from "@/components/ui/toast";
import { humanFileSize, formatDate } from "@/lib/format";
import type { DocumentItem, Flashcard, QuizQuestion } from "@/lib/types";
import { EmptyState } from "@/components/ui/spinner";
import { FileText as FileIcon } from "lucide-react";

type ToolPanel = "summarize" | "keypoints" | "flashcards" | "quiz";

export function DocumentList({ documents }: { documents: DocumentItem[] }) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [renaming, setRenaming] = useState<DocumentItem | null>(null);
  const [deleting, setDeleting] = useState<DocumentItem | null>(null);
  const [toolDoc, setToolDoc] = useState<DocumentItem | null>(null);
  const [tool, setTool] = useState<ToolPanel>("summarize");

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["documents"] });
    queryClient.invalidateQueries({ queryKey: ["kb", "list"] });
    queryClient.invalidateQueries({ queryKey: ["kb", "stats"] });
  };

  const renameMutation = useMutation({
    mutationFn: ({ id, name }: { id: string; name: string }) =>
      apiPut(`/documents/${id}`, { name }),
    onSuccess: () => {
      invalidate();
      setRenaming(null);
      toast("success", "Document renamed");
    },
    onError: (err) => toast("error", "Failed to rename", getErrorMessage(err)),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiDelete(`/documents/${id}`),
    onSuccess: () => {
      invalidate();
      setDeleting(null);
      toast("success", "Document deleted");
    },
    onError: (err) => toast("error", "Failed to delete", getErrorMessage(err)),
  });

  const reprocessMutation = useMutation({
    mutationFn: (id: string) => apiPost(`/documents/${id}/reprocess`),
    onSuccess: () => {
      invalidate();
      toast("success", "Document queued for reprocessing");
    },
    onError: (err) => toast("error", "Failed to reprocess", getErrorMessage(err)),
  });

  const runTool = useMutation({
    mutationFn: ({ id, task }: { id: string; task: ToolPanel }) =>
      apiPost<unknown>(`/chat/documents/${id}/${task}`),
    onSuccess: () => {
      invalidate();
    },
    onError: (err) => toast("error", "AI tool failed", getErrorMessage(err)),
  });

  if (documents.length === 0) {
    return (
      <EmptyState
        icon={<FileIcon className="h-10 w-10" />}
        title="No documents yet"
        description="Upload PDF, DOCX, TXT, or Markdown files above to get started."
      />
    );
  }

  return (
    <div className="overflow-hidden rounded-xl border border-border">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border bg-muted/50 text-left text-xs uppercase tracking-wider text-muted-foreground">
            <th className="px-4 py-3 font-medium">Name</th>
            <th className="px-4 py-3 font-medium">Status</th>
            <th className="hidden px-4 py-3 font-medium md:table-cell">Chunks</th>
            <th className="hidden px-4 py-3 font-medium md:table-cell">Size</th>
            <th className="hidden px-4 py-3 font-medium lg:table-cell">Uploaded</th>
            <th className="px-4 py-3 text-right font-medium">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {documents.map((doc) => (
            <tr key={doc.id} className="hover:bg-accent/40">
              <td className="px-4 py-3">
                <div className="flex items-center gap-2.5">
                  <FileText className="h-4 w-4 shrink-0 text-muted-foreground" />
                  <div className="min-w-0">
                    <p className="max-w-[220px] truncate font-medium" title={doc.originalName}>
                      {doc.originalName}
                    </p>
                    {doc.status === "FAILED" && doc.errorMessage && (
                      <p className="max-w-[220px] truncate text-xs text-destructive" title={doc.errorMessage}>
                        {doc.errorMessage}
                      </p>
                    )}
                  </div>
                </div>
              </td>
              <td className="px-4 py-3">
                <Badge variant={statusBadgeVariant(doc.status)}>
                  {doc.status === "PROCESSING" || doc.status === "PENDING" ? (
                    <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                  ) : null}
                  {doc.status}
                </Badge>
              </td>
              <td className="hidden px-4 py-3 text-muted-foreground md:table-cell">
                {doc.chunkCount}
              </td>
              <td className="hidden px-4 py-3 text-muted-foreground md:table-cell">
                {humanFileSize(doc.size)}
              </td>
              <td className="hidden px-4 py-3 text-muted-foreground lg:table-cell">
                {formatDate(doc.createdAt)}
              </td>
              <td className="px-4 py-3">
                <div className="flex items-center justify-end gap-1">
                  {doc.status === "PROCESSED" && (
                    <>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          runTool.reset();
                          setToolDoc(doc);
                          setTool("summarize");
                        }}
                        title="Summarize"
                      >
                        <FileSearch className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          runTool.reset();
                          setToolDoc(doc);
                          setTool("keypoints");
                        }}
                        title="Key points"
                      >
                        <ListOrdered className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          runTool.reset();
                          setToolDoc(doc);
                          setTool("flashcards");
                        }}
                        title="Flashcards"
                      >
                        <Layers className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          runTool.reset();
                          setToolDoc(doc);
                          setTool("quiz");
                        }}
                        title="Quiz"
                      >
                        <HelpCircle className="h-4 w-4" />
                      </Button>
                    </>
                  )}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setRenaming(doc)}
                    title="Rename"
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                  {doc.status === "FAILED" && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => reprocessMutation.mutate(doc.id)}
                      title="Reprocess"
                      loading={reprocessMutation.isPending}
                    >
                      <RefreshCw className="h-4 w-4" />
                    </Button>
                  )}
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-destructive hover:bg-destructive/10"
                    onClick={() => setDeleting(doc)}
                    title="Delete"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <RenameDialog
        doc={renaming}
        onClose={() => setRenaming(null)}
        onConfirm={(name) => renaming && renameMutation.mutate({ id: renaming.id, name })}
        loading={renameMutation.isPending}
      />

      <ConfirmDialog
        open={!!deleting}
        onClose={() => setDeleting(null)}
        onConfirm={() => deleting && deleteMutation.mutate(deleting.id)}
        title="Delete document?"
        message={`This will permanently delete "${deleting?.originalName}" and remove it from the knowledge base.`}
        loading={deleteMutation.isPending}
      />

      <AiToolDialog
        doc={toolDoc}
        tool={tool}
        loading={runTool.isPending}
        result={runTool.data}
        onClose={() => {
          setToolDoc(null);
          runTool.reset();
        }}
        onRun={() => toolDoc && runTool.mutate({ id: toolDoc.id, task: tool })}
      />
    </div>
  );
}

function RenameDialog({
  doc,
  onClose,
  onConfirm,
  loading,
}: {
  doc: DocumentItem | null;
  onClose: () => void;
  onConfirm: (name: string) => void;
  loading: boolean;
}) {
  const [name, setName] = useState("");
  const key = doc?.id ?? "empty";
  return (
    <Modal
      open={!!doc}
      onClose={onClose}
      title="Rename document"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={() => name.trim() && onConfirm(name.trim())} loading={loading}>
            Save
          </Button>
        </>
      }
    >
      <div key={key}>
        <Input
          label="Name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder={doc?.originalName}
          autoFocus
        />
      </div>
    </Modal>
  );
}

function AiToolDialog({
  doc,
  tool,
  loading,
  onClose,
  onRun,
  result,
}: {
  doc: DocumentItem | null;
  tool: ToolPanel;
  loading: boolean;
  onClose: () => void;
  onRun: () => void;
  result: unknown;
}) {
  const titles: Record<ToolPanel, string> = {
    summarize: "Summarize Document",
    keypoints: "Extract Key Points",
    flashcards: "Generate Flashcards",
    quiz: "Generate Quiz",
  };
  const descriptions: Record<ToolPanel, string> = {
    summarize: "Create a concise summary of the document content.",
    keypoints: "Extract the most important points from the document.",
    flashcards: "Generate question-and-answer flashcards for studying.",
    quiz: "Generate a multiple-choice quiz to test understanding.",
  };
  return (
    <Modal
      open={!!doc}
      onClose={onClose}
      title={titles[tool]}
      description={descriptions[tool]}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Close
          </Button>
          <Button onClick={onRun} loading={loading} disabled={!!result}>
            {loading ? "Running..." : result ? "Done" : "Run"}
          </Button>
        </>
      }
    >
      <div className="space-y-3">
        <div className="rounded-lg border border-border bg-muted/40 p-3 text-sm text-muted-foreground">
          <p className="flex items-center gap-2 font-medium text-foreground">
            <FileText className="h-4 w-4" /> {doc?.originalName}
          </p>
        </div>
        {loading && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Processing document...
          </div>
        )}
        {result != null && !loading && <AiToolResult tool={tool} result={result} />}
      </div>
    </Modal>
  );
}

function AiToolResult({ tool, result }: { tool: ToolPanel; result: unknown }) {
  if (tool === "flashcards") {
    const cards = (result as { cards: Flashcard[] })?.cards ?? [];
    return (
      <div className="max-h-72 space-y-3 overflow-y-auto">
        {cards.map((card, i) => (
          <details key={i} className="rounded-lg border border-border p-3">
            <summary className="cursor-pointer text-sm font-medium">{card.question}</summary>
            <p className="mt-2 text-sm text-muted-foreground">{card.answer}</p>
          </details>
        ))}
        {cards.length === 0 && <p className="text-sm text-muted-foreground">No flashcards generated.</p>}
      </div>
    );
  }
  if (tool === "quiz") {
    const questions = (result as { questions: QuizQuestion[] })?.questions ?? [];
    return (
      <div className="max-h-72 space-y-4 overflow-y-auto">
        {questions.map((q, qi) => (
          <div key={qi} className="rounded-lg border border-border p-3">
            <p className="text-sm font-medium">
              {qi + 1}. {q.question}
            </p>
            <ul className="mt-2 space-y-1">
              {q.options.map((opt, oi) => (
                <li
                  key={oi}
                  className={
                    oi === q.correctIndex
                      ? "rounded bg-[hsl(var(--success))]/10 px-2 py-1 text-sm text-[hsl(var(--success))]"
                      : "px-2 py-1 text-sm text-muted-foreground"
                  }
                >
                  {oi === q.correctIndex ? "✓ " : ""}
                  {opt}
                </li>
              ))}
            </ul>
            {q.explanation && (
              <p className="mt-2 text-xs text-muted-foreground">{q.explanation}</p>
            )}
          </div>
        ))}
        {questions.length === 0 && (
          <p className="text-sm text-muted-foreground">No quiz questions generated.</p>
        )}
      </div>
    );
  }
  const text = (result as { text?: string })?.text ?? "";
  return (
    <div className="max-h-72 overflow-y-auto rounded-lg border border-border bg-muted/40 p-4">
      <pre className="whitespace-pre-wrap font-sans text-sm leading-relaxed">{text}</pre>
    </div>
  );
}
