import { json, route } from "@/lib/api";
import { Schedule } from "@/lib/models";

export const GET = route(async (_req, { schoolId }) => json(await Schedule.find({ schoolId }).lean()));
