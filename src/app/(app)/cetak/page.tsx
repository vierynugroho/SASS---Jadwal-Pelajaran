"use client";

import { useMemo, useState } from "react";
import { useAllData } from "@/lib/useAllData";
import { computeDay, fmtRange, itemsOf, type TimedItem } from "@/lib/schedule";
import type { ClassRoom, DayConfig, Teacher } from "@/lib/types";
import { Button, Card, Empty, Field, Loading, PageHeader, Select } from "@/components/ui";

type Mode = "kelas" | "guru";
type Data = ReturnType<typeof useAllData>;

export default function CetakPage() {
  const d = useAllData();
  const [mode, setMode] = useState<Mode>("kelas");
  const [target, setTarget] = useState("all");
  const [showTeacher, setShowTeacher] = useState(true);
  const [useColor, setUseColor] = useState(true);
  const [signature, setSignature] = useState(true);
  const [printDate, setPrintDate] = useState(""); // kosong = hari ini

  const activeDays = useMemo(() => d.settings?.days.filter((x) => x.active) ?? [], [d.settings]);

  if (!d.ready) return <Loading error={d.error} />;

  const list: (ClassRoom | Teacher)[] = mode === "kelas" ? d.classes : d.teachers;
  const selected = target === "all" ? list : list.filter((x) => x._id === target);
  const opts = { showTeacher, useColor, signature, printDate };

  return (
    <div>
      <PageHeader
        title="Cetak Jadwal"
        description='Klik "Cetak / Simpan PDF", lalu pilih tujuan "Simpan sebagai PDF" di dialog cetak browser.'
        actions={<Button onClick={() => window.print()} disabled={!selected.length}>🖨 Cetak / Simpan PDF</Button>}
      />

      <Card className="mb-6 p-4 print:hidden">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Field label="Jenis jadwal">
            <Select value={mode} onChange={(e) => (setMode(e.target.value as Mode), setTarget("all"))}>
              <option value="kelas">Per kelas</option>
              <option value="guru">Per guru</option>
            </Select>
          </Field>
          <Field label={mode === "kelas" ? "Kelas" : "Guru"}>
            <Select value={target} onChange={(e) => setTarget(e.target.value)}>
              <option value="all">Semua ({list.length}) — 1 halaman per {mode}</option>
              {list.map((x) => (
                <option key={x._id} value={x._id}>{x.name}</option>
              ))}
            </Select>
          </Field>
          <Field label="Tanggal cetak" help="Kosongkan untuk memakai tanggal hari ini.">
            <input type="date" className="w-full rounded-md border border-slate-300 px-2.5 py-1.5 text-sm" value={printDate} onChange={(e) => setPrintDate(e.target.value)} />
          </Field>
          <div className="flex flex-col justify-end gap-1 text-sm">
            {mode === "kelas" && <Check label="Tampilkan nama guru" checked={showTeacher} onChange={setShowTeacher} />}
            <Check label="Warna mapel" checked={useColor} onChange={setUseColor} />
            <Check label="Tanda tangan kepala sekolah" checked={signature} onChange={setSignature} />
          </div>
        </div>
      </Card>

      {!selected.length ? (
        <Empty>Belum ada data {mode}.</Empty>
      ) : (
        <div className="space-y-6 print:space-y-0">
          {selected.map((x) =>
            mode === "kelas" ? (
              <ClassSheet key={x._id} cls={x as ClassRoom} days={activeDays} d={d} opts={opts} />
            ) : (
              <TeacherSheet key={x._id} teacher={x as Teacher} days={activeDays} d={d} opts={opts} />
            ),
          )}
        </div>
      )}
    </div>
  );
}

type Opts = { showTeacher: boolean; useColor: boolean; signature: boolean; printDate: string };

function Check({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex items-center gap-2">
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      {label}
    </label>
  );
}

