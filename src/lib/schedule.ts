import type { ClassRoom, DayConfig, Schedule, ScheduleItem, Settings, Subject } from "./types";
import { DAY_END_MAX, DAY_END_MAX_MIN, LIMITS, MAX_ITEMS_PER_DAY, intError } from "./limits";

export const toMin = (t: string) => {
  const [h, m] = t.split(":").map(Number);
  return (h || 0) * 60 + (m || 0);
};

/** Format menit ke "07.00" (gaya penulisan jam Indonesia). */
export const fmt = (m: number) =>
  `${String(Math.floor(m / 60) % 24).padStart(2, "0")}.${String(m % 60).padStart(2, "0")}`;

export const fmtRange = (a: number, b: number) => `${fmt(a)}–${fmt(b)}`;

/** Format jam selesai untuk pesan error; tandai jika melewati tengah malam. */
export const fmtEnd = (m: number) => (m >= 24 * 60 ? `${fmt(m)} hari berikutnya` : fmt(m));

export interface TimedItem extends ScheduleItem {
  start: number;
  end: number;
  minutes: number;
  /** Nomor jam pelajaran (JP) awal & akhir untuk item pelajaran. */
  jpFrom?: number;
  jpTo?: number;
}

export function itemDuration(
  item: ScheduleItem,
  day: DayConfig,
  settings: Pick<Settings, "breakDuration">,
  subjects: Map<string, Subject>,
) {
  if (item.duration && item.duration > 0) return item.duration;
  if (item.type === "break") return settings.breakDuration || 15;
  if (item.type === "activity") return day.lessonDuration;
  const s = item.subjectId ? subjects.get(item.subjectId) : undefined;
  return (item.jp || 1) * (s?.duration || day.lessonDuration);
}

export function computeDay(
  items: ScheduleItem[],
  day: DayConfig,
  settings: Pick<Settings, "breakDuration">,
  subjects: Map<string, Subject>,
): TimedItem[] {
  let t = toMin(day.startTime);
  let jp = 0;
  return items.map((it) => {
    const minutes = itemDuration(it, day, settings, subjects);
    const r: TimedItem = { ...it, start: t, end: t + minutes, minutes };
    if (it.type === "lesson") {
      r.jpFrom = jp + 1;
      jp += it.jp || 1;
      r.jpTo = jp;
    }
    t += minutes;
    return r;
  });
}

export const byId = <T extends { _id: string }>(rows: T[]) => new Map(rows.map((r) => [r._id, r]));

export function itemsOf(schedule: Schedule | undefined, day: string) {
  return schedule?.days.find((d) => d.day === day)?.items ?? [];
}

export const conflictKey = (classId: string, day: string, uid: string) => `${classId}|${day}|${uid}`;

/** Cari bentrok guru: guru yang sama mengajar di waktu yang beririsan pada hari yang sama. */
export function findConflicts(
  schedules: Schedule[],
  classes: ClassRoom[],
  settings: Settings,
  subjects: Map<string, Subject>,
) {
  const className = new Map(classes.map((c) => [c._id, c.name]));
  const result = new Map<string, string[]>();
  for (const day of settings.days.filter((d) => d.active)) {
    const byTeacher = new Map<string, { classId: string; uid: string; start: number; end: number }[]>();
    for (const sch of schedules) {
      for (const it of computeDay(itemsOf(sch, day.day), day, settings, subjects)) {
        if (it.type !== "lesson" || !it.teacherId) continue;
        const list = byTeacher.get(it.teacherId) ?? [];
        list.push({ classId: sch.classId, uid: it.uid, start: it.start, end: it.end });
        byTeacher.set(it.teacherId, list);
      }
    }
    for (const list of byTeacher.values()) {
      for (let i = 0; i < list.length; i++) {
        for (let j = i + 1; j < list.length; j++) {
          const a = list[i], b = list[j];
          if (a.start < b.end && b.start < a.end) {
            const push = (x: typeof a, y: typeof a) => {
              const k = conflictKey(x.classId, day.day, x.uid);
              const where = x.classId === y.classId ? "kelas yang sama" : `kelas ${className.get(y.classId) ?? "?"}`;
              result.set(k, [...(result.get(k) ?? []), `Guru bentrok dengan ${where} (${fmtRange(y.start, y.end)})`]);
            };
            push(a, b);
            push(b, a);
          }
        }
      }
    }
  }
  return result;
}

/** Rekap beban mengajar per guru (JP & menit per minggu). */
export function teacherLoad(schedules: Schedule[], settings: Settings, subjects: Map<string, Subject>) {
  const load = new Map<string, { jp: number; minutes: number; classes: Set<string> }>();
  for (const day of settings.days.filter((d) => d.active)) {
    for (const sch of schedules) {
      for (const it of computeDay(itemsOf(sch, day.day), day, settings, subjects)) {
        if (it.type !== "lesson" || !it.teacherId) continue;
        const l = load.get(it.teacherId) ?? { jp: 0, minutes: 0, classes: new Set<string>() };
        l.jp += it.jp || 1;
        l.minutes += it.minutes;
        l.classes.add(sch.classId);
        load.set(it.teacherId, l);
      }
    }
  }
  return load;
}

/** Validasi satu hari di editor: error per item (berdasarkan uid) dan error tingkat hari. */
export function validateDay(
  items: ScheduleItem[],
  day: DayConfig,
  settings: Pick<Settings, "breakDuration">,
  subjects: Map<string, Subject>,
) {
  const itemErrors = new Map<string, string[]>();
  const dayErrors: string[] = [];
  for (const it of items) {
    const errs = [
      it.type === "lesson" && !it.subjectId ? "Pilih mata pelajaran" : null,
      it.type === "lesson" ? intError(it.jp ?? 1, LIMITS.jp) : null,
      intError(it.duration, LIMITS.itemDuration, { optional: true }),
    ].filter((e): e is string => !!e);
    if (errs.length) itemErrors.set(it.uid, errs);
  }
  if (items.length > MAX_ITEMS_PER_DAY) dayErrors.push(`Maksimal ${MAX_ITEMS_PER_DAY} item per hari`);
  const timed = computeDay(items, day, settings, subjects);
  const end = timed.length ? timed[timed.length - 1].end : 0;
  if (end > DAY_END_MAX_MIN) dayErrors.push(`Jadwal selesai pukul ${fmtEnd(end)}, melewati batas ${DAY_END_MAX}`);
  return { itemErrors, dayErrors, count: dayErrors.length + [...itemErrors.values()].reduce((a, e) => a + e.length, 0) };
}
