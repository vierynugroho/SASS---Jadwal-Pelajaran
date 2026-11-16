"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import { api, useApi } from "@/lib/client";
import type { CurrentUser } from "@/lib/types";
import { Toaster } from "./ui";
import { Icon, type IconName } from "./icons";

type NavItem = { href: string; label: string; icon: IconName; badge?: boolean };
type NavGroup = { title: string; items: NavItem[] };

const NAV_ADMIN: NavGroup[] = [
  { title: "", items: [{ href: "/", label: "Dashboard", icon: "dashboard" }] },
  {
    title: "Jadwal",
    items: [
      { href: "/jadwal", label: "Susun Jadwal", icon: "calendar" },
      { href: "/piket", label: "Guru Piket", icon: "shield" },
      { href: "/cetak", label: "Cetak Jadwal", icon: "printer" },
    ],
  },
  {
    title: "Data Master",
    items: [
      { href: "/guru", label: "Guru", icon: "users" },
      { href: "/mapel", label: "Mata Pelajaran", icon: "book" },
      { href: "/kelas", label: "Kelas", icon: "door" },
    ],
  },
  {
    title: "Sekolah",
    items: [
      { href: "/pengaturan", label: "Pengaturan Sekolah", icon: "settings" },
      { href: "/backup", label: "Backup Data", icon: "database" },
    ],
  },
  {
    title: "Bantuan & Akun",
    items: [
      { href: "/kontak", label: "Contact Center", icon: "headset", badge: true },
      { href: "/akun", label: "Akun Saya", icon: "user" },
    ],
  },
];

const NAV_SUPER: NavGroup[] = [
  {
    title: "Kelola",
    items: [
      { href: "/admin/sekolah", label: "Sekolah", icon: "school" },
      { href: "/admin/pengguna", label: "Pengguna & Undangan", icon: "users" },
    ],
  },
  {
    title: "Bantuan & Akun",
    items: [
      { href: "/admin/inbox", label: "Inbox", icon: "inbox", badge: true },
      { href: "/akun", label: "Akun Saya", icon: "user" },
    ],
  },
];

export function Shell({ children }: { children: ReactNode }) {
  const path = usePathname();
  const [open, setOpen] = useState(false);
  const { data: user, reload } = useApi<CurrentUser>("/api/auth/me");

  useEffect(() => {
    window.addEventListener("settings-updated", reload);
    return () => window.removeEventListener("settings-updated", reload);
  }, [reload]);

  // Badge pesan belum dibaca (Contact Center / Inbox): dicek berkala & saat halaman inbox berubah.
  const unread = useApi<{ count: number }>(user ? "/api/inbox/unread" : "");
  const reloadUnread = unread.reload;
  useEffect(() => {
    if (!user) return;
    const t = setInterval(reloadUnread, 60_000);
    window.addEventListener("inbox-updated", reloadUnread);
    return () => {
      clearInterval(t);
      window.removeEventListener("inbox-updated", reloadUnread);
    };
  }, [user, reloadUnread]);
  const unreadCount = unread.data?.count ?? 0;

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
        className={`fixed inset-y-0 left-0 z-30 flex w-60 shrink-0 flex-col border-r border-slate-200 bg-white transition-transform md:sticky md:top-0 md:h-screen md:translate-x-0 print:hidden ${open ? "translate-x-0" : "-translate-x-full"}`}
      >
        <div className="border-b border-slate-200 px-5 py-4">
          <div className="text-xs font-medium uppercase tracking-wide text-blue-600">Jadwal Mengajar</div>
          <div className="mt-0.5 truncate text-sm font-semibold text-slate-800" title={title ?? undefined}>
            {title ?? "…"}
          </div>
        </div>
        <nav className="flex-1 space-y-4 overflow-y-auto p-3">
          {nav.map((g, gi) => (
            <div key={gi}>
              {g.title && <div className="mb-1 px-3 text-[11px] font-semibold uppercase tracking-wider text-slate-400">{g.title}</div>}
              <div className="flex flex-col gap-0.5">
                {g.items.map((n) => {
                  const active = n.href === "/" ? path === "/" : path.startsWith(n.href);
                  return (
                    <Link
                      key={n.href}
                      href={n.href}
                      onClick={() => setOpen(false)}
                      className={`flex items-center gap-2.5 rounded-md px-3 py-2 text-sm ${active ? "bg-blue-50 font-medium text-blue-700" : "text-slate-600 hover:bg-slate-100"}`}
                    >
                      <Icon name={n.icon} className={active ? "text-blue-600" : "text-slate-400"} />
                      <span className="flex-1">{n.label}</span>
                      {n.badge && unreadCount > 0 && (
                        <span className="rounded-full bg-red-600 px-1.5 py-px text-[10px] font-semibold text-white">{unreadCount > 99 ? "99+" : unreadCount}</span>
                      )}
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>
        <div className="border-t border-slate-200 p-4 text-sm">
          <div className="truncate font-medium text-slate-700">{user?.name ?? "…"}</div>
          <div className="truncate text-xs text-slate-400">
            @{user?.username} · {isSuper ? "Superadmin" : "Admin"}
          </div>
          <button onClick={logout} className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-red-600 hover:underline">
            <Icon name="logout" size={12} />
            Keluar
          </button>
        </div>
      </aside>
      {open && <div className="fixed inset-0 z-20 bg-slate-900/30 md:hidden" onClick={() => setOpen(false)} />}
      <div className="min-w-0 flex-1">
        <header className="sticky top-0 z-10 flex items-center gap-3 border-b border-slate-200 bg-white px-4 py-3 md:hidden print:hidden">
          <button onClick={() => setOpen(true)} className="rounded border border-slate-300 p-1.5" aria-label="Menu">
            <Icon name="menu" />
          </button>
          <span className="truncate text-sm font-semibold">{title}</span>
        </header>
        <main className="p-4 md:p-6 print:p-0">{children}</main>
      </div>
      <Toaster />
    </div>
  );
}
