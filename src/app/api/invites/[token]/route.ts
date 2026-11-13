import bcrypt from "bcryptjs";
import { NextResponse } from "next/server";
import { HttpError, json, readBody, route, str } from "@/lib/api";
import { Invite, School, User } from "@/lib/models";
import { hashToken, sessionCookie, signSession } from "@/lib/auth";

async function findValidInvite(token: string) {
  const invite = await Invite.findOne({ tokenHash: hashToken(token) }).lean();
  if (!invite) throw new HttpError(404, "Link undangan tidak valid");
  if (invite.usedAt) throw new HttpError(410, "Link undangan sudah dipakai");
  if (invite.expiresAt.getTime() < Date.now()) throw new HttpError(410, "Link undangan sudah kedaluwarsa");
  let schoolName: string | null = null;
  if (invite.role === "admin") {
    const school = invite.schoolId ? await School.findById(invite.schoolId, { name: 1, active: 1 }).lean() : null;
    if (!school || !school.active) throw new HttpError(410, "Sekolah untuk undangan ini tidak tersedia");
    schoolName = school.name;
  }
  return { invite, schoolName };
}

/** Info undangan untuk halaman pendaftaran (publik). */
export const GET = route<{ token: string }>(
  async (_req, { params }) => {
    const { invite, schoolName } = await findValidInvite((await params).token);
    return json({ role: invite.role, schoolName, note: invite.note, expiresAt: invite.expiresAt });
  },
  { access: "public" },
);

/** Terima undangan: buat akun lalu langsung login. */
export const POST = route<{ token: string }>(
  async (req, { params }) => {
    const { invite } = await findValidInvite((await params).token);
    const b = await readBody(req);
    const username = str(b.username, 50).toLowerCase();
    const name = str(b.name);
    const password = typeof b.password === "string" ? b.password : "";
    if (!/^[a-z0-9._-]{3,50}$/.test(username)) throw new HttpError(400, "Username 3–50 karakter: huruf kecil, angka, titik, - atau _");
    if (!name) throw new HttpError(400, "Nama wajib diisi");
    if (password.length < 6) throw new HttpError(400, "Password minimal 6 karakter");
    if (await User.exists({ username })) throw new HttpError(409, "Username sudah dipakai");

    // Tandai terpakai secara atomik agar satu link tidak bisa dipakai dua kali.
    const claimed = await Invite.findOneAndUpdate({ _id: invite._id, usedAt: null }, { usedAt: new Date() });
    if (!claimed) throw new HttpError(410, "Link undangan sudah dipakai");
    let user;
    try {
      user = await User.create({ username, name, passwordHash: await bcrypt.hash(password, 10), role: invite.role, schoolId: invite.schoolId, active: true });
    } catch (e) {
      await Invite.updateOne({ _id: invite._id }, { usedAt: null });
      throw e;
    }
    await Invite.updateOne({ _id: invite._id }, { usedBy: user._id });

    const token = await signSession({ sub: String(user._id), username, name, role: user.role });
    const res = NextResponse.json({ ok: true, role: user.role });
    res.cookies.set(sessionCookie(token));
    return res;
  },
  { access: "public" },
);
