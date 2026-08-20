"use client";

import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Cpu, Save, RotateCcw, AlertTriangle } from "lucide-react";
import { apiGet, apiPost, apiPut, getErrorMessage } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input, Textarea } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/spinner";
import { ConfirmDialog } from "@/components/ui/modal";
import { useToast } from "@/components/ui/toast";
import { humanFileSize } from "@/lib/format";

interface AiConfig {
  model: string;
  temperature: number;
  provider: string;
  apiKeyConfigured: boolean;
  maxTokens: number;
  embeddingModel: string;
  embeddingReady: boolean;
  storage: { bytes: number; fileCount: number };
}

interface PromptConfig {
  systemPrompt: string;
  chatPrompt: string;
  followUpPrompt: string;
  summarizePrompt: string;
  keypointsPrompt: string;
  flashcardsPrompt: string;
  quizPrompt: string;
}

export default function AdminAiConfigPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [model, setModel] = useState("");
  const [temperature, setTemperature] = useState("0.7");
  const [prompts, setPrompts] = useState<PromptConfig | null>(null);
  const [resetOpen, setResetOpen] = useState(false);

  const { data: config, isLoading } = useQuery({
    queryKey: ["admin", "ai-config"],
    queryFn: () => apiGet<AiConfig>("/admin/ai/config"),
  });

  const { data: promptData } = useQuery({
    queryKey: ["admin", "prompts"],
    queryFn: () => apiGet<PromptConfig>("/admin/prompts"),
  });

  useEffect(() => {
    if (config) {
      setModel(config.model);
      setTemperature(String(config.temperature));
    }
  }, [config]);

  useEffect(() => {
    if (promptData) setPrompts(promptData);
  }, [promptData]);

  const saveConfig = useMutation({
    mutationFn: (payload: { model?: string; temperature?: number }) =>
      apiPut<AiConfig>("/admin/ai/config", payload),
    onSuccess: (updated) => {
      setModel(updated.model);
      setTemperature(String(updated.temperature));
      toast("success", "AI configuration saved");
    },
    onError: (err) => toast("error", "Failed to save", getErrorMessage(err)),
  });

  const savePrompts = useMutation({
    mutationFn: (payload: Partial<PromptConfig>) => apiPut("/admin/prompts", payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "prompts"] });
      toast("success", "Prompt templates saved");
    },
    onError: (err) => toast("error", "Failed to save prompts", getErrorMessage(err)),
  });

  const resetPrompts = useMutation({
    mutationFn: () => apiPost("/admin/prompts/reset"),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "prompts"] });
      setResetOpen(false);
      toast("success", "Prompt templates reset to defaults");
    },
    onError: (err) => toast("error", "Failed to reset prompts", getErrorMessage(err)),
  });

  const updatePrompt = (key: keyof PromptConfig, value: string) => {
    setPrompts((prev) => (prev ? { ...prev, [key]: value } : prev));
  };

  if (isLoading) {
    return (
      <div className="grid gap-6 lg:grid-cols-2">
        <Skeleton className="h-64 w-full" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  const promptFields: { key: keyof PromptConfig; label: string; rows: number }[] = [
    { key: "systemPrompt", label: "System Prompt", rows: 5 },
    { key: "chatPrompt", label: "Chat Prompt", rows: 8 },
    { key: "followUpPrompt", label: "Follow-up Suggestion Prompt", rows: 5 },
    { key: "summarizePrompt", label: "Summarize Prompt", rows: 5 },
    { key: "keypointsPrompt", label: "Key Points Prompt", rows: 5 },
    { key: "flashcardsPrompt", label: "Flashcards Prompt", rows: 5 },
    { key: "quizPrompt", label: "Quiz Prompt", rows: 5 },
  ];

  return (
    <div className="space-y-6">
      {!config?.apiKeyConfigured && (
        <div className="flex items-start gap-3 rounded-lg border border-[hsl(var(--warning))]/40 bg-[hsl(var(--warning))]/10 p-4 text-sm">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-[hsl(var(--warning))]" />
          <div>
            <p className="font-medium">No GEMINI_API_KEY configured</p>
            <p className="mt-1 text-muted-foreground">
              The system is running in offline demo mode. Chat answers use deterministic offline
              responses and document tools are simulated. Set <code>GEMINI_API_KEY</code> in the
              backend <code>.env</code> and restart to enable real AI generation.
            </p>
          </div>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Cpu className="h-4 w-4" /> LLM Configuration
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Current provider</span>
              <Badge variant={config?.apiKeyConfigured ? "success" : "warning"}>{config?.provider}</Badge>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">API key</span>
              <Badge variant={config?.apiKeyConfigured ? "success" : "secondary"}>
                {config?.apiKeyConfigured ? "Configured" : "Not set"}
              </Badge>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Max output tokens</span>
              <span className="font-medium">{config?.maxTokens}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Embedding model</span>
              <span className="font-medium">{config?.embeddingModel}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Embedding model ready</span>
              <Badge variant={config?.embeddingReady ? "success" : "warning"}>
                {config?.embeddingReady ? "Loaded" : "Loading"}
              </Badge>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Stored files</span>
              <span className="font-medium">
                {config?.storage.fileCount} ({humanFileSize(config?.storage.bytes ?? 0)})
              </span>
            </div>

            <div className="border-t border-border pt-4">
              <Input
                label="Model"
                value={model}
                onChange={(e) => setModel(e.target.value)}
                placeholder="gemini-2.5-flash"
              />
              <div className="mt-4">
                <Input
                  label="Temperature (0.0 – 2.0)"
                  type="number"
                  step="0.1"
                  min="0"
                  max="2"
                  value={temperature}
                  onChange={(e) => setTemperature(e.target.value)}
                />
              </div>
              <Button
                className="mt-4"
                onClick={() =>
                  saveConfig.mutate({ model, temperature: Number(temperature) })
                }
                loading={saveConfig.isPending}
              >
                <Save className="h-4 w-4" /> Save configuration
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex-row items-center justify-between space-y-0">
            <CardTitle>Prompt Templates</CardTitle>
            <Button variant="outline" size="sm" onClick={() => setResetOpen(true)}>
              <RotateCcw className="h-3.5 w-3.5" /> Reset to defaults
            </Button>
          </CardHeader>
          <CardContent className="space-y-4">
            {promptFields.map((field) => (
              <Textarea
                key={field.key}
                label={field.label}
                value={prompts?.[field.key] ?? ""}
                onChange={(e) => updatePrompt(field.key, e.target.value)}
                rows={field.rows}
                className="font-mono text-xs"
              />
            ))}
            <Button
              onClick={() => prompts && savePrompts.mutate(prompts)}
              loading={savePrompts.isPending}
            >
              <Save className="h-4 w-4" /> Save prompt templates
            </Button>
          </CardContent>
        </Card>
      </div>

      <ConfirmDialog
        open={resetOpen}
        onClose={() => setResetOpen(false)}
        onConfirm={() => resetPrompts.mutate()}
        title="Reset prompt templates?"
        message="All prompt templates will be restored to their default values. This cannot be undone."
        confirmLabel="Reset prompts"
        loading={resetPrompts.isPending}
      />
    </div>
  );
}
