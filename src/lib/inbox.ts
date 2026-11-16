import mongoose from "mongoose";
import { HttpError, assertId } from "./api";
import { School, Ticket } from "./models";
import type { TicketDoc } from "./models";
import type { CurrentUser, TicketDetail, TicketSummary } from "./types";

export const MAX_SUBJECT = 150;
export const MAX_BODY = 5000;
const MAX_MESSAGES = 300;
const MAX_OPEN_PER_SCHOOL = 30;

type Lean = TicketDoc & { _id: unknown; createdAt?: Date };

const isSuper = (u: CurrentUser) => u.role === "superadmin";

/** Filter tiket yang boleh dilihat user: superadmin semua, admin hanya sekolahnya. */
export function scope(u: CurrentUser) {
  if (isSuper(u)) return {};
  if (!u.schoolId) throw new HttpError(403, "Akun belum terhubung ke sekolah");
  return { schoolId: u.schoolId };
}

const unreadFor = (u: CurrentUser, t: Pick<TicketDoc, "readByAdmin" | "readBySuper">) => (isSuper(u) ? !t.readBySuper : !t.readByAdmin);

export function cleanText(v: unknown, max: number, label: string) {
  const s = typeof v === "string" ? v.trim() : "";
  if (!s) throw new HttpError(400, `${label} wajib diisi`);
  if (s.length > max) throw new HttpError(400, `${label} maksimal ${max} karakter`);
  return s;
}

async function schoolNames(ids: unknown[]) {
  const rows = await School.find({ _id: { $in: ids } }, { name: 1 }).lean();
  return new Map(rows.map((r) => [String(r._id), r.name]));
}

export async function listTickets(u: CurrentUser): Promise<TicketSummary[]> {
  const rows = (await Ticket.find(scope(u)).sort({ lastMessageAt: -1 }).limit(500).lean()) as Lean[];
  const names = isSuper(u) ? await schoolNames([...new Set(rows.map((r) => String(r.schoolId)))]) : null;
  return rows.map((t) => {
    const last = t.messages[t.messages.length - 1];
    return {
      _id: String(t._id),
      schoolId: String(t.schoolId),
      schoolName: names?.get(String(t.schoolId)) ?? undefined,
      subject: t.subject,
      status: t.status,
      lastMessageAt: t.lastMessageAt.toISOString(),
      createdAt: (t.createdAt ?? t.lastMessageAt).toISOString(),
      messageCount: t.messages.length,
      preview: last ? `${last.authorRole === "superadmin" ? "Superadmin" : last.authorName}: ${last.body.slice(0, 120)}` : "",
      unread: unreadFor(u, t),
    };
  });
}

export async function unreadCount(u: CurrentUser) {
  return Ticket.countDocuments({ ...scope(u), [isSuper(u) ? "readBySuper" : "readByAdmin"]: false });
}

async function findOwned(u: CurrentUser, id: string) {
  assertId(id);
  const t = await Ticket.findOne({ _id: id, ...scope(u) });
  if (!t) throw new HttpError(404, "Percakapan tidak ditemukan");
  return t;
}

/** Ambil detail percakapan dan tandai sudah dibaca oleh sisi user ini. */
export async function getTicket(u: CurrentUser, id: string): Promise<TicketDetail> {
  const t = await findOwned(u, id);
  if (unreadFor(u, t)) {
    if (isSuper(u)) t.readBySuper = true;
    else t.readByAdmin = true;
    await t.save();
  }
  const names = isSuper(u) ? await schoolNames([t.schoolId]) : null;
  const o = t.toObject() as Lean;
  return {
    _id: String(o._id),
    schoolId: String(o.schoolId),
    schoolName: names?.get(String(o.schoolId)),
    subject: o.subject,
    status: o.status,
    lastMessageAt: o.lastMessageAt.toISOString(),
    createdAt: (o.createdAt ?? o.lastMessageAt).toISOString(),
    unread: false,
    messages: o.messages.map((m) => ({
      authorId: String(m.authorId),
      authorName: m.authorName,
      authorRole: m.authorRole,
      body: m.body,
      createdAt: new Date(m.createdAt).toISOString(),
    })),
  };
}

const message = (u: CurrentUser, body: string) => ({ authorId: new mongoose.Types.ObjectId(u.id), authorName: u.name, authorRole: u.role, body, createdAt: new Date() });

export async function createTicket(u: CurrentUser, b: Record<string, unknown>) {
  if (isSuper(u) || !u.schoolId) throw new HttpError(403, "Hanya admin sekolah yang bisa membuat pesan baru");
  const subject = cleanText(b.subject, MAX_SUBJECT, "Subjek");
  const body = cleanText(b.body, MAX_BODY, "Pesan");
  if ((await Ticket.countDocuments({ schoolId: u.schoolId, status: "open" })) >= MAX_OPEN_PER_SCHOOL)
    throw new HttpError(429, "Terlalu banyak percakapan terbuka. Tandai selesai percakapan lama terlebih dahulu.");
  const t = await Ticket.create({
    schoolId: u.schoolId,
    createdBy: u.id,
    subject,
    messages: [message(u, body)],
    readByAdmin: true,
    readBySuper: false,
    lastMessageAt: new Date(),
  });
  return getTicket(u, String(t._id));
}

export async function replyTicket(u: CurrentUser, id: string, b: Record<string, unknown>) {
  const t = await findOwned(u, id);
  const body = cleanText(b.body, MAX_BODY, "Pesan");
  if (t.messages.length >= MAX_MESSAGES) throw new HttpError(400, "Percakapan sudah terlalu panjang. Buat percakapan baru.");
  t.messages.push(message(u, body));
  t.lastMessageAt = new Date();
  // Pesan baru membuka kembali percakapan yang sudah selesai.
  t.status = "open";
  if (isSuper(u)) {
    t.readBySuper = true;
    t.readByAdmin = false;
  } else {
    t.readByAdmin = true;
    t.readBySuper = false;
  }
  await t.save();
  return getTicket(u, id);
}

export async function setTicketStatus(u: CurrentUser, id: string, status: unknown) {
  if (status !== "open" && status !== "closed") throw new HttpError(400, "Status tidak valid");
  const t = await findOwned(u, id);
  t.status = status;
  await t.save();
  return getTicket(u, id);
}
