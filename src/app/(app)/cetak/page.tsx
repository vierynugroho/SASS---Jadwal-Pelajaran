"use client";

import { useMemo, useState } from "react";
import { useAllData } from "@/lib/useAllData";
import { computeDay, fmtRange, itemsOf, type TimedItem } from "@/lib/schedule";
import type { ClassRoom, DayConfig, DutyEntry, Teacher } from "@/lib/types";
import { Button, Card, Empty, Field, Input, Loading, PageHeader, Select } from "@/components/ui";
import { Icon } from "@/components/icons";

type Mode = "kelas" | "guru" | "piket";
type Data = ReturnType<typeof useAllData>;

export default function CetakPage() {
  const d = useAllData();
  const [mode, setMode] = useState<Mode>("kelas");
  const [target, setTarget] = useState("all");
  const [showTeacher, setShowTeacher] = useState(true);
  const [useColor, setUseColor] = useState(true);
  const [signature, setSignature] = useState(true);
  const [printDate, setPrintDate] = useState(""); // kosong = hari ini (ditampilkan terisi di input)
  const [showDuty, setShowDuty] = useState(true);
  const [signature2, setSignature2] = useState(false);
  // null = pakai nilai dari Pengaturan Sekolah; diisi = override khusus cetakan ini.
  const [override, setOverride] = useState<Partial<Record<"academicYear" | "semester" | "signer2Title" | "signer2Name" | "signer2Nip", string>>>({});

  const activeDays = useMemo(() => d.settings?.days.filter((x) => x.active) ?? [], [d.settings]);

  if (!d.ready) return <Loading error={d.error} />;

  // Dihitung setelah data dimuat (bukan saat prerender), tanggal lokal hari ini.
  const now = new Date();
  const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
  const s = d.settings;
  const val = (k: keyof typeof override) => override[k] ?? s[k] ?? "";
  const setVal = (k: keyof typeof override, v: string) => setOverride({ ...override, [k]: v });

  const list: (ClassRoom | Teacher)[] = mode === "guru" ? d.teachers : d.classes;
  const selected = target === "all" ? list : list.filter((x) => x._id === target);
  const opts: Opts = {
    showTeacher,
    useColor,
    signature,
    printDate,
    showDuty,
    academicYear: val("academicYear"),
    semester: val("semester"),
    signer2: signature2 ? { title: val("signer2Title"), name: val("signer2Name"), nip: val("signer2Nip") } : null,
  };

  return (
    <div>
      <PageHeader
        title="Cetak Jadwal"
        description='Klik "Cetak / Simpan PDF", lalu pilih tujuan "Simpan sebagai PDF" di dialog cetak browser.'
        actions={<Button onClick={() => window.print()} disabled={mode === "piket" ? !d.duties.length : !selected.length}><Icon name="printer" />Cetak / Simpan PDF</Button>}
      />

      <Card className="mb-6 p-4 print:hidden">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Field label="Jenis jadwal">
            <Select value={mode} onChange={(e) => (setMode(e.target.value as Mode), setTarget("all"))}>
              <option value="kelas">Per kelas</option>
              <option value="guru">Per guru</option>
              <option value="piket">Guru piket</option>
            </Select>
          </Field>
          <Field label={mode === "guru" ? "Guru" : "Kelas"}>
            <Select value={target} onChange={(e) => setTarget(e.target.value)}>
              <option value="all">{mode === "piket" ? `Semua kelas (${list.length}) — 1 halaman` : `Semua (${list.length}) — 1 halaman per ${mode}`}</option>
              {list.map((x) => (
                <option key={x._id} value={x._id}>{x.name}</option>
              ))}
            </Select>
          </Field>
          <Field label="Tanggal cetak" help="Otomatis hari ini; ubah bila perlu.">
            <Input type="date" value={printDate || today} onChange={(e) => setPrintDate(e.target.value)} />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Tahun ajaran">
              <Input value={val("academicYear")} onChange={(e) => setVal("academicYear", e.target.value)} placeholder="2026/2027" />
            </Field>
            <Field label="Semester">
              <Input value={val("semester")} onChange={(e) => setVal("semester", e.target.value)} placeholder="Ganjil" />
            </Field>
          </div>
        </div>
        <div className="mt-4 flex flex-wrap gap-x-6 gap-y-1 border-t border-slate-100 pt-3 text-sm">
          {mode === "kelas" && <Check label="Tampilkan nama guru" checked={showTeacher} onChange={setShowTeacher} />}
          {mode !== "piket" && <Check label="Warna mapel" checked={useColor} onChange={setUseColor} />}
          {mode !== "piket" && <Check label="Sertakan guru piket" checked={showDuty} onChange={setShowDuty} />}
          <Check label="Tanda tangan kepala sekolah" checked={signature} onChange={setSignature} />
          <Check label="Tanda tangan tambahan" checked={signature2} onChange={setSignature2} />
        </div>
        {signature2 && (
          <div className="mt-3 grid gap-3 sm:grid-cols-3">
            <Field label="Jabatan">
              <Input value={val("signer2Title")} onChange={(e) => setVal("signer2Title", e.target.value)} placeholder="Wakil Kepala Kurikulum" />
            </Field>
            <Field label="Nama">
              <Input value={val("signer2Name")} onChange={(e) => setVal("signer2Name", e.target.value)} />
            </Field>
            <Field label="NIP">
              <Input value={val("signer2Nip")} onChange={(e) => setVal("signer2Nip", e.target.value)} placeholder="Kosongkan jika tidak ada" />
            </Field>
          </div>
        )}
        <p className="mt-3 text-xs text-slate-400">Isian tahun ajaran, semester & penanda tangan di sini hanya untuk cetakan ini. Nilai bawaan diatur di Pengaturan Sekolah.</p>
      </Card>

      {mode === "piket" ? (
        !d.duties.length ? (
          <Empty>Belum ada jadwal guru piket. Atur di menu Guru Piket.</Empty>
        ) : (
          <DutySheet classes={selected as ClassRoom[]} all={target === "all"} days={activeDays} d={d} opts={opts} />
        )
      ) : !selected.length ? (
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

type Signer = { title: string; name: string; nip: string };
type Opts = {
  showTeacher: boolean;
  useColor: boolean;
  signature: boolean;
  printDate: string;
  showDuty: boolean;
  academicYear: string;
  semester: string;
  signer2: Signer | null;
};

/** Guru piket untuk satu hari: khusus kelas ini + piket umum. */
function dutyFor(duties: DutyEntry[], day: string, classId: string | null) {
  return [...new Set(duties.filter((e) => e.day === day && (e.classId === classId || (classId !== null && e.classId === null))).flatMap((e) => e.teacherIds))];
}

/** "-" / "--" dianggap kosong (sering dipakai sebagai placeholder). */
const filled = (v: string | undefined) => (v && !/^[-\s.]*$/.test(v) ? v : "");

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
          {[subtitle, opts.semester && `Semester ${opts.semester}`, opts.academicYear && `Tahun Ajaran ${opts.academicYear}`].filter(Boolean).join(" · ")}
        </div>
      </div>
      {children}
      <Signatures
        place={[s.city, date].filter(Boolean).join(", ")}
        principal={opts.signature ? { title: "Kepala Sekolah", name: s.principalName ?? "", nip: s.principalNip ?? "" } : null}
        extra={opts.signer2}
      />
    </section>
  );
}

/**
 * Satu penanda tangan: di kanan dengan tempat & tanggal.
 * Dua penanda tangan: kepala sekolah di kiri ("Mengetahui,"), tambahan di kanan dengan tanggal.
 */
function Signatures({ place, principal, extra }: { place: string; principal: Signer | null; extra: Signer | null }) {
  const blocks = [principal, extra].filter(Boolean) as Signer[];
  if (!blocks.length) return null;
  return (
    <div className={`mt-6 flex text-sm ${blocks.length > 1 ? "justify-between px-8" : "justify-end"}`} style={{ breakInside: "avoid" }}>
      {blocks.map((b, i) => {
        const last = i === blocks.length - 1;
        return (
          <div key={i} className="w-64 text-center">
            <div className={last ? "" : "invisible"}>{place || "\u00a0"}</div>
            <div>{!last && "Mengetahui, "}{b.title || "......................"},</div>
            <div className="h-16" />
            <div className="font-semibold underline">{b.name || "......................................"}</div>
            {filled(b.nip) && <div className="text-xs">NIP. {b.nip}</div>}
          </div>
        );
      })}
    </div>
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
            {opts.showDuty && days.some((day) => dutyFor(d.duties, day.day, cls._id).length) && (
              <tr>
                {uniform && <td colSpan={2} className={`${td} bg-amber-50 text-center font-semibold`}>Guru Piket</td>}
                {days.map((day) => (
                  <td key={day.day} className={`${td} bg-amber-50`}>
                    {!uniform && <div className="font-semibold">Guru Piket</div>}
                    {dutyFor(d.duties, day.day, cls._id).map((id) => (
                      <div key={id} className="text-[10px]">{d.teacherMap.get(id)?.name ?? "?"}</div>
                    ))}
                  </td>
                ))}
              </tr>
            )}
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
  const duty = d.duties
    .filter((e) => e.teacherIds.includes(teacher._id) && days.some((x) => x.day === e.day))
    .sort((a, b) => days.findIndex((x) => x.day === a.day) - days.findIndex((x) => x.day === b.day));
  /** Tempat piket guru ini per hari, mis. ["Umum", "VII-A"]. */
  const dutyOn = (day: string) => duty.filter((e) => e.day === day).map((e) => (e.classId ? d.classMap.get(e.classId)?.name ?? "?" : "Umum"));
  const hasDuty = opts.showDuty && duty.length > 0;

  return (
    <Sheet title={`Jadwal Mengajar ${teacher.name}`} subtitle={[filled(teacher.nip) && `NIP ${teacher.nip}`, `Total ${totalJp} JP / minggu`].filter(Boolean).join(" · ")} d={d} opts={opts}>
      {rows === 0 && !hasDuty ? (
        <p className="py-6 text-center text-sm text-slate-400">Guru ini belum memiliki jadwal mengajar.</p>
      ) : (
        <table className="print-table w-full border-collapse">
          <thead>
            <tr>{days.map((day) => <th key={day.day} className={th}>{day.day}</th>)}</tr>
          </thead>
          <tbody>
            {hasDuty && (
              <tr>
                {days.map((day) => {
                  const where = dutyOn(day.day);
                  return (
                    <td key={day.day} className={`${td} ${where.length ? "bg-amber-50" : ""}`} style={where.length ? { borderLeft: "3px solid #d97706" } : undefined}>
                      {where.length > 0 && (
                        <div>
                          <div className="font-semibold">Piket</div>
                          <div className="text-[10px] text-slate-600">{where.join(", ")}</div>
                        </div>
                      )}
                    </td>
                  );
                })}
              </tr>
            )}
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

function DutySheet({ classes, all, days, d, opts }: { classes: ClassRoom[]; all: boolean; days: DayConfig[]; d: Data; opts: Opts }) {
  // Baris "Umum" + kelas yang punya piket. Jika satu kelas dipilih, piket umum ikut ditampilkan.
  const has = (classId: string | null) => d.duties.some((e) => e.classId === classId && e.teacherIds.length && days.some((x) => x.day === e.day));
  const rows = [
    ...(has(null) ? [{ _id: null as string | null, name: "Umum (semua kelas)" }] : []),
    ...classes.filter((c) => !all || has(c._id)),
  ];
  const names = (day: string, classId: string | null) =>
    (d.duties.find((e) => e.day === day && e.classId === classId)?.teacherIds ?? []).map((id) => d.teacherMap.get(id)?.name ?? "?");

  return (
    <Sheet title={all ? "Jadwal Guru Piket" : `Jadwal Guru Piket Kelas ${classes[0]?.name ?? ""}`} d={d} opts={opts}>
      {!rows.length ? (
        <p className="py-6 text-center text-sm text-slate-400">Belum ada guru piket untuk pilihan ini.</p>
      ) : (
        <table className="print-table w-full border-collapse">
          <thead>
            <tr>
              <th className={`${th} w-40`}>Kelas</th>
              {days.map((day) => <th key={day.day} className={th}>{day.day}</th>)}
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r._id ?? "umum"}>
                <td className={`${td} font-semibold ${r._id ? "" : "bg-amber-50"}`}>{r.name}</td>
                {days.map((day) => (
                  <td key={day.day} className={`${td} ${r._id ? "" : "bg-amber-50"}`}>
                    <ol className="list-decimal pl-4">
                      {names(day.day, r._id).map((n, i) => <li key={i}>{n}</li>)}
                    </ol>
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </Sheet>
  );
}
