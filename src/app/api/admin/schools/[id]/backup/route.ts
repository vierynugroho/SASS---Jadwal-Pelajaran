import { HttpError, assertId, json, readBody, route } from "@/lib/api";
import { exportSchool, importSchool } from "@/lib/backup";
import { School } from "@/lib/models";

async function schoolIdFrom(params: Promise<{ id: string }>) {
  const { id } = await params;
  assertId(id);
  if (!(await School.exists({ _id: id }))) throw new HttpError(404, "Sekolah tidak ditemukan");
  return id;
}

/** Superadmin: export data sekolah tertentu. */
export const GET = route<{ id: string }>(async (_req, { params }) => exportSchool(await schoolIdFrom(params)), { access: "superadmin" });

/** Superadmin: import (ganti) data sekolah tertentu. */
export const POST = route<{ id: string }>(
  async (req, { params }) => json(await importSchool(await schoolIdFrom(params), await readBody(req))),
  { access: "superadmin" },
);
