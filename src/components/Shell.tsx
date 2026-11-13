"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import { api, useApi } from "@/lib/client";
import type { CurrentUser } from "@/lib/types";
import { Toaster } from "./ui";

const NAV_ADMIN = [
  { href: "/", label: "Dashboard" },
  { href: "/jadwal", label: "Susun Jadwal" },
  { href: "/cetak", label: "Cetak Jadwal" },
  { href: "/guru", label: "Guru" },
  { href: "/mapel", label: "Mata Pelajaran" },
  { href: "/kelas", label: "Kelas" },
  { href: "/pengaturan", label: "Pengaturan Sekolah" },
  { href: "/backup", label: "Backup Data" },
  { href: "/akun", label: "Akun Saya" },
];

const NAV_SUPER = [
  { href: "/admin/sekolah", label: "Sekolah" },
  { href: "/admin/pengguna", label: "Pengguna & Undangan" },
  { href: "/akun", label: "Akun Saya" },
];

export function Shell({ children }: { children: ReactNode }) {
  const path = usePathname();
  const [open, setOpen] = useState(false);
  const { data: user, reload } = useApi<CurrentUser>("/api/auth/me");

  useEffect(() => {
    window.addEventListener("settings-updated", reload);
    return () => window.removeEventListener("settings-updated", reload);
  }, [reload]);

  async function logout() {
    await api("/api/auth/logout", { method: "POST" });
    window.location.href = "/login";
  }

  const isSuper = user?.role === "superadmin";
  const nav = !user ? [] : isSuper ? NAV_SUPER : NAV_ADMIN;
  const title = isSuper ? "Panel Superadmin" : user?.schoolName;

  return (
    <div className="flex min-h-screen bg-slate-50 print:block print:bg-white">
      <aside
        className={`fixed inset-y-0 left-0 z-30 w-60 shrink-0 border-r border-slate-200 bg-white transition-transform md:sticky md:top-0 md:h-screen md:translate-x-0 print:hidden ${open ? "translate-x-0" : "-translate-x-full"}`}
      >
        <div className="border-b border-slate-200 px-5 py-4">
          <div className="text-xs font-medium uppercase tracking-wide text-blue-600">Jadwal Mengajar</div>
          <div className="mt-0.5 truncate text-sm font-semibold text-slate-800" title={title ?? undefined}>
            {title ?? "…"}
          </div>
        </div>
        <nav className="flex flex-col gap-0.5 p-3">
          {nav.map((n) => {
            const active = n.href === "/" ? path === "/" : path.startsWith(n.href);
            return (
              <Link
                key={n.href}
                href={n.href}
                onClick={() => setOpen(false)}
                className={`rounded-md px-3 py-2 text-sm ${active ? "bg-blue-50 font-medium text-blue-700" : "text-slate-600 hover:bg-slate-100"}`}
              >
                {n.label}
              </Link>
            );
          })}
        </nav>
        <div className="absolute inset-x-0 bottom-0 border-t border-slate-200 p-4 text-sm">
          <div className="truncate font-medium text-slate-700">{user?.name ?? "…"}</div>
          <div className="truncate text-xs text-slate-400">
            @{user?.username} · {isSuper ? "Superadmin" : "Admin"}
          </div>
          <button onClick={logout} className="mt-2 text-xs font-medium text-red-600 hover:underline">
            Keluar
          </button>
        </div>
      </aside>
      {open && <div className="fixed inset-0 z-20 bg-slate-900/30 md:hidden" onClick={() => setOpen(false)} />}
      <div className="min-w-0 flex-1">
        <header className="sticky top-0 z-10 flex items-center gap-3 border-b border-slate-200 bg-white px-4 py-3 md:hidden print:hidden">
          <button onClick={() => setOpen(true)} className="rounded border border-slate-300 px-2 py-1 text-sm">
            ☰
          </button>
          <span className="truncate text-sm font-semibold">{title}</span>
        </header>
        <main className="p-4 md:p-6 print:p-0">{children}</main>
      </div>
      <Toaster />
    </div>
  );
}
