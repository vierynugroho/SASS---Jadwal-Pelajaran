import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { HttpError } from "@/lib/api";
import { ClassRoom, Duty, School, Schedule, Subject, Teacher } from "@/lib/models";
import { getDuties, sanitizeDuties } from "@/lib/duty";
import { cleanSettings, getSettings } from "@/lib/settings";
import { sanitizeDays } from "@/lib/sanitize";
import { LIMITS, intError } from "@/lib/limits";
import type { Settings } from "@/lib/types";

const APP = "jadwal-mengajar";
const VERSION = 3;

/** Export data satu sekolah sebagai file JSON (response download). */
export async function exportSchool(schoolId: string) {
  const q = { schoolId };
  const strip = { schoolId: 0 };
  const [settings, teachers, subjects, classes, schedules, duties] = await Promise.all([
    getSettings(schoolId),
    Teacher.find(q, strip).lean(),
    Subject.find(q, strip).lean(),
    ClassRoom.find(q, strip).lean(),
    Schedule.find(q, strip).lean(),
    getDuties(schoolId),
  ]);
  const payload = { app: APP, version: VERSION, exportedAt: new Date().toISOString(), settings, data: { teachers, subjects, classes, schedules, duties } };
  const stamp = new Date().toISOString().slice(0, 16).replace(/[-:T]/g, "");
  const slug = settings.schoolName.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 40) || "sekolah";
  return new NextResponse(JSON.stringify(payload, null, 2), {
    headers: {
      "Content-Type": "application/json",
      "Content-Disposition": `attachment; filename="backup-${slug}-${stamp}.json"`,
    },
  });
}

type Raw = Record<string, unknown> & { _id?: string | null };

/**
 * Import: GANTI seluruh data sekolah ini dengan isi file backup.
 * Semua ID dibuat ulang, sehingga backup bisa dipulihkan ke sekolah lain tanpa bentrok.
 */
export async function importSchool(schoolId: string, body: { app?: string; settings?: Partial<Settings>; data?: Record<string, unknown> }) {
  if (body.app !== APP || !body.data) throw new HttpError(400, "File bukan backup Jadwal Mengajar yang valid");
  const arr = (k: string): Raw[] => {
    const v = body.data![k];
    if (!Array.isArray(v)) throw new HttpError(400, `Bagian "${k}" tidak ada / tidak valid di file backup`);
    return v;
  };
  const teachersRaw = arr("teachers"), subjectsRaw = arr("subjects"), classesRaw = arr("classes"), schedulesRaw = arr("schedules");

  // Peta ID lama -> ID baru.
  const idMap = new Map<string, string>();
  const remap = (old: unknown) => {
    const k = String(old ?? "");
    if (!k) return null;
    if (!idMap.has(k)) idMap.set(k, new mongoose.Types.ObjectId().toString());
    return idMap.get(k)!;
  };
  const ref = (old: unknown) => (old && idMap.has(String(old)) ? idMap.get(String(old))! : null);

  const subjects: Raw[] = subjectsRaw.map((s) => {
    const err = intError(s.duration, LIMITS.subjectDuration, { optional: true });
    if (err) throw new HttpError(400, `Mapel "${String(s.name)}": ${err}`);
    return { ...s, _id: remap(s._id), schoolId };
  });
  const teachers: Raw[] = teachersRaw.map((t) => ({ ...t, _id: remap(t._id), schoolId }));
  const classes: Raw[] = classesRaw.map((c) => ({ ...c, _id: remap(c._id), schoolId }));
  for (const t of teachers) t.subjectIds = ((t.subjectIds as unknown[]) ?? []).map(ref).filter(Boolean);
  for (const c of classes) c.homeroomTeacherId = ref(c.homeroomTeacherId);
  const schedules = schedulesRaw
    .filter((s) => ref(s.classId))
    .map((s) => {
      const days = sanitizeDays(
        ((s.days as { day: string; items: Raw[] }[]) ?? []).map((d) => ({
          day: d.day,
          items: (d.items ?? []).map((it) => ({ ...it, subjectId: ref(it.subjectId), teacherId: ref(it.teacherId) })),
        })),
      );
      return { classId: ref(s.classId), schoolId, days };
    });

  // Piket opsional: backup versi lama belum punya bagian ini.
  const dutiesRaw = Array.isArray(body.data.duties) ? (body.data.duties as Raw[]) : [];
  const duties = sanitizeDuties(
    dutiesRaw
      .filter((e) => !e.classId || ref(e.classId))
      .map((e) => ({ day: e.day, classId: ref(e.classId), teacherIds: ((e.teacherIds as unknown[]) ?? []).map(ref).filter(Boolean) })),
  );

  const sets = [
    [Subject, subjects],
    [Teacher, teachers],
    [ClassRoom, classes],
    [Schedule, schedules],
  ] as const;
  for (const [M, docs] of sets) for (const doc of docs) await new (M as typeof Teacher)(doc).validate();
  // Validasi pengaturan juga SEBELUM menghapus data lama.
  const settingsUpdate = body.settings ? cleanSettings(body.settings) : null;

  for (const [M] of sets) await (M as typeof Teacher).deleteMany({ schoolId });
  for (const [M, docs] of sets) if (docs.length) await (M as typeof Teacher).insertMany(docs);
  await Duty.deleteMany({ schoolId });
  if (duties.length) await Duty.create({ schoolId, entries: duties });
  // Nama sekolah tidak ditimpa; pengaturan lain ikut dipulihkan.
  if (settingsUpdate) await School.updateOne({ _id: schoolId }, settingsUpdate);

  return { ok: true, counts: { teachers: teachers.length, subjects: subjects.length, classes: classes.length, schedules: schedules.length, duties: duties.length } };
}
