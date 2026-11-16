import mongoose from "mongoose";
import { DAYS } from "./constants";
import { HttpError } from "./api";
import { ClassRoom, Duty, Teacher } from "./models";
import type { DutyEntry } from "./types";

const MAX_TEACHERS_PER_CELL = 20;

/**
 * Bersihkan daftar piket: hari valid, satu entri per (hari, kelas), guru unik.
 * Jika `owned` diberikan, ID kelas/guru yang bukan milik sekolah dibuang.
 */
export function sanitizeDuties(input: unknown, owned?: { classIds: Set<string>; teacherIds: Set<string> }): DutyEntry[] {
  if (!Array.isArray(input)) throw new HttpError(400, "Format jadwal piket tidak valid");
  const merged = new Map<string, DutyEntry>();
  for (const raw of input as Record<string, unknown>[]) {
    if (!raw || !DAYS.includes(raw.day as (typeof DAYS)[number])) continue;
    const classId = typeof raw.classId === "string" && mongoose.isValidObjectId(raw.classId) ? raw.classId : null;
    if (classId && owned && !owned.classIds.has(classId)) continue;
    const ids = (Array.isArray(raw.teacherIds) ? raw.teacherIds : [])
      .filter((x): x is string => typeof x === "string" && mongoose.isValidObjectId(x))
      .filter((x) => !owned || owned.teacherIds.has(x));
    const key = `${raw.day}|${classId ?? ""}`;
    const entry = merged.get(key) ?? { day: raw.day as string, classId, teacherIds: [] };
    entry.teacherIds = [...new Set([...entry.teacherIds, ...ids])];
    if (entry.teacherIds.length > MAX_TEACHERS_PER_CELL)
      throw new HttpError(400, `${entry.day}: maksimal ${MAX_TEACHERS_PER_CELL} guru piket per kelas`);
    merged.set(key, entry);
  }
  return [...merged.values()].filter((e) => e.teacherIds.length);
}

export async function getDuties(schoolId: string): Promise<DutyEntry[]> {
  const doc = await Duty.findOne({ schoolId }).lean();
  return (doc?.entries ?? []).map((e) => ({
    day: e.day,
    classId: e.classId ? String(e.classId) : null,
    teacherIds: e.teacherIds.map(String),
  }));
}

export async function saveDuties(schoolId: string, input: unknown) {
  const [classes, teachers] = await Promise.all([
    ClassRoom.find({ schoolId }, { _id: 1 }).lean(),
    Teacher.find({ schoolId }, { _id: 1 }).lean(),
  ]);
  const entries = sanitizeDuties(input, {
    classIds: new Set(classes.map((c) => String(c._id))),
    teacherIds: new Set(teachers.map((t) => String(t._id))),
  });
  await Duty.updateOne({ schoolId }, { schoolId, entries }, { upsert: true });
  return entries;
}
