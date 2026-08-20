"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  apiGet,
  apiPost,
  clearStoredAuth,
  loadStoredAuth,
  saveStoredAuth,
} from "./api";
import type { AuthResponse, User } from "./types";

interface AuthContextValue {
  user: User | null;
  initializing: boolean;
  isAdmin: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (data: { name: string; email: string; password: string }) => Promise<void>;
  logout: () => Promise<void>;
  updateUser: (user: User) => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [initializing, setInitializing] = useState(true);

  useEffect(() => {
    const stored = loadStoredAuth();
    if (!stored) {
      setInitializing(false);
      return;
    }
    setUser(stored.user);
    apiGet<{ user: User }>("/auth/me")
      .then(({ user: fresh }) => {
        setUser(fresh);
        saveStoredAuth({ ...stored, user: fresh });
      })
      .catch(() => {
        setUser(stored.user);
      })
      .finally(() => setInitializing(false));
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const data = await apiPost<AuthResponse>("/auth/login", { email, password });
    saveStoredAuth(data);
    setUser(data.user);
  }, []);

  const register = useCallback(
    async (payload: { name: string; email: string; password: string }) => {
      const data = await apiPost<AuthResponse>("/auth/register", payload);
      saveStoredAuth(data);
      setUser(data.user);
    },
    [],
  );

  const logout = useCallback(async () => {
    const stored = loadStoredAuth();
    try {
      if (stored) {
        await apiPost("/auth/logout", { refreshToken: stored.refreshToken });
      }
    } catch {
      // ignore network errors on logout
    }
    clearStoredAuth();
    setUser(null);
  }, []);

  const updateUser = useCallback((next: User) => {
    setUser(next);
    const stored = loadStoredAuth();
    if (stored) saveStoredAuth({ ...stored, user: next });
  }, []);

  const value = useMemo(
    () => ({
      user,
      initializing,
      isAdmin: user?.role === "ADMIN",
      login,
      register,
      logout,
      updateUser,
    }),
    [user, initializing, login, register, logout, updateUser],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
