"use client";

import { useState, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { AuthShell } from "@/components/auth/auth-shell";
import { Button } from "@/components/ui/button";
import { apiPost, getErrorMessage } from "@/lib/api";
import { useToast } from "@/components/ui/toast";

function VerifyEmailInner() {
  const searchParams = useSearchParams();
  const { toast } = useToast();
  const token = searchParams.get("token") ?? "";
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [error, setError] = useState<string | null>(null);

  const verify = async () => {
    setStatus("loading");
    setError(null);
    try {
      await apiPost("/auth/verify-email", { token });
      setStatus("success");
      toast("success", "Email verified", "Your email has been verified successfully.");
    } catch (err) {
      setStatus("error");
      setError(getErrorMessage(err));
    }
  };

  return (
    <AuthShell title="Verify your email" subtitle="Confirm your email address to continue">
      {!token ? (
        <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          Missing verification token.
        </div>
      ) : status === "success" ? (
        <div className="rounded-lg border border-[hsl(var(--success))]/40 bg-[hsl(var(--success))]/10 px-3 py-3 text-sm text-[hsl(var(--success))]">
          Your email has been verified. You can now log in.
        </div>
      ) : (
        <div className="space-y-4">
          {error && (
            <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {error}
            </div>
          )}
          <Button onClick={verify} loading={status === "loading"} className="w-full">
            Verify email
          </Button>
        </div>
      )}
      <p className="mt-5 text-center text-sm text-muted-foreground">
        <Link href="/login" className="font-medium text-primary hover:underline">
          Back to login
        </Link>
      </p>
    </AuthShell>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense>
      <VerifyEmailInner />
    </Suspense>
  );
}
