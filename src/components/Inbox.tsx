"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { api, toast, useApi } from "@/lib/client";
import { SUPPORT_EMAIL } from "@/lib/constants";
import type { CurrentUser, TicketDetail, TicketStatus, TicketSummary } from "@/lib/types";
import { Button, Card, Field, Input, Loading, Modal, PageHeader } from "./ui";
import { Icon } from "./icons";

const MAX_SUBJECT = 150;
const MAX_BODY = 5000;
const textareaCls =
  "w-full rounded-md border border-slate-300 bg-white px-2.5 py-1.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100";

const fmtTime = (iso: string) =>
  new Date(iso).toLocaleString("id-ID", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });

/** Beri tahu Shell agar badge pesan belum dibaca diperbarui. */
const notifyBadge = () => window.dispatchEvent(new Event("inbox-updated"));

const mailto = (subject: string, body: string, from?: string) =>
  `mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent(`[Jadwal Mengajar${from ? ` - ${from}` : ""}] ${subject}`)}&body=${encodeURIComponent(body)}`;

export function Inbox({ mode }: { mode: "admin" | "superadmin" }) {
  const { data: me } = useApi<CurrentUser>("/api/auth/me");
  const list = useApi<TicketSummary[]>("/api/inbox");
  const [activeId, setActiveId] = useState<string | null>(null);
  const [filter, setFilter] = useState<"all" | TicketStatus>("open");
  const [composeOpen, setComposeOpen] = useState(false);
  const isAdmin = mode === "admin";

  // Muat ulang daftar berkala agar pesan baru dari pihak lain terlihat.
  const { reload } = list;
  useEffect(() => {
    const t = setInterval(reload, 30_000);
    return () => clearInterval(t);
  }, [reload]);

  if (!list.data) return <Loading error={list.error} />;
  const rows = list.data.filter((t) => filter === "all" || t.status === filter);
  const unread = list.data.filter((t) => t.unread).length;

  return (
    <div>
      <PageHeader
        title={isAdmin ? "Contact Center" : "Inbox"}
        description={isAdmin ? "Hubungi superadmin untuk bantuan, laporan kendala, atau permintaan fitur." : "Pesan dari admin sekolah."}
        actions={
          isAdmin && (
            <Button onClick={() => setComposeOpen(true)}>
              <Icon name="plus" />
              Pesan baru
            </Button>
          )
        }
      />

      {isAdmin && (
        <Card className="mb-4 flex flex-wrap items-center gap-x-6 gap-y-2 p-4 text-sm">
          <div className="flex items-center gap-2 text-slate-600">
            <Icon name="inbox" className="text-blue-600" />
            <span>Inbox aplikasi, dibalas langsung di halaman ini.</span>
          </div>
          <div className="flex items-center gap-2 text-slate-600">
            <Icon name="mail" className="text-blue-600" />
            <span>
              Email superadmin:{" "}
              <a className="font-medium text-blue-600 hover:underline" href={`mailto:${SUPPORT_EMAIL}`}>
                {SUPPORT_EMAIL}
              </a>
            </span>
          </div>
        </Card>
      )}

      <div className="grid gap-4 lg:grid-cols-[22rem_1fr]">
        {/* Daftar percakapan. Di layar kecil disembunyikan saat sebuah percakapan dibuka. */}
        <Card className={`flex flex-col overflow-hidden ${activeId ? "hidden lg:flex" : ""}`}>
          <div className="flex gap-1 border-b border-slate-200 p-2 text-xs">
            {(
              [
                ["open", "Terbuka"],
                ["closed", "Selesai"],
                ["all", "Semua"],
              ] as const
            ).map(([k, label]) => (
              <button
                key={k}
                onClick={() => setFilter(k)}
                className={`rounded-full px-3 py-1 font-medium ${filter === k ? "bg-blue-600 text-white" : "text-slate-600 hover:bg-slate-100"}`}
              >
                {label}
                {k === "open" && ` (${list.data!.filter((t) => t.status === "open").length})`}
              </button>
            ))}
            {unread > 0 && <span className="ml-auto self-center rounded-full bg-red-600 px-2 py-0.5 font-semibold text-white">{unread} baru</span>}
          </div>
          <div className="max-h-[65vh] flex-1 divide-y divide-slate-100 overflow-y-auto">
            {rows.length === 0 && (
              <p className="px-4 py-10 text-center text-sm text-slate-400">
                {isAdmin ? "Belum ada pesan. Klik “Pesan baru” untuk menghubungi superadmin." : "Tidak ada pesan."}
              </p>
            )}
            {rows.map((t) => (
              <button
                key={t._id}
                onClick={() => setActiveId(t._id)}
                className={`block w-full px-4 py-3 text-left hover:bg-slate-50 ${activeId === t._id ? "bg-blue-50" : ""}`}
              >
                <div className="flex items-center gap-2">
                  {t.unread && <span className="h-2 w-2 shrink-0 rounded-full bg-red-600" aria-label="Belum dibaca" />}
                  <span className={`min-w-0 flex-1 truncate text-sm ${t.unread ? "font-semibold text-slate-900" : "font-medium text-slate-700"}`}>{t.subject}</span>
                  <StatusBadge status={t.status} />
                </div>
                {t.schoolName && <div className="mt-0.5 truncate text-xs font-medium text-blue-700">{t.schoolName}</div>}
                <div className="mt-0.5 truncate text-xs text-slate-500">{t.preview}</div>
                <div className="mt-1 text-[11px] text-slate-400">
                  {fmtTime(t.lastMessageAt)} · {t.messageCount} pesan
                </div>
              </button>
            ))}
          </div>
        </Card>

        <div className={activeId ? "" : "hidden lg:block"}>
          {activeId ? (
            <Thread key={activeId} id={activeId} me={me ?? null} onBack={() => setActiveId(null)} onChanged={reload} />
          ) : (
            <Card className="flex h-full min-h-60 flex-col items-center justify-center gap-2 p-8 text-center text-sm text-slate-400">
              <Icon name="inbox" size={32} />
              Pilih percakapan untuk membaca.
            </Card>
          )}
        </div>
      </div>

      {isAdmin && (
        <Compose
          open={composeOpen}
          onClose={() => setComposeOpen(false)}
          from={me?.schoolName ?? undefined}
          onCreated={(t) => {
            setComposeOpen(false);
            setFilter("open");
            reload();
            setActiveId(t._id);
          }}
        />
      )}
    </div>
  );
}

