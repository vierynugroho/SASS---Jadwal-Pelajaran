import { HttpError, assertId, json, readBody, route, str } from "@/lib/api";
import { ClassRoom, Invite, School, Schedule, Subject, Teacher, User } from "@/lib/models";
import { toSettings } from "@/lib/settings";

export const PUT = route<{ id: string }>(
  async (req, { params }) => {
    const { id } = await params;
    assertId(id);
    const b = await readBody(req);
    const name = str(b.schoolName);
    if (!name) throw new HttpError(400, "Nama sekolah wajib diisi");
    const doc = await School.findByIdAndUpdate(
      id,
      { name, address: str(b.address, 500), city: str(b.city), active: b.active !== false },
      { new: true },
    ).lean();
    if (!doc) throw new HttpError(404, "Sekolah tidak ditemukan");
    return json({ _id: id, ...toSettings(doc), active: doc.active });
  },
  { access: "superadmin" },
);

/** Hapus sekolah beserta seluruh datanya. Ditolak jika masih ada user terdaftar. */
export const DELETE = route<{ id: string }>(
  async (_req, { params }) => {
    const { id } = await params;
    assertId(id);
    if (!(await School.exists({ _id: id }))) throw new HttpError(404, "Sekolah tidak ditemukan");
    const users = await User.countDocuments({ schoolId: id });
    if (users) throw new HttpError(409, `Masih ada ${users} pengguna di sekolah ini. Hapus / pindahkan pengguna terlebih dahulu, atau nonaktifkan sekolah.`);
    await Promise.all([
      Teacher.deleteMany({ schoolId: id }),
      Subject.deleteMany({ schoolId: id }),
      ClassRoom.deleteMany({ schoolId: id }),
      Schedule.deleteMany({ schoolId: id }),
      Invite.deleteMany({ schoolId: id }),
    ]);
    await School.deleteOne({ _id: id });
    return json({ ok: true });
  },
  { access: "superadmin" },
);
