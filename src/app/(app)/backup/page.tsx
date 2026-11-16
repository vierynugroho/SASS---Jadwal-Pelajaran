"use client";

import type { ReactNode } from "react";
import { ImportButton } from "@/components/BackupImport";
import { Button, Card, PageHeader } from "@/components/ui";
import { useApi } from "@/lib/client";
import type { CurrentUser } from "@/lib/types";
import { Icon, type IconName } from "@/components/icons";

export default function BackupPage() {
  const { data: me } = useApi<CurrentUser>("/api/auth/me");
  const school = me?.schoolName ?? "sekolah ini";
  return (
    <div className="max-w-4xl">
      <PageHeader title="Backup Data" description={`Cadangan manual data jadwal ${school} dalam bentuk file JSON.`} />
      <div className="grid gap-4 md:grid-cols-2">
        <BackupCard
          icon="download"
          tone="blue"
          title="Export"
          action={
            <Button className="w-full sm:w-auto" onClick={() => (window.location.href = "/api/backup")}>
              <Icon name="download" />
              Unduh backup (.json)
            </Button>
          }
        >
          <p>Unduh semua data sekolah ini dalam satu file:</p>
          <ul className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1">
            {["Pengaturan sekolah", "Guru", "Mata pelajaran", "Kelas", "Jadwal pelajaran", "Guru piket"].map((x) => (
              <li key={x} className="flex items-center gap-1.5">
                <Icon name="check" size={12} className="text-green-600" />
                {x}
              </li>
            ))}
          </ul>
          <p className="mt-2 text-xs text-slate-400">Akun pengguna tidak ikut diekspor.</p>
        </BackupCard>

        <BackupCard
          icon="upload"
          tone="amber"
          title="Import"
          action={<ImportButton className="w-full sm:w-auto" endpoint="/api/backup" schoolName={school} onDone={() => setTimeout(() => (window.location.href = "/"), 800)} />}
        >
          <p>Pulihkan dari file backup (boleh dari sekolah lain). Nama sekolah tidak berubah.</p>
          <p className="mt-3 flex items-start gap-2 rounded-md border border-red-200 bg-red-50 p-2.5 text-xs text-red-700">
            <Icon name="alert" size={14} className="mt-px shrink-0" />
            <span>
              <b>Data jadwal sekolah ini akan diganti seluruhnya.</b> Sebaiknya export dulu sebelum import.
            </span>
          </p>
        </BackupCard>
      </div>
    </div>
  );
}

/** Card dengan tombol aksi selalu rata di bawah, apa pun panjang isinya. */
function BackupCard({ icon, tone, title, children, action }: { icon: IconName; tone: "blue" | "amber"; title: string; children: ReactNode; action: ReactNode }) {
  const toneCls = tone === "blue" ? "bg-blue-50 text-blue-600" : "bg-amber-50 text-amber-600";
  return (
    <Card className="flex flex-col p-5">
      <div className="mb-3 flex items-center gap-3">
        <span className={`flex h-9 w-9 items-center justify-center rounded-lg ${toneCls}`}>
          <Icon name={icon} size={18} />
        </span>
        <h2 className="font-semibold">{title}</h2>
      </div>
      <div className="flex-1 text-sm text-slate-600">{children}</div>
      <div className="mt-5 border-t border-slate-100 pt-4">{action}</div>
    </Card>
  );
}