function Sheet({ title, subtitle, d, opts, children }: { title: string; subtitle?: string; d: Data; opts: Opts; children: React.ReactNode }) {
  const s = d.settings;
  // Sheet hanya dirender setelah data dimuat di browser, jadi aman memakai tanggal saat ini.
  const date = (opts.printDate ? new Date(opts.printDate + "T00:00:00") : new Date()).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" });
  return (
    <section className="print-page rounded-lg border border-slate-200 bg-white p-8 shadow-sm">
      <header className="mb-4 border-b-2 border-slate-800 pb-3 text-center">
        <div className="text-lg font-bold uppercase tracking-wide">{s.schoolName}</div>
        {s.address && <div className="text-xs text-slate-600">{s.address}</div>}
      </header>
      <div className="mb-3 text-center">
        <div className="text-base font-bold uppercase">{title}</div>
        <div className="text-xs text-slate-600">
          {[subtitle, s.semester && `Semester ${s.semester}`, s.academicYear && `Tahun Ajaran ${s.academicYear}`].filter(Boolean).join(" · ")}
        </div>
      </div>
      {children}
      {opts.signature && (
        <div className="mt-6 flex justify-end text-sm" style={{ breakInside: "avoid" }}>
          <div className="w-64 text-center">
            <div>{[s.city, date].filter(Boolean).join(", ")}</div>
            <div>Kepala Sekolah,</div>
            <div className="h-16" />
            <div className="font-semibold underline">{s.principalName || "......................................"}</div>
            {s.principalNip && <div className="text-xs">NIP. {s.principalNip}</div>}
          </div>
        </div>
      )}
    </section>
  );
}

const cellBg = (color: string | undefined, on: boolean) => (on && color ? { background: `${color}1f`, borderLeft: `3px solid ${color}` } : undefined);
const th = "border border-slate-400 bg-slate-100 px-2 py-1.5 text-xs font-semibold";
const td = "border border-slate-400 px-2 py-1 align-top text-xs";

