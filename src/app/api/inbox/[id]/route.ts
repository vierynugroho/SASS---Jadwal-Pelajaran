import { json, readBody, route } from "@/lib/api";
import { getTicket, replyTicket, setTicketStatus } from "@/lib/inbox";

type P = { id: string };

export const GET = route<P>(async (_req, { params, user }) => json(await getTicket(user!, (await params).id)), { access: "user" });

/** Balas pesan. */
export const POST = route<P>(async (req, { params, user }) => json(await replyTicket(user!, (await params).id, await readBody(req))), { access: "user" });

/** Ubah status: { status: "open" | "closed" }. */
export const PATCH = route<P>(
  async (req, { params, user }) => json(await setTicketStatus(user!, (await params).id, (await readBody<{ status?: unknown }>(req)).status)),
  { access: "user" },
);
