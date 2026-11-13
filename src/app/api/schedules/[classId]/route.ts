import { HttpError, assertId, json, readBody, route } from "@/lib/api";
import { ClassRoom, Schedule, Subject, Teacher } from "@/lib/models";
import { getSettings } from "@/lib/settings";
import { computeDay, fmtEnd } from "@/lib/schedule";
import { DAY_END_MAX, DAY_END_MAX_MIN } from "@/lib/limits";
import type { Subject as SubjectT } from "@/lib/types";
import { sanitizeDays } from "@/lib/sanitize";

export const PUT = route<{ classId: string }>(async (req, { params, schoolId }) => {
  const { classId } = await params;
  assertId(classId);
  if (!(await ClassRoom.exists({ _id: classId, schoolId }))) throw new HttpError(404, "Kelas tidak ditemukan");
  const body = await readBody<{ days: unknown }>(req);
  const days = sanitizeDays(body.days);

  // Pastikan mapel & guru yang dirujuk milik sekolah ini.
  const [subjects, teachers, settings] = await Promise.all([
    Subject.find({ schoolId }, { _id: 1, duration: 1 }).lean(),
    Teacher.find({ schoolId }, { _id: 1 }).lean(),
    getSettings(schoolId),
  ]);
  const sIds = new Set(subjects.map((s) => String(s._id)));
  const tIds = new Set(teachers.map((t) => String(t._id)));
  for (const d of days)
    for (const it of d.items) {
      if (it.type === "lesson" && !sIds.has(String(it.subjectId)))
        throw new HttpError(400, `${d.day}: mata pelajaran tidak ditemukan (mungkin sudah dihapus)`);
      if (it.teacherId && !tIds.has(String(it.teacherId))) it.teacherId = null;
    }

  // Jadwal harian tidak boleh melewati batas jam selesai.
  const subjectMap = new Map(subjects.map((s) => [String(s._id), { _id: String(s._id), name: "", duration: s.duration } as SubjectT]));
  for (const d of days) {
    const cfg = settings.days.find((x) => x.day === d.day);
    if (!cfg || !d.items.length) continue;
    const timed = computeDay(d.items, cfg, settings, subjectMap);
    const end = timed[timed.length - 1].end;
    if (end > DAY_END_MAX_MIN) throw new HttpError(400, `${d.day}: jadwal selesai pukul ${fmtEnd(end)}, melewati batas ${DAY_END_MAX}`);
  }

  const doc = await Schedule.findOneAndUpdate({ classId, schoolId }, { classId, schoolId, days }, { upsert: true, new: true }).lean();
  return json(doc);
});
