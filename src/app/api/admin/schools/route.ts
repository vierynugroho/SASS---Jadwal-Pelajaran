import { HttpError, json, readBody, route, str } from "@/lib/api";
import { ClassRoom, School, User } from "@/lib/models";
import { normalizeDays } from "@/lib/constants";
import { toSettings } from "@/lib/settings";

/** Daftar sekolah + jumlah user & kelas. */
export const GET = route(
  async () => {
    const [schools, users, classes] = await Promise.all([
      School.find().sort({ name: 1 }).collation({ locale: "id" }).lean(),
      User.aggregate<{ _id: unknown; n: number }>([{ $match: { schoolId: { $ne: null } } }, { $group: { _id: "$schoolId", n: { $sum: 1 } } }]),
      ClassRoom.aggregate<{ _id: unknown; n: number }>([{ $group: { _id: "$schoolId", n: { $sum: 1 } } }]),
    ]);
    const count = (rows: { _id: unknown; n: number }[]) => new Map(rows.map((r) => [String(r._id), r.n]));
    const u = count(users), c = count(classes);
    return json(
      schools.map((s) => ({
        _id: String(s._id),
        ...toSettings(s),
        active: s.active,
        userCount: u.get(String(s._id)) ?? 0,
        classCount: c.get(String(s._id)) ?? 0,
      })),
    );
  },
  { access: "superadmin" },
);

export const POST = route(
  async (req) => {
    const b = await readBody(req);
    const name = str(b.schoolName);
    if (!name) throw new HttpError(400, "Nama sekolah wajib diisi");
    const doc = await School.create({ name, address: str(b.address, 500), city: str(b.city), days: normalizeDays(null), active: true });
    return json({ _id: String(doc._id), ...toSettings(doc.toObject()), active: true }, 201);
  },
  { access: "superadmin" },
);
