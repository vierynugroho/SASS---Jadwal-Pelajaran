"use client";

import { CrudPage } from "@/components/CrudPage";
import { useApi } from "@/lib/client";
import type { ClassRoom, Teacher } from "@/lib/types";

export default function KelasPage() {
  const { data: teachers } = useApi<Teacher[]>("/api/teachers");
  const tMap = new Map((teachers ?? []).map((t) => [t._id, t]));
  return (
    <CrudPage<ClassRoom & Record<string, unknown>>
      title="Data Kelas"
      description="Daftar kelas / rombongan belajar."
      singular="Kelas"
      endpoint="/api/classes"
      empty={{ name: "", grade: "", homeroomTeacherId: null }}
      fields={[
        { name: "name", label: "Nama kelas", required: true, placeholder: "mis. VII-A" },
        { name: "grade", label: "Tingkat", placeholder: "mis. 7" },
        { name: "homeroomTeacherId", label: "Wali kelas", type: "select", options: (teachers ?? []).map((t) => ({ value: t._id, label: t.name })) },
      ]}
      columns={[
        { label: "Kelas", render: (r) => <span className="font-medium">{r.name}</span> },
        { label: "Tingkat", render: (r) => r.grade || "–" },
        { label: "Wali kelas", render: (r) => (r.homeroomTeacherId ? tMap.get(r.homeroomTeacherId)?.name ?? "–" : "–") },
      ]}
    />
  );
}
