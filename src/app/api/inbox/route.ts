import { json, readBody, route } from "@/lib/api";
import { createTicket, listTickets } from "@/lib/inbox";

export const GET = route(async (_req, { user }) => json(await listTickets(user!)), { access: "user" });

export const POST = route(async (req, { user }) => json(await createTicket(user!, await readBody(req)), 201), { access: "user" });
