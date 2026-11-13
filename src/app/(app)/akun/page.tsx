"use client";

import { useState, type FormEvent } from "react";
import { api, toast, useApi } from "@/lib/client";
import type { CurrentUser } from "@/lib/types";
import { Button, Card, Field, Input, PageHeader } from "@/components/ui";

export default function AkunPage() {
  const { data: user } = useApi<CurrentUser>("/api/auth/me");
  const [oldPassword, setOld] = useState("");
  const [newPassword, setNew] = useState("");
  const [confirmPw, setConfirm] = useState("");

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (newPassword !== confirmPw) return toast("Konfirmasi password tidak sama", "error");
    try {
      await api("/api/auth/password", { method: "PUT", body: { oldPassword, newPassword } });
      toast("Password berhasil diganti");
      setOld("");
      setNew("");
      setConfirm("");
    } catch (err) {
      toast((err as Error).message, "error");
    }
  }

  return (
    <div className="max-w-xl">
      <PageHeader title="Akun Saya" />
      <Card className="mb-6 p-5 text-sm">
        <dl className="grid grid-cols-3 gap-y-2">
          <dt className="text-slate-500">Nama</dt>
          <dd className="col-span-2 font-medium">{user?.name}</dd>
          <dt className="text-slate-500">Username</dt>
          <dd className="col-span-2">@{user?.username}</dd>
          <dt className="text-slate-500">Role</dt>
          <dd className="col-span-2">{user?.role === "superadmin" ? "Superadmin" : "Admin sekolah"}</dd>
          {user?.schoolName && (
            <>
              <dt className="text-slate-500">Sekolah</dt>
              <dd className="col-span-2">{user.schoolName}</dd>
            </>
          )}
        </dl>
      </Card>
      <Card className="p-5">
        <h2 className="mb-4 font-semibold">Ganti password</h2>
        <form onSubmit={submit} className="space-y-4">
          <Field label="Password lama"><Input type="password" required value={oldPassword} onChange={(e) => setOld(e.target.value)} autoComplete="current-password" /></Field>
          <Field label="Password baru"><Input type="password" required minLength={6} value={newPassword} onChange={(e) => setNew(e.target.value)} autoComplete="new-password" /></Field>
          <Field label="Ulangi password baru"><Input type="password" required value={confirmPw} onChange={(e) => setConfirm(e.target.value)} autoComplete="new-password" /></Field>
          <div className="flex justify-end"><Button type="submit">Ganti password</Button></div>
        </form>
      </Card>
    </div>
  );
}
