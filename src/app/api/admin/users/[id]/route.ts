import bcrypt from "bcryptjs";
import mongoose from "mongoose";
import { HttpError, assertId, json, readBody, route, str } from "@/lib/api";
import { School, User } from "@/lib/models";

export const PUT = route<{ id: string }>(
  async (req, { params, user }) => {
    const { id } = await params;
    assertId(id);
    const b = await readBody(req);
    const doc = await User.findById(id);
    if (!doc) throw new HttpError(404, "Pengguna tidak ditemukan");

    const role = b.role === "superadmin" ? "superadmin" : "admin";
    const active = b.active !== false;
    const isSelf = id === user!.id;
    if (isSelf && (role !== "superadmin" || !active)) throw new HttpError(400, "Tidak bisa menurunkan role / menonaktifkan akun sendiri");

    let schoolId: string | null = null;
    if (role === "admin") {
      schoolId = typeof b.schoolId === "string" && mongoose.isValidObjectId(b.schoolId) ? b.schoolId : null;
      if (!schoolId || !(await School.exists({ _id: schoolId }))) throw new HttpError(400, "Admin wajib memilih sekolah");
    }
    doc.name = str(b.name) || doc.name;
    doc.role = role;
    doc.schoolId = schoolId ? new mongoose.Types.ObjectId(schoolId) : null;
    doc.active = active;
    const password = typeof b.password === "string" ? b.password : "";
    if (password) {
      if (password.length < 6) throw new HttpError(400, "Password minimal 6 karakter");
      doc.passwordHash = await bcrypt.hash(password, 10);
    }
    await doc.save();
    const { passwordHash: _omit, ...rest } = doc.toObject();
    void _omit;
    return json(rest);
  },
  { access: "superadmin" },
);

export const DELETE = route<{ id: string }>(
  async (_req, { params, user }) => {
    const { id } = await params;
    assertId(id);
    if (id === user!.id) throw new HttpError(400, "Tidak bisa menghapus akun sendiri");
    await User.deleteOne({ _id: id });
    return json({ ok: true });
  },
  { access: "superadmin" },
);
