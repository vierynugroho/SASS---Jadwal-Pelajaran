import bcrypt from "bcryptjs";
import { HttpError, json, readBody, route } from "@/lib/api";
import { User } from "@/lib/models";

export const PUT = route(async (req, { user }) => {
  const { oldPassword, newPassword } = await readBody<{ oldPassword?: string; newPassword?: string }>(req);
  if (!newPassword || newPassword.length < 6) throw new HttpError(400, "Password baru minimal 6 karakter");
  const doc = await User.findById(user!.id);
  if (!doc || !(await bcrypt.compare(String(oldPassword ?? ""), doc.passwordHash)))
    throw new HttpError(400, "Password lama salah");
  doc.passwordHash = await bcrypt.hash(newPassword, 10);
  await doc.save();
  return json({ ok: true });
}, { access: "user" });
