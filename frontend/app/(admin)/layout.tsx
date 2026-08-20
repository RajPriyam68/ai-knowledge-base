"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { LayoutDashboard, Users, ScrollText, Activity, BarChart3, Cpu, Settings2, ArrowLeft } from "lucide-react";
import { RequireAdmin } from "@/components/auth/guards";
import { cn } from "@/lib/utils";

const adminNav = [
  { href: "/admin", label: "Overview", icon: <LayoutDashboard className="h-4 w-4" />, exact: true },
  { href: "/admin/users", label: "Users", icon: <Users className="h-4 w-4" /> },
  { href: "/admin/analytics", label: "Analytics", icon: <BarChart3 className="h-4 w-4" /> },
  { href: "/admin/usage", label: "API Usage", icon: <Activity className="h-4 w-4" /> },
  { href: "/admin/logs", label: "System Logs", icon: <ScrollText className="h-4 w-4" /> },
  { href: "/admin/ai-config", label: "AI & Prompts", icon: <Cpu className="h-4 w-4" /> },
  { href: "/admin/settings", label: "Settings", icon: <Settings2 className="h-4 w-4" /> },
];

export default function AdminLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  return (
    <RequireAdmin>
      <div className="space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <Link
              href="/dashboard"
              className="mb-2 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
            >
              <ArrowLeft className="h-4 w-4" /> Back to app
            </Link>
            <h1 className="text-2xl font-bold tracking-tight">Admin Panel</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Manage users, monitor the system, and configure AI settings.
            </p>
          </div>
        </div>

        <nav className="flex gap-1 overflow-x-auto rounded-lg border border-border bg-card p-1">
          {adminNav.map((item) => {
            const active = item.exact ? pathname === item.href : pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex shrink-0 items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                  active
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
                )}
              >
                {item.icon}
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div>{children}</div>
      </div>
    </RequireAdmin>
  );
}
