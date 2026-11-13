"use client";

import { CrudPage } from "@/components/CrudPage";
import type { Subject } from "@/lib/types";
import { LIMITS } from "@/lib/limits";

export default function MapelPage() {
  return (
    <CrudPage<Subject & Record<string, unknown>>
      title="Mata Pelajaran"
      description="Durasi per JP bisa diatur khusus per mapel. Kosongkan untuk mengikuti durasi default harinya."
      singular="Mapel"
      endpoint="/api/subjects"
      empty={{ name: "", code: "", color: "#3b82f6", duration: null }}
      fields={[
        { name: "name", label: "Nama mapel", required: true, placeholder: "mis. Matematika" },
        { name: "code", label: "Kode / singkatan", placeholder: "mis. MTK" },
        {
          name: "duration",
          label: "Durasi 1 JP (menit)",
          type: "number",
          limit: LIMITS.subjectDuration,
          placeholder: "ikut default hari",
          help: `Opsional, ${LIMITS.subjectDuration.min}–${LIMITS.subjectDuration.max} menit. Contoh: PJOK 35 menit, mapel lain 40 menit.`,
        },
        { name: "color", label: "Warna", type: "color" },
      ]}
      columns={[
        {
          label: "Nama",
          render: (r) => (
            <span className="inline-flex items-center gap-2 font-medium">
              <span className="h-3 w-3 rounded-full" style={{ background: r.color }} />
              {r.name}
            </span>
          ),
        },
        { label: "Kode", render: (r) => r.code || "–" },
        { label: "Durasi / JP", render: (r) => (r.duration ? `${r.duration} menit` : <span className="text-slate-400">ikut hari</span>) },
      ]}
    />
  );
}
