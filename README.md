# Jadwal Mengajar

Aplikasi penyusunan jadwal mengajar sekolah — Next.js (fullstack) + MongoDB, siap deploy ke Vercel.

## Role

| Role | Bisa |
| --- | --- |
| **Superadmin** | Mendaftarkan / mengubah / menonaktifkan / menghapus sekolah, mengundang pengguna (link sekali pakai), mengelola pengguna (role, sekolah, status, reset password), backup & import data per sekolah. |
| **Admin** | Terikat ke satu sekolah. Mengelola seluruh data jadwal sekolahnya: guru, mapel, kelas, jadwal, pengaturan, cetak, backup & import. |

Data tiap sekolah terpisah; admin hanya bisa melihat & mengubah data sekolahnya sendiri.

**Alur:** superadmin (dari seeder) login → tambah sekolah → klik *Undang admin* → kirim link ke calon admin → admin membuka link, membuat username & password, lalu langsung masuk.

## Fitur

- **Login** + ganti password (menu *Akun Saya*). Tidak ada registrasi publik: superadmin dari seeder, user lain lewat undangan.
- **Identitas sekolah**: nama, alamat, kota, tahun ajaran, semester, kepala sekolah — tampil di kop & tanda tangan hasil cetak.
- **Master data**: guru (beserta mapel yang diampu), mata pelajaran, kelas (beserta wali kelas).
- **Jam dinamis**
  - Per hari: hari aktif, jam mulai, durasi 1 JP (mis. Jumat 35 menit).
  - Per mapel: durasi 1 JP khusus (mis. PJOK 35 menit).
  - Per item jadwal: jumlah JP, atau override durasi manual.
  - Istirahat & kegiatan (Upacara, Literasi, dll.) dengan durasi sendiri.
  - Jam mulai/selesai dihitung otomatis dari urutan item.
- **Deteksi bentrok guru** antar kelas secara langsung saat menyusun.
- Salin jadwal antar hari / antar kelas, rekap beban JP per guru.
- **Cetak / PDF** per kelas atau per guru (A4 landscape, 1 halaman per kelas/guru) via dialog cetak browser → "Simpan sebagai PDF".
- **Backup manual per sekolah** (JSON): admin dari menu *Backup Data*, superadmin dari tombol *Export / Import* di daftar sekolah. Import mengganti data jadwal sekolah tujuan (nama sekolah tetap), ID dibuat ulang sehingga backup sekolah A bisa dipulihkan ke sekolah B. Akun pengguna tidak ikut di-export.

## Menjalankan lokal

```bash
npm install
cp .env.example .env.local   # isi MONGODB_URI & AUTH_SECRET
npm run seed                 # buat superadmin (default: superadmin / superadmin123)
npm run dev                  # http://localhost:3000
```

### Seeder superadmin

```bash
npm run seed                                       # pakai SEED_SUPERADMIN_* dari .env.local
npm run seed -- pusat rahasia123 "Admin Pusat"     # buat superadmin lain / reset password
```

Menjalankan ulang seeder untuk username yang sama akan **me-reset password**-nya. Admin sekolah tidak dibuat lewat seeder, melainkan diundang dari aplikasi.

## Deploy ke Vercel

1. Buat cluster gratis di **MongoDB Atlas**, buat database user, dan di *Network Access* izinkan `0.0.0.0/0` (Vercel tidak punya IP tetap).
2. Push repo ke GitHub, import ke Vercel.
3. Set Environment Variables di Vercel: `MONGODB_URI`, `AUTH_SECRET` (buat dengan `openssl rand -base64 32`).
4. Jalankan seeder sekali dari komputer lokal dengan `MONGODB_URI` mengarah ke Atlas: `npm run seed`.

## Struktur

```
src/
  proxy.ts                 # wajib login + routing halaman per role
  lib/
    models.ts              # skema Mongoose
    schedule.ts            # hitung jam, bentrok, beban guru
    api.ts                 # wrapper route: cek akses per role & scope sekolah
    crud.ts, sanitize.ts   # validasi & CRUD API
    backup.ts              # export / import per sekolah
  app/
    login/, undangan/      # halaman login & terima undangan
    (app)/                 # dashboard, jadwal, cetak, guru, mapel, kelas, pengaturan, backup, akun
    (app)/admin/           # panel superadmin: sekolah, pengguna & undangan
    api/                   # route handlers
scripts/seed.ts            # seeder user
```
