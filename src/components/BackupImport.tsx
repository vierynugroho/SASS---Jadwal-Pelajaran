"use client";

import { useRef, useState } from "react";
import { api, toast } from "@/lib/client";
import { Button } from "./ui";

/** Tombol pilih file backup lalu import ke endpoint tertentu (dengan konfirmasi). */
export function ImportButton({
  endpoint,
  schoolName,
  onDone,
  size = "md",
  className,
  label = "⬆ Pilih file backup",
}: {
  endpoint: string;
  schoolName: string;
  onDone?: () => void;
  size?: "sm" | "md";
  className?: string;
  label?: string;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);

  async function onFile(file: File) {
    let parsed: { app?: string; exportedAt?: string; settings?: { schoolName?: string }; data?: Record<string, unknown[]> };
    try {
      parsed = JSON.parse(await file.text());
    } catch {
      return toast("File bukan JSON yang valid", "error");
    }
    if (parsed.app !== "jadwal-mengajar" || !parsed.data) return toast("File bukan backup Jadwal Mengajar", "error");
    const c = parsed.data;
    const summary = `${c.teachers?.length ?? 0} guru, ${c.subjects?.length ?? 0} mapel, ${c.classes?.length ?? 0} kelas, ${c.schedules?.length ?? 0} jadwal`;
    const when = parsed.exportedAt ? new Date(parsed.exportedAt).toLocaleString("id-ID") : "-";
    const from = parsed.settings?.schoolName ? `\nAsal: ${parsed.settings.schoolName}` : "";
    if (!confirm(`Import backup tanggal ${when}${from}\nBerisi: ${summary}\n\nSELURUH data jadwal "${schoolName}" akan DIGANTI. Lanjutkan?`)) return;
    setBusy(true);
    try {
      await api(endpoint, { method: "POST", body: parsed });
      toast(`Import ke ${schoolName} berhasil`);
      onDone?.();
    } catch (e) {
      toast((e as Error).message, "error");
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <input
        ref={fileRef}
        type="file"
        accept="application/json,.json"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          e.target.value = "";
          if (f) onFile(f);
        }}
      />
      <Button size={size} variant={size === "sm" ? "ghost" : "secondary"} className={className} disabled={busy} onClick={() => fileRef.current?.click()}>
        {busy ? "Mengimpor…" : label}
      </Button>
    </>
  );
}
