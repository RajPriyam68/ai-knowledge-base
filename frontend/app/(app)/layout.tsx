"use client";

import type { ReactNode } from "react";
import { RequireAuth } from "@/components/auth/guards";
import { AppShell } from "@/components/app-shell";

export default function AppLayout({ children }: { children: ReactNode }) {
  return (
    <RequireAuth>
      <AppShell>{children}</AppShell>
    </RequireAuth>
  );
}
