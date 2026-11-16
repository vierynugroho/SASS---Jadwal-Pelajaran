"use client";

import { useState, type FormEvent } from "react";
import { api, toast, useApi } from "@/lib/client";
import type { Settings } from "@/lib/types";
import { LIMITS, START_TIME, intError, startTimeError } from "@/lib/limits";
import { Button, Card, Field, Input, Loading, PageHeader } from "@/components/ui";

export default function PengaturanPage() {
  const { data, error } = useApi<Settings>("/api/settings");
  if (!data) return <Loading error={error} />;
  return <SettingsForm initial={data} />;
}

function SettingsForm({ initial }: { initial: Settings }) {
  const [form, setForm] = useState<Settings>(initial);
  const [saving, setSaving] = useState(false);
  const set = (patch: Partial<Settings>) => setForm({ ...form, ...patch });
  const dayErrors = form.days.map((d) => (d.active ? startTimeError(d.startTime) ?? intError(d.lessonDuration, LIMITS.lessonDuration) : null));
  const breakError = intError(form.breakDuration, LIMITS.breakDuration);
  const noActiveDay = !form.days.some((d) => d.active);
  const hasErrors = !!breakError || noActiveDay || dayErrors.some(Boolean);
  const setDay = (i: number, patch: Partial<Settings["days"][number]>) => set({ days: form.days.map((d, j) => (j === i ? { ...d, ...patch } : d)) });

  async function save(e: FormEvent) {
    e.preventDefault();
    if (hasErrors) return toast("Periksa kembali isian yang ditandai merah", "error");
    setSaving(true);
    try {
      const s = await api<Settings>("/api/settings", { method: "PUT", body: form });
      setForm(s);
      window.dispatchEvent(new Event("settings-updated"));
      toast("Pengaturan tersimpan");
    } catch (err) {
      toast((err as Error).message, "error");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="max-w-4xl">
      <PageHeader title="Pengaturan" description="Identitas sekolah (tampil di kop cetakan) dan pola jam per hari." />
      <form onSubmit={save} className="space-y-6">
        <Card className="p-5">
          <h2 className="mb-4 font-semibold">Identitas sekolah</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Nama sekolah *" className="sm:col-span-2">
              <Input required value={form.schoolName} onChange={(e) => set({ schoolName: e.target.value })} placeholder="mis. SMP Negeri 1 Contoh" />
            </Field>
            <Field label="Alamat" className="sm:col-span-2">
              <Input value={form.address ?? ""} onChange={(e) => set({ address: e.target.value })} />
            </Field>
            <Field label="Kota (untuk tanda tangan)">
              <Input value={form.city ?? ""} onChange={(e) => set({ city: e.target.value })} />
            </Field>
            <div className="grid grid-cols-2 gap-4">
              <Field label="Tahun ajaran">
                <Input value={form.academicYear ?? ""} onChange={(e) => set({ academicYear: e.target.value })} placeholder="2026/2027" />
              </Field>
              <Field label="Semester">
                <Input value={form.semester ?? ""} onChange={(e) => set({ semester: e.target.value })} placeholder="Ganjil" />
              </Field>
            </div>
            <Field label="Nama kepala sekolah">
              <Input value={form.principalName ?? ""} onChange={(e) => set({ principalName: e.target.value })} />
            </Field>
            <Field label="NIP kepala sekolah">
              <Input value={form.principalNip ?? ""} onChange={(e) => set({ principalNip: e.target.value })} />
            </Field>
          </div>
        </Card>

        <Card className="p-5">
          <h2 className="mb-1 font-semibold">Penanda tangan tambahan</h2>
          <p className="mb-4 text-sm text-slate-500">Opsional, mis. Wakil Kepala Kurikulum. Bisa diaktifkan & diubah lagi saat mencetak.</p>
          <div className="grid gap-4 sm:grid-cols-3">
            <Field label="Jabatan">
              <Input value={form.signer2Title ?? ""} onChange={(e) => set({ signer2Title: e.target.value })} placeholder="Wakil Kepala Kurikulum" />
            </Field>
            <Field label="Nama">
              <Input value={form.signer2Name ?? ""} onChange={(e) => set({ signer2Name: e.target.value })} />
            </Field>
            <Field label="NIP">
              <Input value={form.signer2Nip ?? ""} onChange={(e) => set({ signer2Nip: e.target.value })} />
            </Field>
          </div>
        </Card>

        <Card className="p-5">
          <h2 className="mb-1 font-semibold">Hari & jam pelajaran</h2>
          <p className="mb-4 text-sm text-slate-500">Jam mulai dan durasi 1 JP bisa berbeda per hari (mis. Jumat lebih singkat). Mapel bisa punya durasi sendiri di menu Mata Pelajaran.</p>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-left text-xs uppercase text-slate-500">
                <tr>
                  <th className="py-2 pr-3">Aktif</th>
                  <th className="py-2 pr-3">Hari</th>
                  <th className="py-2 pr-3">Jam mulai</th>
                  <th className="py-2">Durasi 1 JP (menit)</th>
                </tr>
              </thead>
              <tbody>
                {form.days.map((d, i) => (
                  <tr key={d.day} className={d.active ? "" : "text-slate-400"}>
                    <td className="py-1.5 pr-3"><input type="checkbox" checked={d.active} onChange={(e) => setDay(i, { active: e.target.checked })} /></td>
                    <td className="py-1.5 pr-3 font-medium">{d.day}</td>
                    <td className="py-1.5 pr-3">
                      <Input type="time" className="w-32" min={START_TIME.min} max={START_TIME.max} value={d.startTime} disabled={!d.active} onChange={(e) => setDay(i, { startTime: e.target.value })} />
                    </td>
                    <td className="py-1.5">
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                        <Input
                          type="number"
                          step={1}
                          min={LIMITS.lessonDuration.min}
                          max={LIMITS.lessonDuration.max}
                          className={`w-24 ${dayErrors[i] ? "border-red-400" : ""}`}
                          value={Number.isNaN(d.lessonDuration) ? "" : d.lessonDuration}
                          disabled={!d.active}
                          onChange={(e) => setDay(i, { lessonDuration: e.target.value === "" ? NaN : Number(e.target.value) })}
                        />
                        {dayErrors[i] && <span className="text-xs text-red-600">{dayErrors[i]}</span>}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {noActiveDay && <p className="mt-2 text-xs text-red-600">Minimal satu hari harus aktif.</p>}
          <p className="mt-2 text-xs text-slate-400">
            Jam mulai {START_TIME.min}–{START_TIME.max}; durasi 1 JP {LIMITS.lessonDuration.min}–{LIMITS.lessonDuration.max} menit.
          </p>
          <Field label="Durasi istirahat default (menit)" className="mt-4 max-w-xs" help={breakError ? undefined : `${LIMITS.breakDuration.min}–${LIMITS.breakDuration.max} menit. Bisa diubah per item istirahat di jadwal.`}>
            <Input
              type="number"
              step={1}
              min={LIMITS.breakDuration.min}
              max={LIMITS.breakDuration.max}
              className={breakError ? "border-red-400" : undefined}
              value={Number.isNaN(form.breakDuration) ? "" : form.breakDuration}
              onChange={(e) => set({ breakDuration: e.target.value === "" ? NaN : Number(e.target.value) })}
            />
            {breakError && <span className="mt-1 block text-xs text-red-600">{breakError}</span>}
          </Field>
        </Card>

        <div className="flex justify-end">
          <Button type="submit" disabled={saving || hasErrors}>{saving ? "Menyimpan…" : "Simpan Pengaturan"}</Button>
        </div>
      </form>

    </div>
  );
}

