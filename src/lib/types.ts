export type ItemType = "lesson" | "break" | "activity";

export interface ScheduleItem {
  uid: string;
  type: ItemType;
  subjectId?: string | null;
  teacherId?: string | null;
  /** Jumlah jam pelajaran (JP). Durasi = jp x durasi mapel/hari. */
  jp?: number;
  /** Override durasi (menit). Jika kosong, pakai default. */
  duration?: number | null;
  /** Label untuk istirahat/kegiatan, mis. "Istirahat", "Upacara". */
  label?: string;
}

export interface ScheduleDay {
  day: string;
  items: ScheduleItem[];
}

export interface Schedule {
  _id?: string;
  classId: string;
  days: ScheduleDay[];
}

export interface DayConfig {
  day: string;
  active: boolean;
  startTime: string; // "HH:mm"
  lessonDuration: number; // menit per 1 JP
}

export interface Settings {
  schoolName: string;
  address?: string;
  city?: string;
  academicYear?: string;
  semester?: string;
  principalName?: string;
  principalNip?: string;
  breakDuration: number;
  days: DayConfig[];
}

export interface Teacher {
  _id: string;
  name: string;
  code?: string;
  nip?: string;
  phone?: string;
  subjectIds: string[];
}

export interface Subject {
  _id: string;
  name: string;
  code?: string;
  color?: string;
  /** Durasi 1 JP khusus mapel ini (menit). Kosong = ikut durasi hari. */
  duration?: number | null;
}

export interface ClassRoom {
  _id: string;
  name: string;
  grade?: string;
  homeroomTeacherId?: string | null;
}

export type Role = "superadmin" | "admin";

/** Isi token sesi (JWT). Dipakai proxy untuk routing halaman. */
export interface SessionUser {
  sub: string;
  username: string;
  name: string;
  role: Role;
}

/** User yang sedang login, dibaca ulang dari database di tiap request API. */
export interface CurrentUser {
  id: string;
  username: string;
  name: string;
  role: Role;
  schoolId: string | null;
  schoolName: string | null;
}

export interface School extends Settings {
  _id: string;
  active: boolean;
  userCount?: number;
  classCount?: number;
}

export interface AppUser {
  _id: string;
  username: string;
  name: string;
  role: Role;
  schoolId: string | null;
  active: boolean;
  createdAt?: string;
}

export interface InviteInfo {
  _id: string;
  role: Role;
  schoolId: string | null;
  note: string;
  expiresAt: string;
  usedAt: string | null;
  usedBy: string | null;
  createdAt: string;
  expired: boolean;
}
