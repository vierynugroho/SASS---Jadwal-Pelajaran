import { json, route } from "@/lib/api";
import { User } from "@/lib/models";

export const GET = route(
  async () => json(await User.find({}, { passwordHash: 0 }).sort({ role: -1, name: 1 }).collation({ locale: "id" }).lean()),
  { access: "superadmin" },
);
