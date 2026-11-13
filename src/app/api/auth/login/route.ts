import bcrypt from "bcryptjs";
import { NextResponse } from "next/server";
import { HttpError, readBody, route } from "@/lib/api";
import { School, User } from "@/lib/models";
import { sessionCookie, signSession } from "@/lib/auth";

export const POST = route(
  async (req) => {
    const { username, password } = await readBody<{ username?: string; password?: string }>(req);
    const user = await User.findOne({ username: String(username ?? "").trim().toLowerCase() }).lean();
    const ok = user && (await bcrypt.compare(String(password ?? ""), user.passwordHash));
    if (!user || !ok) throw new HttpError(401, "Username atau password salah");
    if (!user.active) throw new HttpError(403, "Akun Anda dinonaktifkan. Hubungi superadmin.");
    if (user.role === "admin") {
      const school = user.schoolId ? await School.findById(user.schoolId, { active: 1 }).lean() : null;
      if (!school) throw new HttpError(403, "Akun Anda belum terhubung ke sekolah. Hubungi superadmin.");
      if (!school.active) throw new HttpError(403, "Sekolah Anda sedang dinonaktifkan. Hubungi superadmin.");
    }
    const token = await signSession({ sub: String(user._id), username: user.username, name: user.name, role: user.role });
    const res = NextResponse.json({ ok: true, name: user.name, role: user.role });
    res.cookies.set(sessionCookie(token));
    return res;
  },
  { access: "public" },
);
