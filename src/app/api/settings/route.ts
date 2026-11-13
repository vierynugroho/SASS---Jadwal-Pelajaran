import { HttpError, json, readBody, route, str } from "@/lib/api";
import { School } from "@/lib/models";
import { cleanSettings, getSettings } from "@/lib/settings";
import type { Settings } from "@/lib/types";

export const GET = route(async (_req, { schoolId }) => json(await getSettings(schoolId)));

export const PUT = route(async (req, { schoolId }) => {
  const b = await readBody<Partial<Settings>>(req);
  const name = str(b.schoolName);
  if (!name) throw new HttpError(400, "Nama sekolah wajib diisi");
  await School.updateOne({ _id: schoolId }, { ...cleanSettings(b), name });
  return json(await getSettings(schoolId));
});