function ClassSheet({ cls, days, d, opts }: { cls: ClassRoom; days: DayConfig[]; d: Data; opts: Opts }) {
  const sch = d.schedules.find((s) => s.classId === cls._id);
  const cols = days.map((day) => computeDay(itemsOf(sch, day.day), day, d.settings, d.subjectMap));
  const rows = Math.max(0, ...cols.map((c) => c.length));
  const homeroom = cls.homeroomTeacherId ? d.teacherMap.get(cls.homeroomTeacherId)?.name : undefined;

  // Jika struktur waktu semua hari identik, pakai format baku "Jam ke | Waktu | Senin | ...".
  const sig = (c: TimedItem[]) => c.map((i) => `${i.type}:${i.start}-${i.end}`).join(",");
  const uniform = cols.length > 1 && rows > 0 && cols.every((c) => sig(c) === sig(cols[0]));

  const content = (it: TimedItem | undefined, withTime: boolean) => {
    if (!it) return null;
    if (it.type !== "lesson")
      return (
        <div className="text-center italic text-slate-600">
          {withTime && <div className="font-mono not-italic">{fmtRange(it.start, it.end)}</div>}
          {it.label || (it.type === "break" ? "Istirahat" : "Kegiatan")}
        </div>
      );
    const subj = it.subjectId ? d.subjectMap.get(it.subjectId) : undefined;
    const teacher = it.teacherId ? d.teacherMap.get(it.teacherId) : undefined;
    return (
      <div>
        {withTime && <div className="font-mono text-[10px] text-slate-600">{fmtRange(it.start, it.end)}</div>}
        <div className="font-semibold">{subj?.name ?? "?"}</div>
        {opts.showTeacher && teacher && <div className="text-[10px] text-slate-600">{teacher.name}</div>}
      </div>
    );
  };

  return (
    <Sheet title={`Jadwal Pelajaran Kelas ${cls.name}`} subtitle={homeroom && `Wali Kelas: ${homeroom}`} d={d} opts={opts}>
      {rows === 0 ? (
        <p className="py-6 text-center text-sm text-slate-400">Jadwal kelas ini belum disusun.</p>
      ) : (
        <table className="print-table w-full border-collapse">
          <thead>
            <tr>
              {uniform && <th className={`${th} w-14`}>Jam ke</th>}
              {uniform && <th className={`${th} w-24`}>Waktu</th>}
              {days.map((day) => <th key={day.day} className={th}>{day.day}</th>)}
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: rows }, (_, r) => {
              const first = cols[0][r];
              if (uniform && first.type !== "lesson")
                return (
                  <tr key={r}>
                    <td className={`${td} text-center`}>–</td>
                    <td className={`${td} text-center font-mono`}>{fmtRange(first.start, first.end)}</td>
                    {cols.map((c, i) => (
                      <td key={i} className={`${td} bg-slate-50 text-center italic text-slate-600`}>{c[r].label || "Istirahat"}</td>
                    ))}
                  </tr>
                );
              return (
                <tr key={r}>
                  {uniform && <td className={`${td} text-center`}>{first.jpFrom === first.jpTo ? first.jpFrom : `${first.jpFrom}–${first.jpTo}`}</td>}
                  {uniform && <td className={`${td} text-center font-mono`}>{fmtRange(first.start, first.end)}</td>}
                  {cols.map((c, i) => {
                    const it = c[r];
                    const subj = it?.subjectId ? d.subjectMap.get(it.subjectId) : undefined;
                    return (
                      <td key={i} className={`${td} ${it && it.type !== "lesson" ? "bg-slate-50" : ""}`} style={it?.type === "lesson" ? cellBg(subj?.color, opts.useColor) : undefined}>
                        {content(it, !uniform)}
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </Sheet>
  );
}

function TeacherSheet({ teacher, days, d, opts }: { teacher: Teacher; days: DayConfig[]; d: Data; opts: Opts }) {
  const cols = days.map((day) =>
    d.schedules
      .flatMap((sch) =>
        computeDay(itemsOf(sch, day.day), day, d.settings, d.subjectMap)
          .filter((it) => it.type === "lesson" && it.teacherId === teacher._id)
          .map((it) => ({ ...it, classId: sch.classId })),
      )
      .sort((a, b) => a.start - b.start),
  );
  const rows = Math.max(0, ...cols.map((c) => c.length));
  const totalJp = cols.flat().reduce((a, i) => a + (i.jp || 1), 0);

  return (
    <Sheet title={`Jadwal Mengajar ${teacher.name}`} subtitle={[teacher.nip && `NIP ${teacher.nip}`, `Total ${totalJp} JP / minggu`].filter(Boolean).join(" · ")} d={d} opts={opts}>
      {rows === 0 ? (
        <p className="py-6 text-center text-sm text-slate-400">Guru ini belum memiliki jadwal mengajar.</p>
      ) : (
        <table className="print-table w-full border-collapse">
          <thead>
            <tr>{days.map((day) => <th key={day.day} className={th}>{day.day}</th>)}</tr>
          </thead>
          <tbody>
            {Array.from({ length: rows }, (_, r) => (
              <tr key={r}>
                {cols.map((c, i) => {
                  const it = c[r];
                  const subj = it?.subjectId ? d.subjectMap.get(it.subjectId) : undefined;
                  return (
                    <td key={i} className={td} style={it ? cellBg(subj?.color, opts.useColor) : undefined}>
                      {it && (
                        <div>
                          <div className="font-mono text-[10px] text-slate-600">{fmtRange(it.start, it.end)} · {it.jp || 1} JP</div>
                          <div className="font-semibold">{d.classMap.get(it.classId)?.name ?? "?"}</div>
                          <div className="text-[10px] text-slate-600">{subj?.name}</div>
                        </div>
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </Sheet>
  );
}
