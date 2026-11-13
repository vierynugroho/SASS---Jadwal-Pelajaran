import { assertId, json, route } from "@/lib/api";
import { Invite } from "@/lib/models";

/** Batalkan undangan yang belum dipakai. */
export const DELETE = route<{ id: string }>(
  async (_req, { params }) => {
    const { id } = await params;
    assertId(id);
    await Invite.deleteOne({ _id: id, usedAt: null });
    return json({ ok: true });
  },
  { access: "superadmin" },
);
