import { json, readBody, route } from "@/lib/api";
import { exportSchool, importSchool } from "@/lib/backup";

/** Admin: export data sekolahnya sendiri. */
export const GET = route(async (_req, { schoolId }) => exportSchool(schoolId));

/** Admin: import (ganti) data sekolahnya sendiri. */
export const POST = route(async (req, { schoolId }) => json(await importSchool(schoolId, await readBody(req))));
