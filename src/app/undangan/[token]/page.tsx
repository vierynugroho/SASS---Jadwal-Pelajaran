import { Suspense } from "react";
import { InviteAccept } from "./InviteAccept";

export default function UndanganPage() {
  return (
    <Suspense fallback={<div className="flex min-h-screen items-center justify-center text-sm text-slate-400">Memuat…</div>}>
      <InviteAccept />
    </Suspense>
  );
}
