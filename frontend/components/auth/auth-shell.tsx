"use client";

import type { ReactNode } from "react";
import { BookOpen } from "lucide-react";
import { useTheme } from "@/lib/theme-context";
import { Sun, Moon } from "lucide-react";

export function AuthShell({ title, subtitle, children }: { title: string; subtitle: string; children: ReactNode }) {
  const { theme, toggleTheme } = useTheme();
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-[hsl(var(--background))] px-4 py-12">
      <button
        onClick={toggleTheme}
        className="absolute right-4 top-4 rounded-lg border border-border bg-card p-2 text-muted-foreground hover:bg-accent"
        aria-label="Toggle theme"
      >
        {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
      </button>

      <div className="mb-8 flex flex-col items-center">
        <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-lg">
          <BookOpen className="h-6 w-6" />
        </div>
        <h1 className="text-2xl font-bold tracking-tight">AI Knowledge Base</h1>
        <p className="mt-1 text-sm text-muted-foreground">Your documents, answered by AI</p>
      </div>

      <div className="w-full max-w-md rounded-2xl border border-border bg-card p-7 shadow-xl animate-fade-in-up">
        <h2 className="text-lg font-semibold">{title}</h2>
        <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>
        <div className="mt-6">{children}</div>
      </div>
    </div>
  );
}
