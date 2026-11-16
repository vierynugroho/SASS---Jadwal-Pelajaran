import { HttpError } from "./api";
import { LIMITS, intError, startTimeError } from "./limits";
import { School } from "./models";
import { normalizeDays } from "./constants";
import type { SchoolDoc } from "./models";
import type { Settings } from "./types";

export function toSettings(s: Partial<SchoolDoc>): Settings {
  return {
    schoolName: s.name ?? "",
    address: s.address ?? "",
    city: s.city ?? "",
    academicYear: s.academicYear ?? "",
    semester: s.semester ?? "",
    principalName: s.principalName ?? "",
    principalNip: s.principalNip ?? "",
    signer2Title: s.signer2Title ?? "",
    signer2Name: s.signer2Name ?? "",
    signer2Nip: s.signer2Nip ?? "",
    breakDuration: s.breakDuration ?? 15,
    days: normalizeDays(s.days),
  };
}

export async function getSettings(schoolId: string): Promise<Settings> {
  const doc = await School.findById(schoolId).lean();
  if (!doc) throw new HttpError(404, "Sekolah tidak ditemukan");
  return toSettings(doc);
}

/** Validasi angka & jam pada pengaturan. Melempar 400 dengan pesan yang jelas. */
export function validateSettings(b: Partial<Settings>) {
  const err = intError(b.breakDuration, LIMITS.breakDuration);
  if (err) throw new HttpError(400, err);
  if (!Array.isArray(b.days)) throw new HttpError(400, "Pengaturan hari tidak valid");
  for (const d of b.days) {
    if (!d?.active) continue; // hari nonaktif tidak dipakai, nilainya diabaikan
    const e = startTimeError(d.startTime) ?? intError(d.lessonDuration, LIMITS.lessonDuration);
    if (e) throw new HttpError(400, `${d.day}: ${e}`);
  }
  if (!b.days.some((d) => d?.active)) throw new HttpError(400, "Minimal satu hari harus aktif");
}

/** Field pengaturan yang boleh diubah (dari body request / file backup). Panggil validateSettings dulu. */
export function cleanSettings(b: Partial<Settings>) {
  validateSettings(b);
  const s = (v: unknown, max = 200) => (typeof v === "string" ? v.trim().slice(0, max) : "");
  return {
    address: s(b.address, 500),
    city: s(b.city),
    academicYear: s(b.academicYear),
    semester: s(b.semester),
    principalName: s(b.principalName),
    principalNip: s(b.principalNip),
    signer2Title: s(b.signer2Title),
    signer2Name: s(b.signer2Name),
    signer2Nip: s(b.signer2Nip),
    breakDuration: Number(b.breakDuration),
    days: normalizeDays(b.days),
  };
}
