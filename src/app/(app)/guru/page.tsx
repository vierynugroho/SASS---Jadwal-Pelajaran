"use client";

import { CrudPage } from "@/components/CrudPage";
import { useApi } from "@/lib/client";
import type { Subject, Teacher } from "@/lib/types";

export default function GuruPage() {
  const { data: subjects } = useApi<Subject[]>("/api/subjects");
  const sMap = new Map((subjects ?? []).map((s) => [s._id, s]));
  return (
    <CrudPage<Teacher & Record<string, unknown>>
      title="Data Guru"
      description="Daftar guru dan mata pelajaran yang diampu."
      singular="Guru"
      endpoint="/api/teachers"
      empty={{ name: "", code: "", nip: "", phone: "", subjectIds: [] }}
      fields={[
        { name: "name", label: "Nama lengkap", required: true, placeholder: "mis. Budi Santoso, S.Pd." },
        { name: "code", label: "Kode guru", placeholder: "mis. BS", help: "Singkatan untuk tampilan ringkas di jadwal." },
        { name: "nip", label: "NIP / NUPTK" },
        { name: "phone", label: "No. HP" },
        {
          name: "subjectIds",
          label: "Mapel yang diampu",
          type: "multi",
          options: (subjects ?? []).map((s) => ({ value: s._id, label: s.name })),
          help: "Dipakai untuk menyaring pilihan guru saat menyusun jadwal.",
        },
      ]}
      columns={[
        { label: "Nama", render: (r) => <span className="font-medium">{r.name}</span> },
        { label: "Kode", render: (r) => r.code || "–" },
        { label: "NIP", render: (r) => r.nip || "–" },
        {
          label: "Mapel",
          render: (r) => (
            <div className="flex flex-wrap gap-1">
              {r.subjectIds.map((id) => sMap.get(id)).filter(Boolean).map((s) => (
                <span key={s!._id} className="rounded px-1.5 py-0.5 text-xs" style={{ background: `${s!.color}22`, color: s!.color }}>
                  {s!.name}
                </span>
              ))}
            </div>
          ),
        },
      ]}
    />
  );
}
