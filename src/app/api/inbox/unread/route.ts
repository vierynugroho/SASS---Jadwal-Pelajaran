import { json, route } from "@/lib/api";
import { unreadCount } from "@/lib/inbox";

export const GET = route(async (_req, { user }) => json({ count: await unreadCount(user!) }), { access: "user" });
