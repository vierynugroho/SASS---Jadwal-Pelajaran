import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE, verifySession } from "@/lib/auth";

const isPublic = (p: string) =>
  p === "/login" || p === "/api/auth/login" || p === "/api/auth/logout" || p.startsWith("/undangan/") || p.startsWith("/api/invites/");

/** Halaman yang boleh dibuka kedua role. */
const SHARED = ["/akun"];

export async function proxy(req: NextRequest) {
  const { pathname, search } = req.nextUrl;
  const session = await verifySession(req.cookies.get(SESSION_COOKIE)?.value);

  if (isPublic(pathname)) {
    if (session && pathname === "/login") return NextResponse.redirect(new URL("/", req.url));
    return NextResponse.next();
  }
  if (!session) {
    if (pathname.startsWith("/api/")) return NextResponse.json({ error: "Silakan login terlebih dahulu" }, { status: 401 });
    const url = new URL("/login", req.url);
    if (pathname !== "/") url.searchParams.set("next", pathname + search);
    return NextResponse.redirect(url);
  }

  // Routing halaman per role (otorisasi sebenarnya tetap dicek di setiap API).
  if (!pathname.startsWith("/api/") && !SHARED.includes(pathname)) {
    const inAdminArea = pathname === "/admin" || pathname.startsWith("/admin/");
    if (session.role === "superadmin" && !inAdminArea) return NextResponse.redirect(new URL("/admin/sekolah", req.url));
    if (session.role === "admin" && inAdminArea) return NextResponse.redirect(new URL("/", req.url));
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:png|jpg|jpeg|svg|ico|webp)$).*)"],
};
