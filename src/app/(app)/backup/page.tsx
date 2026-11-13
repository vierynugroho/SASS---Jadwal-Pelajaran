"use client";

import { ImportButton } from "@/components/BackupImport";
import { Button, Card, PageHeader } from "@/components/ui";
import { useApi } from "@/lib/client";
import type { CurrentUser } from "@/lib/types";

export default function BackupPage() {
  const { data: me } = useApi<CurrentUser>("/api/auth/me");
  const school = me?.schoolName ?? "sekolah ini";
  return (
    <div className="max-w-3xl">
      <PageHeader title="Backup Data" description={`Cadangan manual data jadwal ${school} dalam bentuk file JSON.`} />
      <div className="grid gap-4 sm:grid-cols-2">
        <Card className="p-5">
          <h2 className="font-semibold">Export</h2>
          <p className="mt-1 mb-4 text-sm text-slate-500">Unduh pengaturan, guru, mapel, kelas, dan jadwal sekolah ini. Akun pengguna tidak ikut diekspor.</p>
          <Button onClick={() => (window.location.href = "/api/backup")}>⬇ Unduh backup (.json)</Button>
        </Card>
        <Card className="p-5">
          <h2 className="font-semibold">Import</h2>
          <p className="mt-1 mb-4 text-sm text-slate-500">
            Pulihkan dari file backup (boleh dari sekolah lain). <b className="text-red-600">Data jadwal sekolah ini akan diganti</b>; nama sekolah tetap. Sebaiknya export dulu sebelum import.
          </p>
          <ImportButton endpoint="/api/backup" schoolName={school} onDone={() => setTimeout(() => (window.location.href = "/"), 800)} />
        </Card>
      </div>
    </div>
  );
}
