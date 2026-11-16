"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { api, toast, uid } from "@/lib/client";
import { useAllData } from "@/lib/useAllData";
import { computeDay, conflictKey, findConflicts, fmt, fmtRange, itemsOf, toMin, validateDay } from "@/lib/schedule";
import { LIMITS, MAX_ITEMS_PER_DAY } from "@/lib/limits";
import type { DayConfig, Schedule, ScheduleItem, Subject, Teacher } from "@/lib/types";
import { Button, Card, Combo, Empty, Input, Loading, PageHeader, Select, type ComboOption } from "@/components/ui";
import { Icon } from "@/components/icons";

type Draft = Record<string, ScheduleItem[]>;

export default function JadwalPage() {
  const d = useAllData();
  const [classId, setClassId] = useState<string>("");
  /** null = tidak ada perubahan (pakai jadwal tersimpan). */
  const [edited, setEdited] = useState<Draft | null>(null);
  const [saving, setSaving] = useState(false);

  const activeDays = useMemo(() => d.settings?.days.filter((x) => x.active) ?? [], [d.settings]);
  const currentClassId = classId || d.classes[0]?._id || "";

  const saved = d.schedules.find((s) => s.classId === currentClassId);
  const base = useMemo(() => {
    const next: Draft = {};
    for (const day of d.settings?.days ?? []) next[day.day] = itemsOf(saved, day.day);
    return next;
  }, [d.settings, saved]);
  const draft = edited ?? base;
  const dirty = edited !== null;

  // Peringatan saat menutup halaman dengan perubahan belum disimpan.
  useEffect(() => {
    if (!dirty) return;
    const h = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", h);
    return () => window.removeEventListener("beforeunload", h);
  }, [dirty]);

  const conflicts = useMemo(() => {
    if (!d.ready || !currentClassId) return new Map<string, string[]>();
    const current: Schedule = { classId: currentClassId, days: Object.entries(draft).map(([day, items]) => ({ day, items })) };
    const others = d.schedules.filter((s) => s.classId !== currentClassId);
    return findConflicts([...others, current], d.classes, d.settings, d.subjectMap);
  }, [d.ready, d.schedules, d.classes, d.settings, d.subjectMap, draft, currentClassId]);

  if (!d.ready) return <Loading error={d.error} />;

  if (!d.classes.length || !d.subjects.length)
    return (
      <>
        <PageHeader title="Susun Jadwal" />
        <Empty>
          Tambahkan data{" "}
          {!d.classes.length && <Link href="/kelas" className="font-medium text-blue-600">kelas</Link>}
          {!d.classes.length && !d.subjects.length && " dan "}
          {!d.subjects.length && <Link href="/mapel" className="font-medium text-blue-600">mata pelajaran</Link>} terlebih dahulu.
        </Empty>
      </>
    );

  const update = (day: string, items: ScheduleItem[]) => {
    setEdited({ ...draft, [day]: items });
  };

  function switchClass(id: string) {
    if (dirty && !confirm("Perubahan belum disimpan. Pindah kelas dan buang perubahan?")) return;
    setEdited(null);
    setClassId(id);
  }

  async function save() {
    setSaving(true);
    try {
      const days = Object.entries(draft).map(([day, items]) => ({ day, items }));
      const doc = await api<Schedule>(`/api/schedules/${currentClassId}`, { method: "PUT", body: { days } });
      d.setSchedules((list) => [...(list ?? []).filter((s) => s.classId !== currentClassId), doc]);
      setEdited(null);
      toast("Jadwal tersimpan");
    } catch (e) {
      toast((e as Error).message, "error");
    } finally {
      setSaving(false);
    }
  }

  function copyFromClass(fromId: string) {
    const src = d.schedules.find((s) => s.classId === fromId);
    if (!src) return toast("Kelas tersebut belum punya jadwal tersimpan", "error");
    if (!confirm("Salin seluruh jadwal kelas tersebut ke kelas ini? Jadwal kelas ini akan diganti.")) return;
    const next: Draft = {};
    for (const day of d.settings.days) next[day.day] = itemsOf(src, day.day).map((i) => ({ ...i, uid: uid() }));
    setEdited(next);
  }

  const totalConflicts = [...conflicts.keys()].filter((k) => k.startsWith(currentClassId + "|")).length;
  const validation = Object.fromEntries(activeDays.map((day) => [day.day, validateDay(draft[day.day] ?? [], day, d.settings, d.subjectMap)]));
  const totalErrors = Object.values(validation).reduce((a, v) => a + v.count, 0);

  return (
    <div className="pb-28 sm:pb-20">
      <PageHeader
        title="Susun Jadwal"
        description="Jam mulai & selesai dihitung otomatis dari urutan dan durasi tiap item."
        actions={
          <>
            <Select className="w-full sm:w-auto" value="" onChange={(e) => e.target.value && copyFromClass(e.target.value)}>
              <option value="">Salin dari kelas…</option>
              {d.classes.filter((c) => c._id !== currentClassId).map((c) => (
                <option key={c._id} value={c._id}>
                  {c.name}
                </option>
              ))}
            </Select>
          </>
        }
      />

      <div className="mb-4 flex flex-wrap gap-1.5">
        {d.classes.map((c) => (
          <button
            key={c._id}
            onClick={() => c._id !== currentClassId && switchClass(c._id)}
            className={`rounded-full border px-3 py-1 text-sm ${c._id === currentClassId ? "border-blue-600 bg-blue-600 text-white" : "border-slate-300 bg-white text-slate-700 hover:border-blue-400"}`}
          >
            {c.name}
          </button>
        ))}
      </div>

      {!activeDays.length ? (
        <Empty>
          Belum ada hari aktif. Atur di <Link href="/pengaturan" className="font-medium text-blue-600">Pengaturan</Link>.
        </Empty>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 2xl:grid-cols-3">
          {activeDays.map((day) => (
            <DayColumn
              key={day.day}
              day={day}
              items={draft[day.day] ?? []}
              onChange={(items) => update(day.day, items)}
              otherDays={activeDays.filter((x) => x.day !== day.day).map((x) => x.day)}
              onCopyFrom={(from) => update(day.day, (draft[from] ?? []).map((i) => ({ ...i, uid: uid() })))}
              conflicts={(u) => conflicts.get(conflictKey(currentClassId, day.day, u))}
              validation={validation[day.day]}
              data={d}
              classId={currentClassId}
            />
          ))}
        </div>
      )}

      <div className="fixed inset-x-0 bottom-0 z-10 border-t border-slate-200 bg-white/95 px-4 py-3 backdrop-blur md:left-60 print:hidden">
        <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2">
          <div className="min-w-0 text-sm">
            <span className="font-medium">{d.classMap.get(currentClassId)?.name}</span>
            {dirty ? <span className="ml-2 text-amber-600">• Belum disimpan</span> : <span className="ml-2 text-slate-400">• Tersimpan</span>}
            {totalConflicts > 0 && <span className="ml-2 text-red-600">• {totalConflicts} bentrok</span>}
            {totalErrors > 0 && <span className="ml-2 font-medium text-red-600">• {totalErrors} isian tidak valid</span>}
          </div>
          <div className="ml-auto flex gap-2">
            <Button variant="secondary" disabled={!dirty || saving} onClick={() => setEdited(null)}>
              Batalkan
            </Button>
            <Button disabled={!dirty || saving || totalErrors > 0} onClick={save} title={totalErrors ? "Perbaiki isian yang ditandai merah" : undefined}>
              <Icon name="save" />{saving ? "Menyimpan…" : "Simpan Jadwal"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

const TYPE_LABEL = { lesson: "Pelajaran", break: "Istirahat", activity: "Kegiatan" } as const;

function DayColumn({
  day,
  items,
  onChange,
  otherDays,
  onCopyFrom,
  conflicts,
  validation,
  data,
  classId,
}: {
  day: DayConfig;
  items: ScheduleItem[];
  onChange: (items: ScheduleItem[]) => void;
  otherDays: string[];
  onCopyFrom: (day: string) => void;
  conflicts: (uid: string) => string[] | undefined;
  validation: ReturnType<typeof validateDay>;
  data: ReturnType<typeof useAllData>;
  classId: string;
}) {
  const timed = computeDay(items, day, data.settings, data.subjectMap);
  // Pelajaran kelas lain di hari ini, untuk mendeteksi guru yang sudah mengajar di jam yang sama.
  const otherLessons = useMemo(
    () =>
      data.schedules
        .filter((s) => s.classId !== classId)
        .flatMap((s) =>
          computeDay(itemsOf(s, day.day), day, data.settings, data.subjectMap)
            .filter((it) => it.type === "lesson" && it.teacherId)
            .map((it) => ({ ...it, classId: s.classId })),
        ),
    [data.schedules, data.settings, data.subjectMap, classId, day],
  );
  /** Alasan bentrok guru pada rentang waktu [start, end), atau null jika bebas. */
  const busyReason = (teacherId: string, start: number, end: number) => {
    const hit = otherLessons.filter((o) => o.teacherId === teacherId && o.start < end && start < o.end);
    if (!hit.length) return null;
    return "Bentrok: " + hit.map((o) => `${data.classMap.get(o.classId)?.name ?? "?"} ${fmtRange(o.start, o.end)} (${data.subjectMap.get(o.subjectId ?? "")?.name ?? "?"})`).join("; ");
  };
  const end = timed.length ? timed[timed.length - 1].end : null;
  const totalJp = items.filter((i) => i.type === "lesson").reduce((a, i) => a + (Number(i.jp) || 1), 0);

  const set = (i: number, patch: Partial<ScheduleItem>) => onChange(items.map((it, j) => (j === i ? { ...it, ...patch } : it)));
  const move = (i: number, dir: -1 | 1) => {
    const j = i + dir;
    if (j < 0 || j >= items.length) return;
    const next = [...items];
    [next[i], next[j]] = [next[j], next[i]];
    onChange(next);
  };
  const add = (type: ScheduleItem["type"]) =>
    onChange([
      ...items,
      type === "lesson"
        ? { uid: uid(), type, subjectId: null, teacherId: null, jp: 1, duration: null, label: "" }
        : { uid: uid(), type, label: type === "break" ? "Istirahat" : "Upacara", duration: null, jp: 1 },
    ]);

  return (
    <Card className="flex flex-col overflow-hidden">
      <div className="bg-blue-600 px-4 py-3 text-white">
        <div className="flex items-center gap-2">
          <span className="text-base font-semibold">{day.day}</span>
          {end !== null && <span className="rounded-full bg-white/20 px-2 py-0.5 text-[11px] font-semibold">{totalJp} JP</span>}
          {otherDays.length > 0 && (
            <div className="ml-auto w-32 shrink-0">
              <Select
                className="border-transparent py-1 text-xs text-slate-700"
                value=""
                onChange={(e) => {
                  if (e.target.value && (!items.length || confirm(`Ganti jadwal ${day.day} dengan salinan dari ${e.target.value}?`))) onCopyFrom(e.target.value);
                }}
              >
                <option value="">Salin dari…</option>
                {otherDays.map((x) => (
                  <option key={x}>{x}</option>
                ))}
              </Select>
            </div>
          )}
        </div>
        <div className="mt-0.5 text-xs text-blue-100">
          Mulai {fmt(toMin(day.startTime))} · {day.lessonDuration} mnt/JP
          {end !== null && <> · selesai {fmt(end)}</>}
        </div>
      </div>

      {validation.dayErrors.map((m) => (
        <p key={m} className="border-b border-red-200 bg-red-50 px-4 py-1.5 text-xs font-medium text-red-700"><Icon name="alert" size={12} className="mr-1 inline -mt-0.5" />{m}</p>
      ))}
      <div className="flex-1 divide-y divide-slate-100">
        {timed.length === 0 && <p className="px-4 py-6 text-center text-sm text-slate-400">Belum ada jadwal.</p>}
        {timed.map((it, i) => {
          const errs = conflicts(it.uid);
          const invalid = validation.itemErrors.get(it.uid);
          return (
            <div key={it.uid} className={`px-3 py-2.5 ${it.type !== "lesson" ? "bg-amber-50/60" : ""} ${errs || invalid ? "bg-red-50" : ""}`}>
              <div className="mb-1.5 flex items-center justify-between text-xs">
                <span className="font-mono font-semibold text-blue-700">
                  {fmtRange(it.start, it.end)}
                  <span className="ml-2 font-sans font-normal text-slate-400">
                    {it.type === "lesson" ? `JP ${it.jpFrom === it.jpTo ? it.jpFrom : `${it.jpFrom}–${it.jpTo}`}` : TYPE_LABEL[it.type]} · {it.minutes} mnt
                  </span>
                </span>
                <span className="flex">
                  <IconBtn onClick={() => move(i, -1)} disabled={i === 0} title="Naik"><Icon name="up" size={14} /></IconBtn>
                  <IconBtn onClick={() => move(i, 1)} disabled={i === items.length - 1} title="Turun"><Icon name="down" size={14} /></IconBtn>
                  <IconBtn onClick={() => onChange([...items.slice(0, i + 1), { ...items[i], uid: uid() }, ...items.slice(i + 1)])} disabled={items.length >= MAX_ITEMS_PER_DAY} title="Duplikat"><Icon name="copy" size={13} /></IconBtn>
                  <IconBtn onClick={() => onChange(items.filter((_, j) => j !== i))} title="Hapus" className="text-red-500"><Icon name="x" size={14} /></IconBtn>
                </span>
              </div>

              {it.type === "lesson" ? (
                <LessonFields item={it} onChange={(p) => set(i, p)} subjects={data.subjects} teachers={data.teachers} busy={(t) => busyReason(t, it.start, it.end)} />
              ) : (
                <div className="flex gap-2">
                  <Input className="py-1" value={it.label ?? ""} placeholder={TYPE_LABEL[it.type]} onChange={(e) => set(i, { label: e.target.value })} />
                  <DurationInput value={it.duration} placeholder={String(it.type === "break" ? data.settings.breakDuration : day.lessonDuration)} onChange={(v) => set(i, { duration: v })} />
                </div>
              )}
              {[...(invalid ?? []), ...(errs ?? [])].map((m) => (
                <p key={m} className="mt-1 flex items-start gap-1 text-xs font-medium text-red-600"><Icon name="alert" size={12} className="mt-0.5 shrink-0" />{m}</p>
              ))}
            </div>
          );
        })}
      </div>

      <div className="flex gap-1.5 border-t border-slate-200 p-2.5">
        <Button size="sm" disabled={items.length >= MAX_ITEMS_PER_DAY} onClick={() => add("lesson")}><Icon name="plus" size={12} />Pelajaran</Button>
        <Button size="sm" variant="secondary" disabled={items.length >= MAX_ITEMS_PER_DAY} onClick={() => add("break")}><Icon name="plus" size={12} />Istirahat</Button>
        <Button size="sm" variant="secondary" disabled={items.length >= MAX_ITEMS_PER_DAY} onClick={() => add("activity")}><Icon name="plus" size={12} />Kegiatan</Button>
      </div>
    </Card>
  );
}

function LessonFields({
  item,
  onChange,
  subjects,
  teachers,
  busy,
}: {
  item: ScheduleItem;
  onChange: (p: Partial<ScheduleItem>) => void;
  subjects: Subject[];
  teachers: Teacher[];
  busy: (teacherId: string) => string | null;
}) {
  const qualified = item.subjectId ? teachers.filter((t) => t.subjectIds.includes(item.subjectId!)) : [];
  const others = teachers.filter((t) => !qualified.includes(t));

  function pickSubject(subjectId: string | null) {
    const q = subjectId ? teachers.filter((t) => t.subjectIds.includes(subjectId) && !busy(t._id)) : [];
    const keepTeacher = item.teacherId && teachers.find((t) => t._id === item.teacherId)?.subjectIds.includes(subjectId ?? "");
    onChange({ subjectId, teacherId: keepTeacher ? item.teacherId : q.length === 1 ? q[0]._id : item.teacherId });
  }

  const subjectOpts: ComboOption[] = subjects.map((s) => ({ value: s._id, label: s.name, color: s.color, note: s.code || undefined }));
  const teacherOpt = (t: Teacher, group: string): ComboOption => {
    const reason = busy(t._id);
    // Guru yang sedang terpilih tetap bisa dipilih ulang; bentroknya ditampilkan sebagai peringatan.
    return { value: t._id, label: t.name, group, note: reason ?? undefined, disabled: !!reason && t._id !== item.teacherId };
  };
  const teacherOpts = [
    ...qualified.map((t) => teacherOpt(t, "Pengampu mapel ini")),
    ...others.map((t) => teacherOpt(t, qualified.length ? "Guru lain" : "Semua guru")),
  ];

  return (
    <div className="space-y-1.5">
      <div className="flex gap-2">
        <Combo value={item.subjectId} options={subjectOpts} onChange={pickSubject} placeholder="— Pilih mapel —" invalid={!item.subjectId} className="py-1" />
        <label className="flex shrink-0 items-center gap-1 text-xs text-slate-500" title="Jumlah jam pelajaran">
          <Input
            type="number"
            step={1}
            min={LIMITS.jp.min}
            max={LIMITS.jp.max}
            className="w-14 py-1"
            value={item.jp == null || Number.isNaN(item.jp) ? "" : item.jp}
            onChange={(e) => onChange({ jp: e.target.value === "" ? NaN : Number(e.target.value) })}
          />
          JP
        </label>
      </div>
      <div className="flex gap-2">
        <Combo value={item.teacherId} options={teacherOpts} onChange={(v) => onChange({ teacherId: v })} placeholder="— Pilih guru —" emptyLabel="— Tanpa guru —" className="py-1" />
        <DurationInput value={item.duration} placeholder="auto" onChange={(v) => onChange({ duration: v })} title="Override durasi total (menit). Kosongkan untuk otomatis." />
      </div>
    </div>
  );
}

function DurationInput({ value, onChange, placeholder, title }: { value?: number | null; onChange: (v: number | null) => void; placeholder?: string; title?: string }) {
  return (
    <label className="flex shrink-0 items-center gap-1 text-xs text-slate-500" title={title ?? "Durasi (menit). Kosongkan untuk default."}>
      <Input
        type="number"
        step={1}
        min={LIMITS.itemDuration.min}
        max={LIMITS.itemDuration.max}
        className="w-16 py-1"
        value={value ?? ""}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value === "" ? null : Number(e.target.value))}
      />
      mnt
    </label>
  );
}

function IconBtn({ className, ...p }: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return <button {...p} className={`inline-flex h-6 w-6 items-center justify-center rounded text-slate-500 hover:bg-slate-200 disabled:opacity-30 ${className ?? ""}`} />;
}

