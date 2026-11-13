"use client";

import { useParams } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";
import { api } from "@/lib/client";
import { Button, Field, Input } from "@/components/ui";

type Info = { role: "admin" | "superadmin"; schoolName: string | null; note: string };

export function InviteAccept() {
  const { token } = useParams<{ token: string }>();
  const [info, setInfo] = useState<Info | null>(null);
  const [invalid, setInvalid] = useState<string | null>(null);
  const [form, setForm] = useState({ name: "", username: "", password: "", confirm: "" });
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    api<Info>(`/api/invites/${token}`)
      .then((d) => (setInfo(d), setForm((f) => ({ ...f, name: f.name || d.note }))))
      .catch((e: Error) => setInvalid(e.message));
  }, [token]);

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (form.password !== form.confirm) return setError("Konfirmasi password tidak sama");
    setBusy(true);
    setError(null);
    try {
      await api(`/api/invites/${token}`, { method: "POST", body: form });
      window.location.href = "/";
    } catch (err) {
      setError((err as Error).message);
      setBusy(false);
    }
  }

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) => setForm({ ...form, [k]: e.target.value });

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-100 p-4">
      <div className="w-full max-w-sm rounded-xl border border-slate-200 bg-white p-7 shadow-sm">
        <div className="mb-6 text-center">
          <div className="text-xs font-medium uppercase tracking-wide text-blue-600">Jadwal Mengajar</div>
          <h1 className="mt-1 text-lg font-semibold text-slate-900">Undangan</h1>
          {info && (
            <p className="mt-1 text-sm text-slate-500">
              Anda diundang sebagai <b>{info.role === "superadmin" ? "Superadmin" : "Admin"}</b>
              {info.schoolName && <> untuk <b>{info.schoolName}</b></>}. Buat akun Anda di bawah ini.
            </p>
          )}
        </div>
        {invalid ? (
          <div className="space-y-4 text-center">
            <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{invalid}</p>
            <a href="/login" className="text-sm font-medium text-blue-600 hover:underline">Ke halaman login</a>
          </div>
        ) : !info ? (
          <p className="text-center text-sm text-slate-400">Memeriksa undangan…</p>
        ) : (
          <form onSubmit={submit} className="space-y-4">
            <Field label="Nama lengkap"><Input required value={form.name} onChange={set("name")} autoFocus /></Field>
            <Field label="Username" help="Huruf kecil, angka, titik, - atau _ (min. 3 karakter)">
              <Input required minLength={3} value={form.username} onChange={set("username")} autoComplete="username" />
            </Field>
            <Field label="Password"><Input type="password" required minLength={6} value={form.password} onChange={set("password")} autoComplete="new-password" /></Field>
            <Field label="Ulangi password"><Input type="password" required value={form.confirm} onChange={set("confirm")} autoComplete="new-password" /></Field>
            {error && <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
            <Button type="submit" className="w-full" disabled={busy}>{busy ? "Memproses…" : "Buat akun & masuk"}</Button>
          </form>
        )}
      </div>
    </div>
  );
}
