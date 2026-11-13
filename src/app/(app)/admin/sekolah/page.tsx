"use client";

import { useState } from "react";
import { CrudPage } from "@/components/CrudPage";
import { InviteDialog } from "@/components/InviteDialog";
import { ImportButton } from "@/components/BackupImport";
import { Button } from "@/components/ui";
import { useApi } from "@/lib/client";
import type { School } from "@/lib/types";

export default function SekolahPage() {
  const { data: schools, reload } = useApi<School[]>("/api/admin/schools");
  const [inviteFor, setInviteFor] = useState<string | null>(null);

  return (
    <>
      <CrudPage<School & Record<string, unknown>>
        title="Sekolah"
        description="Daftarkan sekolah, undang admin untuk mengelola jadwalnya, serta backup / import data per sekolah."
        singular="Sekolah"
        endpoint="/api/admin/schools"
        onChanged={reload}
        empty={{ schoolName: "", address: "", city: "", active: true }}
        fields={[
          { name: "schoolName", label: "Nama sekolah", required: true, placeholder: "mis. SMP Negeri 1 Contoh" },
          { name: "address", label: "Alamat" },
          { name: "city", label: "Kota" },
          { name: "active", label: "Status", type: "boolean", placeholder: "Aktif (admin sekolah bisa login)" },
        ]}
        columns={[
          { label: "Nama", render: (r) => <span className="font-medium">{r.schoolName}</span> },
          { label: "Kota", render: (r) => r.city || "–" },
          { label: "Admin", render: (r) => r.userCount ?? 0, className: "text-right" },
          { label: "Kelas", render: (r) => r.classCount ?? 0, className: "text-right" },
          {
            label: "Status",
            render: (r) => (
              <span className={`rounded px-1.5 py-0.5 text-xs ${r.active ? "bg-green-50 text-green-700" : "bg-slate-100 text-slate-500"}`}>
                {r.active ? "Aktif" : "Nonaktif"}
              </span>
            ),
          },
        ]}
        rowActions={(r) => (
          <>
            {r.active && (
              <Button size="sm" variant="ghost" className="text-blue-700" onClick={() => setInviteFor(r._id)}>
                Undang admin
              </Button>
            )}
            <Button size="sm" variant="ghost" title="Unduh backup data sekolah ini" onClick={() => (window.location.href = `/api/admin/schools/${r._id}/backup`)}>
              Export
            </Button>
            <ImportButton size="sm" label="Import" endpoint={`/api/admin/schools/${r._id}/backup`} schoolName={r.schoolName} onDone={reload} />
          </>
        )}
        confirmDelete={(r) =>
          `Hapus sekolah "${r.schoolName}" beserta SELURUH datanya (guru, mapel, kelas, jadwal)? Tindakan ini tidak bisa dibatalkan.`
        }
      />
      <InviteDialog open={!!inviteFor} onClose={() => setInviteFor(null)} schools={schools ?? []} defaultSchoolId={inviteFor ?? undefined} />
    </>
  );
}
