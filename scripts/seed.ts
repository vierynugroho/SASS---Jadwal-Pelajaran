/**
 * Seeder akun SUPERADMIN.
 *   npm run seed                                     -> pakai SEED_SUPERADMIN_* dari .env.local (default superadmin / superadmin123)
 *   npm run seed -- <username> <password> "<Nama>"   -> buat / reset superadmin tertentu
 *
 * Admin sekolah tidak dibuat lewat seeder, melainkan diundang oleh superadmin dari aplikasi.
 */
import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import { User } from "../src/lib/models";

async function main() {
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error("MONGODB_URI belum di-set (isi di .env.local)");
  const [argUser, argPass, argName] = process.argv.slice(2);
  const username = (argUser || process.env.SEED_SUPERADMIN_USERNAME || "superadmin").trim().toLowerCase();
  const password = argPass || process.env.SEED_SUPERADMIN_PASSWORD || "superadmin123";
  const name = argName || process.env.SEED_SUPERADMIN_NAME || "Super Administrator";
  if (password.length < 6) throw new Error("Password minimal 6 karakter");

  await mongoose.connect(uri, { serverSelectionTimeoutMS: 10000 });
  const passwordHash = await bcrypt.hash(password, 10);
  const existed = await User.exists({ username });
  await User.updateOne(
    { username },
    { $set: { username, name, passwordHash, role: "superadmin", schoolId: null, active: true } },
    { upsert: true },
  );
  console.log(`✔ Superadmin "${username}" ${existed ? "diperbarui (password di-reset)" : "dibuat"}.`);
  await mongoose.disconnect();
}

main().catch(async (e) => {
  console.error("✖", e instanceof Error ? e.message : e);
  await mongoose.disconnect().catch(() => {});
  process.exit(1);
});