function StatusBadge({ status }: { status: TicketStatus }) {
  return (
    <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase ${status === "open" ? "bg-green-100 text-green-700" : "bg-slate-100 text-slate-500"}`}>
      {status === "open" ? "Terbuka" : "Selesai"}
    </span>
  );
}

function Thread({ id, me, onBack, onChanged }: { id: string; me: CurrentUser | null; onBack: () => void; onChanged: () => void }) {
  const { data, error, setData, reload } = useApi<TicketDetail>(`/api/inbox/${id}`);
  const [body, setBody] = useState("");
  const [busy, setBusy] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  // Membuka percakapan menandainya terbaca: segarkan daftar & badge.
  useEffect(() => {
    if (!data) return;
    onChanged();
    notifyBadge();
  }, [data?._id]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => endRef.current?.scrollIntoView({ block: "end" }), [data?.messages.length]);

  useEffect(() => {
    const t = setInterval(reload, 30_000);
    return () => clearInterval(t);
  }, [reload]);

  if (!data) return <Loading error={error} />;

  async function send(e: FormEvent) {
    e.preventDefault();
    if (!body.trim()) return;
    setBusy(true);
    try {
      setData(await api<TicketDetail>(`/api/inbox/${id}`, { method: "POST", body: { body } }));
      setBody("");
      onChanged();
      toast("Pesan terkirim");
    } catch (err) {
      toast((err as Error).message, "error");
    } finally {
      setBusy(false);
    }
  }

  async function setStatus(status: TicketStatus) {
    try {
      setData(await api<TicketDetail>(`/api/inbox/${id}`, { method: "PATCH", body: { status } }));
      onChanged();
      toast(status === "closed" ? "Percakapan ditandai selesai" : "Percakapan dibuka kembali");
    } catch (err) {
      toast((err as Error).message, "error");
    }
  }

  return (
    <Card className="flex max-h-[80vh] flex-col overflow-hidden">
      <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 bg-blue-600 px-4 py-3 text-white">
        <button onClick={onBack} className="rounded p-1 hover:bg-white/15 lg:hidden" aria-label="Kembali">
          <Icon name="back" />
        </button>
        <div className="min-w-0 flex-1">
          <div className="truncate font-semibold">{data.subject}</div>
          <div className="text-xs text-blue-100">
            {data.schoolName ? `${data.schoolName} · ` : ""}Dibuat {fmtTime(data.createdAt)}
          </div>
        </div>
        {data.status === "open" ? (
          <Button size="sm" variant="secondary" onClick={() => setStatus("closed")}>
            <Icon name="check" size={12} />
            Tandai selesai
          </Button>
        ) : (
          <Button size="sm" variant="secondary" onClick={() => setStatus("open")}>
            Buka kembali
          </Button>
        )}
      </div>

      <div className="flex-1 space-y-3 overflow-y-auto bg-slate-50 p-4">
        {data.messages.map((m, i) => {
          const mine = m.authorId === me?.id;
          return (
            <div key={i} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
              <div className={`max-w-[85%] rounded-lg px-3 py-2 text-sm shadow-sm ${mine ? "bg-blue-600 text-white" : "border border-slate-200 bg-white text-slate-800"}`}>
                <div className={`mb-0.5 text-[11px] font-semibold ${mine ? "text-blue-100" : "text-slate-500"}`}>
                  {mine ? "Anda" : m.authorRole === "superadmin" ? `${m.authorName} (Superadmin)` : m.authorName}
                </div>
                <div className="whitespace-pre-wrap break-words">{m.body}</div>
                <div className={`mt-1 text-right text-[10px] ${mine ? "text-blue-100" : "text-slate-400"}`}>{fmtTime(m.createdAt)}</div>
              </div>
            </div>
          );
        })}
        <div ref={endRef} />
      </div>

      <form onSubmit={send} className="border-t border-slate-200 p-3">
        {data.status === "closed" && <p className="mb-2 text-xs text-slate-500">Percakapan ini sudah selesai. Mengirim balasan akan membukanya kembali.</p>}
        <textarea
          className={textareaCls}
          rows={3}
          maxLength={MAX_BODY}
          placeholder="Tulis balasan…"
          value={body}
          onChange={(e) => setBody(e.target.value)}
          onKeyDown={(e) => {
            // Ctrl/Cmd + Enter untuk kirim.
            if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) send(e);
          }}
        />
        <div className="mt-2 flex items-center justify-between gap-2">
          <span className="text-[11px] text-slate-400">Ctrl/⌘ + Enter untuk kirim</span>
          <Button type="submit" disabled={busy || !body.trim()}>
            <Icon name="send" />
            {busy ? "Mengirim…" : "Kirim"}
          </Button>
        </div>
      </form>
    </Card>
  );
}

function Compose({ open, onClose, onCreated, from }: { open: boolean; onClose: () => void; onCreated: (t: TicketDetail) => void; from?: string }) {
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      const t = await api<TicketDetail>("/api/inbox", { method: "POST", body: { subject, body } });
      toast("Pesan terkirim ke superadmin");
      notifyBadge();
      setSubject("");
      setBody("");
      onCreated(t);
    } catch (err) {
      toast((err as Error).message, "error");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal open={open} title="Pesan baru ke superadmin" onClose={onClose}>
      <form onSubmit={submit} className="space-y-4">
        <Field label="Subjek *">
          <Input required maxLength={MAX_SUBJECT} value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="mis. Tidak bisa menyimpan jadwal kelas VII-A" />
        </Field>
        <Field label="Pesan *" help={`${body.length}/${MAX_BODY} karakter`}>
          <textarea required className={textareaCls} rows={6} maxLength={MAX_BODY} value={body} onChange={(e) => setBody(e.target.value)} placeholder="Jelaskan kendala atau kebutuhan Anda…" />
        </Field>
        <p className="flex items-start gap-1.5 rounded-md bg-slate-50 p-2.5 text-xs text-slate-500">
          <Icon name="mail" size={14} className="mt-px shrink-0" />
          <span>
            Pesan dikirim ke inbox superadmin di aplikasi. Bila mendesak, kirim juga ke email{" "}
            <a className="font-medium text-blue-600 hover:underline" href={`mailto:${SUPPORT_EMAIL}`}>
              {SUPPORT_EMAIL}
            </a>
            .
          </span>
        </p>
        <div className="flex flex-wrap justify-end gap-2">
          <a
            href={mailto(subject || "(tanpa subjek)", body, from)}
            className={`inline-flex items-center gap-1.5 rounded-md border border-slate-300 bg-white px-3.5 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 ${!subject.trim() || !body.trim() ? "pointer-events-none opacity-50" : ""}`}
          >
            <Icon name="mail" />
            Kirim juga via email
          </a>
          <Button type="submit" disabled={busy}>
            <Icon name="send" />
            {busy ? "Mengirim…" : "Kirim pesan"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
