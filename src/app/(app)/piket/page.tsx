"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { api, toast } from "@/lib/client";
import { useAllData } from "@/lib/useAllData";
import type { DutyEntry } from "@/lib/types";
import { Button, Card, Empty, Loading, PageHeader, Select } from "@/components/ui";
import { Icon } from "@/components/icons";

const key = (day: string, classId: string | null) => `${day}|${classId ?? ""}`;

export default function PiketPage() {
  const d = useAllData();
  if (!d.ready) return <Loading error={d.error} />;
  return <PiketEditor d={d} />;
}

function PiketEditor({ d }: { d: ReturnType<typeof useAllData> }) {
  const [cells, setCells] = useState(() => new Map(d.duties.map((e) => [key(e.day, e.classId), e.teacherIds])));
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const days = d.settings.days.filter((x) => x.active);
  const rows = useMemo(() => [{ _id: null as string | null, name: "Umum (semua kelas)" }, ...d.classes], [d.classes]);

  const get = (day: string, classId: string | null) => cells.get(key(day, classId)) ?? [];
  const put = (day: string, classId: string | null, ids: string[]) => {
    const next = new Map(cells);
    next.set(key(day, classId), ids);
    setCells(next);
    setDirty(true);
  };

  /** Jumlah hari piket per guru, untuk membantu pemerataan. */
  const load = useMemo(() => {
    const m = new Map<string, number>();
    for (const ids of cells.values()) for (const id of ids) m.set(id, (m.get(id) ?? 0) + 1);
    return m;
  }, [cells]);

  async function save() {
    const entries: DutyEntry[] = [];
    for (const [k, teacherIds] of cells) {
      const [day, classId] = k.split("|");
      if (teacherIds.length) entries.push({ day, classId: classId || null, teacherIds });
    }
    setSaving(true);
    try {
      const saved = await api<DutyEntry[]>("/api/duties", { method: "PUT", body: { entries } });
      d.setDuties(saved);
      setDirty(false);
      toast("Jadwal piket tersimpan");
    } catch (err) {
      toast((err as Error).message, "error");
    } finally {
      setSaving(false);
    }
  }

  if (!d.teachers.length) return (
    <div>
      <PageHeader title="Guru Piket" />
      <Empty>Belum ada data guru. <Link href="/guru" className="text-blue-600 underline">Tambah guru</Link> terlebih dahulu.</Empty>
    </div>
  );

  return (
    <div>
      <PageHeader
        title="Guru Piket"
        description="Atur guru piket per hari. Satu hari/kelas boleh lebih dari satu guru. Baris “Umum” untuk piket yang berlaku di semua kelas."
        actions={
          <>
            <Button onClick={save} disabled={!dirty || saving}><Icon name={dirty ? "save" : "check"} />{saving ? "Menyimpan…" : dirty ? "Simpan" : "Tersimpan"}</Button>
          </>
        }
      />
      <Card className="overflow-x-auto">
        <table className="w-full min-w-[640px] table-fixed border-collapse text-sm">
          <thead>
            <tr className="bg-slate-50 text-left text-xs uppercase text-slate-500">
              <th className="sticky left-0 z-[1] w-28 border-b sm:w-40 border-slate-200 bg-slate-50 px-3 py-2">Kelas</th>
              {days.map((day) => <th key={day.day} className="border-b border-l border-slate-200 px-3 py-2">{day.day}</th>)}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row._id ?? "umum"} className={row._id ? "" : "bg-amber-50/40"}>
                <td className="sticky left-0 z-[1] border-b border-slate-200 bg-white px-3 py-2 align-top font-medium">{row.name}</td>
                {days.map((day) => {
                  const ids = get(day.day, row._id);
                  const free = d.teachers.filter((t) => !ids.includes(t._id));
                  return (
                    <td key={day.day} className="border-b border-l border-slate-200 px-2 py-2 align-top">
                      <div className="flex flex-col gap-1">
                        {ids.map((id) => (
                          <span key={id} className="flex items-center justify-between gap-1 rounded bg-blue-50 px-2 py-0.5 text-xs text-blue-800">
                            <span className="truncate">{d.teacherMap.get(id)?.name ?? "?"}</span>
                            <button className="text-blue-400 hover:text-red-600" title="Hapus" onClick={() => put(day.day, row._id, ids.filter((x) => x !== id))}><Icon name="x" size={12} /></button>
                          </span>
                        ))}
                        {free.length > 0 && (
                          <Select className="py-1 text-xs text-slate-500" value="" onChange={(e) => e.target.value && put(day.day, row._id, [...ids, e.target.value])}>
                            <option value="">+ Tambah guru</option>
                            {free.map((t) => (
                              <option key={t._id} value={t._id}>{t.name}{load.get(t._id) ? ` (${load.get(t._id)}×)` : ""}</option>
                            ))}
                          </Select>
                        )}
                      </div>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
      <p className="mt-2 text-xs text-slate-400">Angka “(n×)” di pilihan guru = jumlah tugas piket guru tersebut minggu ini.</p>
    </div>
  );
}
