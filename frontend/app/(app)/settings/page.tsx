"use client";

import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { UserRound, KeyRound, Save } from "lucide-react";
import { apiGet, apiPost, apiPut, getErrorMessage } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/spinner";
import { useAuth } from "@/lib/auth-context";
import { useToast } from "@/components/ui/toast";
import type { User } from "@/lib/types";

export default function SettingsPage() {
  const { user, updateUser } = useAuth();
  const { toast } = useToast();

  const [name, setName] = useState(user?.name ?? "");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const updateProfile = useMutation({
    mutationFn: (payload: { name: string }) => apiPut<User>("/auth/profile", payload),
    onSuccess: (updated) => {
      if (user) updateUser({ ...user, name: updated.name });
      toast("success", "Profile updated");
    },
    onError: (err) => toast("error", "Failed to update profile", getErrorMessage(err)),
  });

  const changePassword = useMutation({
    mutationFn: (payload: { currentPassword: string; newPassword: string }) =>
      apiPost("/auth/change-password", payload),
    onSuccess: () => {
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      toast("success", "Password changed");
    },
    onError: (err) => toast("error", "Failed to change password", getErrorMessage(err)),
  });

  const { data: kbs } = useQuery({
    queryKey: ["kb", "list"],
    queryFn: () => apiGet<{ items: { name: string; _count?: { documents: number } }[] }>("/kb"),
  });

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
        <p className="mt-1 text-sm text-muted-foreground">Manage your account preferences.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UserRound className="h-4 w-4" /> Profile
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="text-sm font-medium">Email</label>
            <p className="text-sm text-muted-foreground">{user?.email}</p>
          </div>
          <Input
            label="Name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Your display name"
          />
          <Button
            onClick={() => updateProfile.mutate({ name: name.trim() })}
            loading={updateProfile.isPending}
            disabled={!name.trim() || name.trim() === user?.name}
          >
            <Save className="h-4 w-4" /> Save profile
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <KeyRound className="h-4 w-4" /> Change Password
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Input
            label="Current password"
            type="password"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            autoComplete="current-password"
          />
          <Input
            label="New password"
            type="password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            autoComplete="new-password"
          />
          <Input
            label="Confirm new password"
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            autoComplete="new-password"
          />
          <Button
            onClick={() => {
              if (newPassword !== confirmPassword) {
                toast("error", "Passwords do not match");
                return;
              }
              if (newPassword.length < 8) {
                toast("error", "New password must be at least 8 characters");
                return;
              }
              changePassword.mutate({ currentPassword, newPassword });
            }}
            loading={changePassword.isPending}
            disabled={!currentPassword || !newPassword}
          >
            Update password
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Account Info</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Role</span>
            <span className="font-medium">{user?.role}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Email verified</span>
            <span className="font-medium">{user?.isEmailVerified ? "Yes" : "No"}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Knowledge bases</span>
            <span className="font-medium">
              {kbs?.items.length === undefined ? <Skeleton className="h-4 w-8" /> : kbs.items.length}
            </span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
