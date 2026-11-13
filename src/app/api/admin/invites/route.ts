import mongoose from "mongoose";
import { HttpError, json, readBody, route, str } from "@/lib/api";
import { Invite, School } from "@/lib/models";
import { hashToken, newInviteToken } from "@/lib/auth";
import { LIMITS, intError } from "@/lib/limits";

export const GET = route(
  async () => {
    const rows = await Invite.find({}, { tokenHash: 0 }).sort({ createdAt: -1 }).limit(200).lean();
    const now = Date.now();
    return json(rows.map((r) => ({ ...r, expired: !r.usedAt && r.expiresAt.getTime() < now })));
  },
  { access: "superadmin" },
);

/** Buat undangan. Token hanya dikembalikan sekali (yang disimpan hanya hash-nya). */
export const POST = route(
  async (req, { user }) => {
    const b = await readBody(req);
    const role = b.role === "superadmin" ? "superadmin" : "admin";
    let schoolId: string | null = null;
    if (role === "admin") {
      schoolId = typeof b.schoolId === "string" && mongoose.isValidObjectId(b.schoolId) ? b.schoolId : null;
      if (!schoolId || !(await School.exists({ _id: schoolId }))) throw new HttpError(400, "Pilih sekolah untuk admin yang diundang");
    }
    const daysErr = intError(b.days ?? 7, LIMITS.inviteDays);
    if (daysErr) throw new HttpError(400, daysErr);
    const days = Number(b.days ?? 7);
    const token = newInviteToken();
    const doc = await Invite.create({
      tokenHash: hashToken(token),
      role,
      schoolId,
      note: str(b.note),
      expiresAt: new Date(Date.now() + days * 86400_000),
      createdBy: user!.id,
    });
    const { tokenHash: _omit, ...rest } = doc.toObject();
    void _omit;
    return json({ ...rest, token }, 201);
  },
  { access: "superadmin" },
);
