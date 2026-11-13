import mongoose from "mongoose";
import { DAYS } from "./constants";
import { HttpError } from "./api";
import { LIMITS, MAX_ITEMS_PER_DAY, intError } from "./limits";
import type { ScheduleDay, ScheduleItem } from "./types";

const idOrNull = (v: unknown) => (typeof v === "string" && mongoose.isValidObjectId(v) ? v : null);

export function sanitizeDays(input: unknown): ScheduleDay[] {
  if (!Array.isArray(input)) throw new HttpError(400, "Format jadwal tidak valid");
  return input
    .filter((d) => d && DAYS.includes(d.day))
    .map((d) => ({
      day: d.day as string,
      items: (Array.isArray(d.items) ? d.items : []).map((raw: Record<string, unknown>, i: number, all: unknown[]): ScheduleItem => {
        if (all.length > MAX_ITEMS_PER_DAY) throw new HttpError(400, `${d.day}: maksimal ${MAX_ITEMS_PER_DAY} item per hari`);
        const type = raw.type === "break" || raw.type === "activity" ? raw.type : "lesson";
        const where = `${d.day}, item ke-${i + 1}`;
        const err =
          (type === "lesson" ? intError(raw.jp ?? 1, LIMITS.jp) : null) ?? intError(raw.duration, LIMITS.itemDuration, { optional: true });
        if (err) throw new HttpError(400, `${where}: ${err}`);
        const item: ScheduleItem = {
          uid: typeof raw.uid === "string" && raw.uid ? raw.uid.slice(0, 64) : crypto.randomUUID(),
          type,
          subjectId: type === "lesson" ? idOrNull(raw.subjectId) : null,
          teacherId: type === "lesson" ? idOrNull(raw.teacherId) : null,
          jp: type === "lesson" ? Number(raw.jp ?? 1) : 1,
          duration: raw.duration === null || raw.duration === undefined || raw.duration === "" ? null : Number(raw.duration),
          label: typeof raw.label === "string" ? raw.label.trim().slice(0, 100) : "",
        };
        if (type === "lesson" && !item.subjectId)
          throw new HttpError(400, `${where}: belum memilih mata pelajaran`);
        return item;
      }),
    }));
}
