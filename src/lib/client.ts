"use client";

import { useCallback, useEffect, useState } from "react";

export async function api<T = unknown>(path: string, init?: { method?: string; body?: unknown }): Promise<T> {
  const res = await fetch(path, {
    method: init?.method ?? "GET",
    headers: init?.body !== undefined ? { "Content-Type": "application/json" } : undefined,
    body: init?.body !== undefined ? JSON.stringify(init.body) : undefined,
    cache: "no-store",
  });
  if (res.status === 401 && !path.startsWith("/api/auth/login") && !path.startsWith("/api/invites/")) {
    // Hapus cookie dulu: token bisa masih "valid" padahal akun sudah dinonaktifkan.
    await fetch("/api/auth/logout", { method: "POST" }).catch(() => {});
    window.location.href = "/login";
    throw new Error("Sesi berakhir, silakan login kembali");
  }
  const data = await res.json().catch(() => null);
  if (!res.ok) throw new Error(data?.error || `Terjadi kesalahan (${res.status})`);
  return data as T;
}

/** Ambil data dari API, dengan fungsi reload. Path kosong = belum fetch. */
export function useApi<T>(path: string) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [version, setVersion] = useState(0);

  useEffect(() => {
    if (!path) return;
    let alive = true;
    api<T>(path)
      .then((d) => alive && (setData(d), setError(null)))
      .catch((e: Error) => alive && setError(e.message));
    return () => {
      alive = false;
    };
  }, [path, version]);

  const reload = useCallback(() => setVersion((v) => v + 1), []);
  return { data, error, reload, setData };
}

export function toast(message: string, type: "success" | "error" = "success") {
  window.dispatchEvent(new CustomEvent("app-toast", { detail: { message, type } }));
}

export const uid = () =>
  typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2) + Date.now().toString(36);
