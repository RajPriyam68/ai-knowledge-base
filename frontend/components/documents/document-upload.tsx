"use client";

import { useCallback, useRef, useState } from "react";
import { UploadCloud, FileText, X, CheckCircle2, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { api } from "@/lib/api";
import { useToast } from "@/components/ui/toast";
import { humanFileSize } from "@/lib/format";

interface UploadItem {
  name: string;
  size: number;
  status: "uploading" | "done" | "error";
  error?: string;
}

interface UploadResult {
  uploaded: { id: string; originalName: string }[];
  errors: { name: string; message: string }[];
}

const ACCEPTED = ".pdf,.docx,.doc,.txt,.md";

export function DocumentUpload({
  kbId,
  onUploaded,
}: {
  kbId: string;
  onUploaded: () => void;
}) {
  const { toast } = useToast();
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [items, setItems] = useState<UploadItem[]>([]);

  const uploadFiles = useCallback(
    async (files: FileList | File[]) => {
      const fileArray = Array.from(files);
      if (fileArray.length === 0) return;
      const added: UploadItem[] = fileArray.map((f) => ({
        name: f.name,
        size: f.size,
        status: "uploading",
      }));
      setItems((prev) => [...added, ...prev]);

      const form = new FormData();
      form.append("kbId", kbId);
      for (const f of fileArray) form.append("files", f);

      try {
        const res = await api.post<{ success: boolean; data: UploadResult }>(
          "/documents/upload",
          form,
          { headers: { "Content-Type": "multipart/form-data" } },
        );
        const { uploaded, errors } = res.data.data;
        const statusMap = new Map<string, "done" | "error">();
        uploaded.forEach((d) => statusMap.set(d.originalName, "done"));
        errors.forEach((e) => statusMap.set(e.name, "error"));

        setItems((prev) =>
          prev.map((item) => ({
            ...item,
            status: statusMap.get(item.name) ?? "error",
            error: errors.find((e) => e.name === item.name)?.message,
          })),
        );

        if (uploaded.length > 0) {
          toast(
            "success",
            `${uploaded.length} document${uploaded.length > 1 ? "s" : ""} uploaded`,
            "Documents are being processed.",
          );
          onUploaded();
        }
        if (errors.length > 0) {
          toast("error", `${errors.length} upload${errors.length > 1 ? "s" : ""} failed`);
        }
      } catch {
        setItems((prev) => prev.map((i) => ({ ...i, status: "error", error: "Upload failed" })));
        toast("error", "Upload failed");
      } finally {
        setTimeout(() => setItems([]), 6000);
      }
    },
    [kbId, onUploaded, toast],
  );

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragging(false);
      void uploadFiles(e.dataTransfer.files);
    },
    [uploadFiles],
  );

  return (
    <div>
      <div
        role="button"
        tabIndex={0}
        onClick={() => inputRef.current?.click()}
        onKeyDown={(e) => e.key === "Enter" && inputRef.current?.click()}
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        className={cn(
          "flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-border px-6 py-10 text-center transition-colors",
          dragging && "border-primary bg-primary/5",
        )}
      >
        <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
          <UploadCloud className="h-6 w-6" />
        </div>
        <p className="text-sm font-medium">
          Drag & drop files here, or <span className="text-primary">browse</span>
        </p>
        <p className="mt-1 text-xs text-muted-foreground">
          PDF, DOCX, TXT, MD up to 25MB each
        </p>
        <input
          ref={inputRef}
          type="file"
          multiple
          accept={ACCEPTED}
          className="hidden"
          onChange={(e) => {
            if (e.target.files) void uploadFiles(e.target.files);
            e.target.value = "";
          }}
        />
      </div>

      {items.length > 0 && (
        <ul className="mt-4 space-y-2">
          {items.map((item, idx) => (
            <li
              key={`${item.name}-${idx}`}
              className="flex items-center gap-3 rounded-lg border border-border bg-card px-3 py-2.5"
            >
              {item.status === "uploading" ? (
                <FileText className="h-4 w-4 shrink-0 text-muted-foreground" />
              ) : item.status === "done" ? (
                <CheckCircle2 className="h-4 w-4 shrink-0 text-[hsl(var(--success))]" />
              ) : (
                <AlertCircle className="h-4 w-4 shrink-0 text-destructive" />
              )}
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm">{item.name}</p>
                <p className="text-xs text-muted-foreground">
                  {item.status === "uploading"
                    ? "Uploading..."
                    : item.status === "done"
                      ? "Uploaded"
                      : item.error ?? "Failed"}
                </p>
              </div>
              <span className="text-xs text-muted-foreground">{humanFileSize(item.size)}</span>
              <button
                onClick={() => setItems((prev) => prev.filter((_, i) => i !== idx))}
                className="text-muted-foreground hover:text-foreground"
                aria-label="Dismiss"
              >
                <X className="h-4 w-4" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
