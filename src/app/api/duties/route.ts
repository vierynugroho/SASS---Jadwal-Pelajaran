import { json, readBody, route } from "@/lib/api";
import { getDuties, saveDuties } from "@/lib/duty";

export const GET = route(async (_req, { schoolId }) => json(await getDuties(schoolId)));

export const PUT = route(async (req, { schoolId }) => {
  const b = await readBody<{ entries?: unknown }>(req);
  return json(await saveDuties(schoolId, b.entries));
});
