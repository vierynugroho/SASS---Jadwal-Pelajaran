"use client";

import { useState } from "react";
import { CrudPage } from "@/components/CrudPage";
import { InviteDialog } from "@/components/InviteDialog";
import { Button, Card, PageHeader } from "@/components/ui";
import { api, toast, useApi } from "@/lib/client";
import type { AppUser, CurrentUser, InviteInfo, School } from "@/lib/types";

export default function PenggunaPage() {
  const { data: me } = useApi<CurrentUser>("/api/auth/me");
  const { data: schools } = useApi<School[]>("/api/admin/schools");
  const invites = useApi<InviteInfo[]>("/api/admin/invites");
  const [inviteOpen, setInviteOpen] = useState(false);
  const schoolName = new Map((schools ?? []).map((s) => [s._id, s.schoolName]));

  return (
    <div className="space-y-10">
      <CrudPage<AppUser & Record<string, unknown>>
        title="Pengguna"
        description="Pengguna baru ditambahkan melalui link undangan."
        singular="Pengguna"
        endpoint="/api/admin/users"
        canCreate={false}
        onChanged={invites.reload}
        empty={{ name: "", role: "admin", schoolId: null, active: true, password: "" }}
        fields={[
          { name: "name", label: "Nama", required: true },
          {
            name: "role",
            label: "Role",
            type: "select",
            noEmpty: true,
            options: [
              { value: "admin", label: "Admin sekolah" },
              { value: "superadmin", label: "Superadmin" },
            ],
          },
          {
            name: "schoolId",
            label: "Sekolah",
            type: "select",
            noEmpty: true,
            show: (v) => v.role === "admin",
            options: (schools ?? []).map((s) => ({ value: s._id, label: s.schoolName })),
          },
          { name: "active", label: "Status", type: "boolean", placeholder: "Aktif (boleh login)" },
          { name: "password", label: "Reset password", type: "password", placeholder: "Kosongkan jika tidak diubah", help: "Minimal 6 karakter." },
        ]}
        columns={[
          {
            label: "Nama",
            render: (r) => (
              <span className="font-medium">
                {r.name}
                {r._id === me?.id && <span className="ml-1.5 text-xs font-normal text-slate-400">(Anda)</span>}
              </span>
            ),
          },
          { label: "Username", render: (r) => `@${r.username}` },
          {
            label: "Role",
            render: (r) => (
              <span className={`rounded px-1.5 py-0.5 text-xs ${r.role === "superadmin" ? "bg-purple-50 text-purple-700" : "bg-blue-50 text-blue-700"}`}>
                {r.role === "superadmin" ? "Superadmin" : "Admin"}
              </span>
            ),
          },
          { label: "Sekolah", render: (r) => (r.schoolId ? schoolName.get(r.schoolId) ?? "?" : "–") },
          { label: "Status", render: (r) => (r.active ? "Aktif" : <span className="text-slate-400">Nonaktif</span>) },
        ]}
        confirmDelete={(r) => `Hapus pengguna "${r.name}" (@${r.username})? Data jadwal sekolah tidak ikut terhapus.`}
      />

      <section>
        <PageHeader
          title="Undangan"
          description="Link undangan sekali pakai. Penerima membuat username & password sendiri."
          actions={<Button onClick={() => setInviteOpen(true)}>+ Buat undangan</Button>}
        />
        <Card>
          {!invites.data?.length ? (
            <p className="p-6 text-center text-sm text-slate-400">Belum ada undangan.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 text-left text-xs uppercase text-slate-500">
                  <tr>
                    <th className="px-4 py-2.5">Dibuat</th>
                    <th className="px-4 py-2.5">Role</th>
                    <th className="px-4 py-2.5">Sekolah</th>
                    <th className="px-4 py-2.5">Catatan</th>
                    <th className="px-4 py-2.5">Status</th>
                    <th className="px-4 py-2.5" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {invites.data.map((inv) => (
                    <InviteRow key={inv._id} inv={inv} schoolName={inv.schoolId ? schoolName.get(inv.schoolId) : undefined} onChanged={invites.reload} />
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </section>

      <InviteDialog open={inviteOpen} onClose={() => setInviteOpen(false)} schools={schools ?? []} onCreated={invites.reload} />
    </div>
  );
}

function InviteRow({ inv, schoolName, onChanged }: { inv: InviteInfo; schoolName?: string; onChanged: () => void }) {
  const fmtDate = (d: string) => new Date(d).toLocaleString("id-ID", { dateStyle: "medium", timeStyle: "short" });
  const status = inv.usedAt
    ? { label: `Dipakai ${fmtDate(inv.usedAt)}`, cls: "text-green-700" }
    : inv.expired
      ? { label: "Kedaluwarsa", cls: "text-slate-400" }
      : { label: `Menunggu · s.d. ${fmtDate(inv.expiresAt)}`, cls: "text-amber-700" };

  async function revoke() {
    if (!confirm("Batalkan undangan ini? Link tidak akan bisa dipakai lagi.")) return;
    try {
      await api(`/api/admin/invites/${inv._id}`, { method: "DELETE" });
      toast("Undangan dibatalkan");
      onChanged();
    } catch (e) {
      toast((e as Error).message, "error");
    }
  }

  return (
    <tr>
      <td className="px-4 py-2.5 whitespace-nowrap">{fmtDate(inv.createdAt)}</td>
      <td className="px-4 py-2.5">{inv.role === "superadmin" ? "Superadmin" : "Admin"}</td>
      <td className="px-4 py-2.5">{schoolName ?? "–"}</td>
      <td className="px-4 py-2.5 text-slate-500">{inv.note || "–"}</td>
      <td className={`px-4 py-2.5 text-xs ${status.cls}`}>{status.label}</td>
      <td className="px-4 py-2.5 text-right">
        {!inv.usedAt && (
          <Button size="sm" variant="ghost" className="text-red-600" onClick={revoke}>
            Batalkan
          </Button>
        )}
      </td>
    </tr>
  );
}
