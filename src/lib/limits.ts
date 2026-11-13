/**
 * Batas nilai angka & waktu. Dipakai bersama oleh server (validasi API)
 * dan form di browser, supaya aturannya selalu sama.
 */
export interface IntLimit {
  min: number;
  max: number;
  label: string;
  unit?: string;
}

export const LIMITS = {
  /** Durasi 1 JP default per hari (menit). */
  lessonDuration: { min: 10, max: 120, label: "Durasi 1 JP", unit: "menit" },
  /** Durasi 1 JP khusus mapel (menit). */
  subjectDuration: { min: 10, max: 120, label: "Durasi 1 JP mapel", unit: "menit" },
  /** Durasi istirahat default (menit). */
  breakDuration: { min: 5, max: 120, label: "Durasi istirahat", unit: "menit" },
  /** Jumlah JP dalam satu item pelajaran. */
  jp: { min: 1, max: 8, label: "Jumlah JP" },
  /** Override durasi satu item jadwal (menit). */
  itemDuration: { min: 5, max: 300, label: "Durasi", unit: "menit" },
  /** Masa berlaku undangan (hari). */
  inviteDays: { min: 1, max: 30, label: "Masa berlaku undangan", unit: "hari" },
} satisfies Record<string, IntLimit>;

/** Rentang jam mulai pelajaran yang diizinkan. */
export const START_TIME = { min: "05:00", max: "15:00" };
/** Jadwal harian tidak boleh melewati jam ini. */
export const DAY_END_MAX = "21:00";
/** Jumlah item maksimum per hari per kelas. */
export const MAX_ITEMS_PER_DAY = 20;

const hhmm = (t: string) => {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
};
export const DAY_END_MAX_MIN = hhmm(DAY_END_MAX);

const fmtLimit = (l: IntLimit) => `${l.min}–${l.max}${l.unit ? ` ${l.unit}` : ""}`;

/** Kembalikan pesan error jika `v` bukan bilangan bulat dalam batas, atau null jika valid. */
export function intError(v: unknown, l: IntLimit, { optional = false } = {}): string | null {
  if (optional && (v === null || v === undefined || v === "")) return null;
  const n = typeof v === "number" ? v : typeof v === "string" && v.trim() !== "" ? Number(v) : NaN;
  if (!Number.isInteger(n) || n < l.min || n > l.max) return `${l.label} harus bilangan bulat ${fmtLimit(l)}`;
  return null;
}

/** Validasi format "HH:mm" dan rentang jam mulai. */
export function startTimeError(t: unknown): string | null {
  if (typeof t !== "string" || !/^([01]\d|2[0-3]):[0-5]\d$/.test(t)) return "Jam mulai tidak valid (format JJ:MM)";
  const m = hhmm(t);
  if (m < hhmm(START_TIME.min) || m > hhmm(START_TIME.max)) return `Jam mulai harus antara ${START_TIME.min}–${START_TIME.max}`;
  return null;
}
