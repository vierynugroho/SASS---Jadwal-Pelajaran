"use client";

import { useState, type FormEvent } from "react";
import { api, toast } from "@/lib/client";
import type { Role, School } from "@/lib/types";
import { Button, Field, Input, Modal, Select } from "./ui";
import { LIMITS, intError } from "@/lib/limits";

/** Form buat undangan. Setelah dibuat, link ditampilkan sekali untuk disalin. */
export function InviteDialog({
  open,
  onClose,
  schools,
  defaultSchoolId,
  onCreated,
}: {
  open: boolean;
  onClose: () => void;
  schools: School[];
  defaultSchoolId?: string;
  onCreated?: () => void;
}) {
  return (
    <Modal open={open} title="Undang pengguna" onClose={onClose}>
      {/* key: reset isi form setiap kali dibuka untuk sekolah berbeda */}
      {open && <InviteForm key={defaultSchoolId ?? "-"} schools={schools} defaultSchoolId={defaultSchoolId} onClose={onClose} onCreated={onCreated} />}
    </Modal>
  );
}

function InviteForm({ schools, defaultSchoolId, onClose, onCreated }: { schools: School[]; defaultSchoolId?: string; onClose: () => void; onCreated?: () => void }) {
  const [role, setRole] = useState<Role>("admin");
  const [schoolId, setSchoolId] = useState(defaultSchoolId ?? "");
  const [note, setNote] = useState("");
  const [days, setDays] = useState(7);
  const [link, setLink] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const daysError = intError(days, LIMITS.inviteDays);

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (daysError) return;
    setBusy(true);
    try {
      const res = await api<{ token: string }>("/api/admin/invites", { method: "POST", body: { role, schoolId, note, days } });
      setLink(`${window.location.origin}/undangan/${res.token}`);
      onCreated?.();
    } catch (err) {
      toast((err as Error).message, "error");
    } finally {
      setBusy(false);
    }
  }

  async function copy() {
    try {
      await navigator.clipboard.writeText(link!);
      toast("Link disalin");
    } catch {
      toast("Gagal menyalin, salin manual dari kotak di atas", "error");
    }
  }

  if (link)
    return (
      <div className="space-y-4">
        <p className="text-sm text-slate-600">
          Kirim link ini ke calon pengguna (mis. lewat WhatsApp). Link hanya bisa dipakai <b>sekali</b> dan berlaku {days} hari.
        </p>
        <Input readOnly value={link} onFocus={(e) => e.target.select()} className="font-mono text-xs" />
        <p className="text-xs text-amber-700">Link tidak bisa ditampilkan lagi setelah jendela ini ditutup. Jika hilang, buat undangan baru.</p>
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={onClose}>Tutup</Button>
          <Button onClick={copy}>Salin link</Button>
        </div>
      </div>
    );

  return (
    <form onSubmit={submit} className="space-y-4">
      <Field label="Role">
        <Select value={role} onChange={(e) => setRole(e.target.value as Role)}>
          <option value="admin">Admin sekolah — kelola data jadwal sekolah</option>
          <option value="superadmin">Superadmin — kelola sekolah & pengguna</option>
        </Select>
      </Field>
      {role === "admin" && (
        <Field label="Sekolah *">
          <Select required value={schoolId} onChange={(e) => setSchoolId(e.target.value)}>
            <option value="">— Pilih sekolah —</option>
            {schools.filter((s) => s.active).map((s) => (
              <option key={s._id} value={s._id}>{s.schoolName}</option>
            ))}
          </Select>
        </Field>
      )}
      <Field label="Catatan" help="Opsional, mis. nama orang yang diundang. Hanya untuk pengingat Anda.">
        <Input value={note} onChange={(e) => setNote(e.target.value)} />
      </Field>
      <Field label="Berlaku (hari)" help={daysError ? undefined : `${LIMITS.inviteDays.min}–${LIMITS.inviteDays.max} hari`}>
        <Input
          type="number"
          step={1}
          min={LIMITS.inviteDays.min}
          max={LIMITS.inviteDays.max}
          value={Number.isNaN(days) ? "" : days}
          onChange={(e) => setDays(e.target.value === "" ? NaN : Number(e.target.value))}
          className={`w-24 ${daysError ? "border-red-400" : ""}`}
        />
        {daysError && <span className="mt-1 block text-xs text-red-600">{daysError}</span>}
      </Field>
      <div className="flex justify-end gap-2">
        <Button type="button" variant="secondary" onClick={onClose}>Batal</Button>
        <Button type="submit" disabled={busy || !!daysError}>{busy ? "Membuat…" : "Buat link undangan"}</Button>
      </div>
    </form>
  );
}
