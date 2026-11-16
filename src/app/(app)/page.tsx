"use client";

import Link from "next/link";
import { useMemo } from "react";
import { useAllData } from "@/lib/useAllData";
import { findConflicts, itemsOf, teacherLoad } from "@/lib/schedule";
import { Card, Loading, PageHeader } from "@/components/ui";
import { Icon } from "@/components/icons";

export default function Dashboard() {
  const d = useAllData();

  const stats = useMemo(() => {
    if (!d.ready) return null;
    const conflicts = findConflicts(d.schedules, d.classes, d.settings, d.subjectMap);
    const load = teacherLoad(d.schedules, d.settings, d.subjectMap);
    const active = d.settings.days.filter((x) => x.active);
    const scheduled = d.classes.filter((c) => {
      const s = d.schedules.find((x) => x.classId === c._id);
      return active.some((day) => itemsOf(s, day.day).length > 0);
    }).length;
    return { conflicts: conflicts.size, load, scheduled };
  }, [d.ready, d.schedules, d.classes, d.settings, d.subjectMap]);

  if (!d.ready || !stats) return <Loading error={d.error} />;

  const steps = [
    { done: Boolean(d.settings.academicYear || d.settings.principalName), label: "Lengkapi identitas sekolah & atur hari/jam", href: "/pengaturan" },
    { done: d.subjects.length > 0, label: "Tambah mata pelajaran", href: "/mapel" },
    { done: d.teachers.length > 0, label: "Tambah guru", href: "/guru" },
    { done: d.classes.length > 0, label: "Tambah kelas", href: "/kelas" },
    { done: stats.scheduled > 0, label: "Susun jadwal per kelas", href: "/jadwal" },
  ];

  return (
    <div>
      <PageHeader title={d.settings.schoolName} description={[d.settings.academicYear && `Tahun Ajaran ${d.settings.academicYear}`, d.settings.semester && `Semester ${d.settings.semester}`].filter(Boolean).join(" · ") || "Ringkasan jadwal mengajar"} />

      <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-5">
        <Stat label="Guru" value={d.teachers.length} href="/guru" />
        <Stat label="Mata pelajaran" value={d.subjects.length} href="/mapel" />
        <Stat label="Kelas" value={d.classes.length} href="/kelas" />
        <Stat label="Kelas terjadwal" value={`${stats.scheduled}/${d.classes.length}`} href="/jadwal" />
        <Stat label="Bentrok guru" value={stats.conflicts} href="/jadwal" danger={stats.conflicts > 0} />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="p-4">
          <h2 className="mb-3 font-semibold">Langkah awal</h2>
          <ol className="space-y-2 text-sm">
            {steps.map((s, i) => (
              <li key={s.href} className="flex items-center gap-2">
                <span className={`flex h-5 w-5 items-center justify-center rounded-full text-xs ${s.done ? "bg-green-600 text-white" : "bg-slate-200 text-slate-600"}`}>{s.done ? <Icon name="check" size={12} /> : i + 1}</span>
                <Link href={s.href} className={s.done ? "text-slate-400 line-through" : "text-blue-700 hover:underline"}>{s.label}</Link>
              </li>
            ))}
          </ol>
        </Card>

        <Card className="lg:col-span-2">
          <h2 className="border-b border-slate-200 px-4 py-3 font-semibold">Beban mengajar guru (per minggu)</h2>
          {d.teachers.length === 0 ? (
            <p className="p-4 text-sm text-slate-400">Belum ada guru.</p>
          ) : (
            <div className="max-h-96 overflow-y-auto">
              <table className="w-full text-sm">
                <thead className="sticky top-0 bg-slate-50 text-left text-xs uppercase text-slate-500">
                  <tr>
                    <th className="px-4 py-2">Guru</th>
                    <th className="px-4 py-2 text-right">JP</th>
                    <th className="px-4 py-2 text-right">Jam (60 mnt)</th>
                    <th className="px-4 py-2 text-right">Kelas</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {[...d.teachers]
                    .sort((a, b) => (stats.load.get(b._id)?.jp ?? 0) - (stats.load.get(a._id)?.jp ?? 0))
                    .map((t) => {
                      const l = stats.load.get(t._id);
                      return (
                        <tr key={t._id}>
                          <td className="px-4 py-2">{t.name}</td>
                          <td className="px-4 py-2 text-right font-medium">{l?.jp ?? 0}</td>
                          <td className="px-4 py-2 text-right text-slate-500">{l ? (l.minutes / 60).toFixed(1) : "0"}</td>
                          <td className="px-4 py-2 text-right text-slate-500">{l?.classes.size ?? 0}</td>
                        </tr>
                      );
                    })}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}

function Stat({ label, value, href, danger }: { label: string; value: number | string; href: string; danger?: boolean }) {
  return (
    <Link href={href}>
      <Card className="p-4 hover:border-blue-300">
        <div className="text-xs text-slate-500">{label}</div>
        <div className={`mt-1 text-2xl font-semibold ${danger ? "text-red-600" : "text-slate-900"}`}>{value}</div>
      </Card>
    </Link>
  );
}
