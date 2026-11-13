import { NextResponse, type NextRequest } from "next/server";
import mongoose from "mongoose";
import { dbConnect } from "./db";
import { SESSION_COOKIE, verifySession } from "./auth";
import { School, User } from "./models";
import type { CurrentUser } from "./types";

export class HttpError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

export const json = (data: unknown, status = 200) => NextResponse.json(data, { status });

export function assertId(id: string) {
  if (!mongoose.isValidObjectId(id)) throw new HttpError(400, "ID tidak valid");
}

/**
 * public     : tanpa login
 * user       : semua user yang login
 * admin      : admin sekolah (data dibatasi ke sekolahnya)
 * superadmin : khusus superadmin
 */
export type Access = "public" | "user" | "admin" | "superadmin";

type Ctx<P> = { params: Promise<P> };
type HandlerCtx<P> = Ctx<P> & {
  user: CurrentUser | null;
  /** ID sekolah milik admin yang login (hanya terisi untuk access "admin"). */
  schoolId: string;
};
type Handler<P> = (req: NextRequest, ctx: HandlerCtx<P>) => Promise<Response>;

/** Baca user dari DB (bukan hanya dari token) agar perubahan role / status langsung berlaku. */
export async function loadCurrentUser(token: string | undefined): Promise<CurrentUser | null> {
  const session = await verifySession(token);
  if (!session || !mongoose.isValidObjectId(session.sub)) return null;
  const u = await User.findById(session.sub).lean();
  if (!u || !u.active) return null;
  let schoolName: string | null = null;
  if (u.role === "admin") {
    const school = u.schoolId ? await School.findById(u.schoolId, { name: 1, active: 1 }).lean() : null;
    if (!school || !school.active) return null;
    schoolName = school.name;
  }
  return {
    id: String(u._id),
    username: u.username,
    name: u.name,
    role: u.role,
    schoolId: u.schoolId ? String(u.schoolId) : null,
    schoolName,
  };
}

/** Bungkus route handler: cek akses, konek DB, dan tangani error secara seragam. */
export function route<P = Record<string, never>>(fn: Handler<P>, { access = "admin" }: { access?: Access } = {}) {
  return async (req: NextRequest, ctx: Ctx<P>) => {
    // Dibaca di luar try: akses cookie menandai route sebagai dinamis (jangan ditelan catch).
    const token = req.cookies.get(SESSION_COOKIE)?.value;
    try {
      await dbConnect();
      let user: CurrentUser | null = null;
      if (access !== "public") {
        user = await loadCurrentUser(token);
        if (!user) return json({ error: "Silakan login terlebih dahulu" }, 401);
        if (access === "admin" && (user.role !== "admin" || !user.schoolId))
          return json({ error: "Halaman ini khusus admin sekolah" }, 403);
        if (access === "superadmin" && user.role !== "superadmin")
          return json({ error: "Halaman ini khusus superadmin" }, 403);
      }
      return await fn(req, { ...ctx, user, schoolId: user?.schoolId ?? "" });
    } catch (e: unknown) {
      if (e instanceof HttpError) return json({ error: e.message }, e.status);
      if (e instanceof mongoose.Error.ValidationError || e instanceof mongoose.Error.CastError) {
        return json({ error: e.message }, 400);
      }
      if (typeof e === "object" && e && "code" in e && (e as { code: number }).code === 11000) {
        return json({ error: "Data sudah ada (duplikat)" }, 409);
      }
      if (e instanceof SyntaxError) return json({ error: "Format JSON tidak valid" }, 400);
      console.error(e);
      return json({ error: e instanceof Error ? e.message : "Terjadi kesalahan" }, 500);
    }
  };
}

export async function readBody<T = Record<string, unknown>>(req: NextRequest): Promise<T> {
  const body = await req.json();
  if (!body || typeof body !== "object") throw new HttpError(400, "Body tidak valid");
  return body as T;
}

export const str = (v: unknown, max = 200) => (typeof v === "string" ? v.trim().slice(0, max) : "");
