import type { DayConfig } from "./types";
import { LIMITS, intError, startTimeError } from "./limits";

export const DAYS = ["Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu", "Minggu"] as const;

export function defaultDays(): DayConfig[] {
  return DAYS.map((day, i) => ({
    day,
    active: i < 5,
    startTime: "07:00",
    lessonDuration: 40,
  }));
}

/** Pastikan 7 hari lengkap & berurutan, menggabungkan nilai tersimpan. */
export function normalizeDays(days: Partial<DayConfig>[] | undefined | null): DayConfig[] {
  const base = defaultDays();
  return base.map((d) => {
    const found = days?.find((x) => x?.day === d.day);
    return found
      ? {
          day: d.day,
          active: Boolean(found.active),
          startTime: startTimeError(found.startTime) ? d.startTime : found.startTime!,
          lessonDuration: intError(found.lessonDuration, LIMITS.lessonDuration) ? d.lessonDuration : Number(found.lessonDuration),
        }
      : d;
  });
}

/** Email superadmin untuk kontak di luar aplikasi. Bisa diganti lewat env NEXT_PUBLIC_SUPPORT_EMAIL. */
export const SUPPORT_EMAIL = process.env.NEXT_PUBLIC_SUPPORT_EMAIL || "viery15102002@gmail.com";
