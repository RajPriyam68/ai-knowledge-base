"use client";

import axios, { AxiosError, type AxiosRequestConfig, type InternalAxiosRequestConfig } from "axios";
import type { AuthResponse, User } from "./types";

const STORAGE_KEY = "akb_auth";

export interface StoredAuth {
  user: User;
  accessToken: string;
  refreshToken: string;
}

export function loadStoredAuth(): StoredAuth | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as StoredAuth) : null;
  } catch {
    return null;
  }
}

export function saveStoredAuth(auth: StoredAuth): void {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(auth));
}

export function clearStoredAuth(): void {
  window.localStorage.removeItem(STORAGE_KEY);
}

export const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL ?? "/api",
  timeout: 120_000,
  headers: { "Content-Type": "application/json" },
});

let refreshPromise: Promise<string> | null = null;

function attachToken(config: InternalAxiosRequestConfig): InternalAxiosRequestConfig {
  const auth = loadStoredAuth();
  if (auth?.accessToken) {
    config.headers.set("Authorization", `Bearer ${auth.accessToken}`);
  }
  return config;
}

async function refreshAccessToken(): Promise<string> {
  const auth = loadStoredAuth();
  if (!auth?.refreshToken) throw new Error("No refresh token");
  const res = await axios.post<{ success: boolean; data: { accessToken: string; refreshToken: string } }>(
    "/api/auth/refresh",
    { refreshToken: auth.refreshToken },
  );
  const next = res.data.data;
  saveStoredAuth({ ...auth, accessToken: next.accessToken, refreshToken: next.refreshToken });
  return next.accessToken;
}

api.interceptors.request.use(attachToken);

api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const original = error.config as AxiosRequestConfig & { _retry?: boolean };
    const status = error.response?.status;
    if (status === 401 && original && !original._retry) {
      original._retry = true;
      try {
        refreshPromise = refreshPromise ?? refreshAccessToken();
        const token = await refreshPromise;
        refreshPromise = null;
        original.headers = { ...original.headers, Authorization: `Bearer ${token}` };
        return api(original);
      } catch {
        refreshPromise = null;
        clearStoredAuth();
        if (typeof window !== "undefined" && !window.location.pathname.startsWith("/login")) {
          window.location.href = "/login";
        }
      }
    }
    return Promise.reject(error);
  },
);

export function getErrorMessage(error: unknown): string {
  if (axios.isAxiosError(error)) {
    const data = error.response?.data as { error?: { message?: string } } | undefined;
    if (data?.error?.message) return data.error.message;
    if (error.code === "ECONNABORTED") return "Request timed out. Please try again.";
    if (!error.response) return "Cannot reach the server. Is the backend running?";
    return error.message;
  }
  if (error instanceof Error) return error.message;
  return "An unexpected error occurred";
}

export async function apiGet<T>(url: string, config?: AxiosRequestConfig): Promise<T> {
  const res = await api.get<{ success: boolean; data: T }>(url, config);
  return res.data.data;
}

export async function apiPost<T>(
  url: string,
  body?: unknown,
  config?: AxiosRequestConfig,
): Promise<T> {
  const res = await api.post<{ success: boolean; data: T }>(url, body, config);
  return res.data.data;
}

export async function apiPut<T>(
  url: string,
  body?: unknown,
  config?: AxiosRequestConfig,
): Promise<T> {
  const res = await api.put<{ success: boolean; data: T }>(url, body, config);
  return res.data.data;
}

export async function apiPatch<T>(
  url: string,
  body?: unknown,
  config?: AxiosRequestConfig,
): Promise<T> {
  const res = await api.patch<{ success: boolean; data: T }>(url, body, config);
  return res.data.data;
}

export async function apiDelete<T>(url: string, config?: AxiosRequestConfig): Promise<T> {
  const res = await api.delete<{ success: boolean; data: T }>(url, config);
  return res.data.data;
}

export function authPayload(data: AuthResponse): StoredAuth {
  return data;
}
