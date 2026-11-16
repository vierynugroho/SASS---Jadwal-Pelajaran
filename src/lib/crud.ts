import type { Model } from "mongoose";
import mongoose from "mongoose";
import { HttpError, assertId, json, readBody, route, str } from "./api";
import { ClassRoom, Duty, Schedule, Subject, Teacher } from "./models";
import { LIMITS, intError } from "./limits";

type Clean = (body: Record<string, unknown>, schoolId: string) => Promise<Record<string, unknown>>;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyModel = Model<any>;

const ids = (v: unknown) => (Array.isArray(v) ? v.filter((x) => mongoose.isValidObjectId(x)).map(String) : []);
const idOrNull = (v: unknown) => (typeof v === "string" && mongoose.isValidObjectId(v) ? v : null);
/** Angka opsional dalam batas; kosong = null; di luar batas = error 400. */
const optionalInt = (v: unknown, limit: Parameters<typeof intError>[1]) => {
  const err = intError(v, limit, { optional: true });
  if (err) throw new HttpError(400, err);
  return v === null || v === undefined || v === "" ? null : Number(v);
};
const required = (v: string, label: string) => {
  if (!v) throw new HttpError(400, `${label} wajib diisi`);
  return v;
};

/** Saring ID agar hanya yang milik sekolah yang sama. */
async function ownedIds(M: AnyModel, list: string[], schoolId: string) {
  if (!list.length) return [];
  const found = await M.find({ _id: { $in: list }, schoolId }, { _id: 1 }).lean<{ _id: unknown }[]>();
  return found.map((x) => String(x._id));
}

/** CRUD standar yang selalu dibatasi ke sekolah milik admin yang login. */
function crud(M: AnyModel, clean: Clean, sort: Record<string, 1 | -1>, beforeDelete?: (id: string, schoolId: string) => Promise<void>) {
  return {
    list: route(async (_req, { schoolId }) =>
      json(await M.find({ schoolId }).sort(sort).collation({ locale: "id", numericOrdering: true }).lean()),
    ),
    create: route(async (req, { schoolId }) => {
      const doc = await M.create({ ...(await clean(await readBody(req), schoolId)), schoolId });
      return json(doc.toObject(), 201);
    }),
    update: route<{ id: string }>(async (req, { params, schoolId }) => {
      const { id } = await params;
      assertId(id);
      const data = await clean(await readBody(req), schoolId);
      const doc = await M.findOneAndUpdate({ _id: id, schoolId }, data, { new: true, runValidators: true }).lean();
      if (!doc) throw new HttpError(404, "Data tidak ditemukan");
      return json(doc);
    }),
    remove: route<{ id: string }>(async (_req, { params, schoolId }) => {
      const { id } = await params;
      assertId(id);
      if (!(await M.exists({ _id: id, schoolId }))) throw new HttpError(404, "Data tidak ditemukan");
      await beforeDelete?.(id, schoolId);
      await M.deleteOne({ _id: id, schoolId });
      return json({ ok: true });
    }),
  };
}

export const teachersCrud = crud(
  Teacher,
  async (b, schoolId) => ({
    name: required(str(b.name), "Nama guru"),
    code: str(b.code),
    nip: str(b.nip),
    phone: str(b.phone),
    subjectIds: await ownedIds(Subject, ids(b.subjectIds), schoolId),
  }),
  { name: 1 },
  async (id, schoolId) => {
    if (await Schedule.exists({ schoolId, "days.items.teacherId": id }))
      throw new HttpError(409, "Guru masih dipakai di jadwal. Hapus dari jadwal terlebih dahulu.");
    await ClassRoom.updateMany({ schoolId, homeroomTeacherId: id }, { homeroomTeacherId: null });
    await Duty.updateOne({ schoolId }, { $pull: { "entries.$[].teacherIds": id } });
  },
);

export const subjectsCrud = crud(
  Subject,
  async (b) => ({
    name: required(str(b.name), "Nama mapel"),
    code: str(b.code),
    color: /^#[0-9a-fA-F]{6}$/.test(str(b.color)) ? str(b.color) : "#3b82f6",
    duration: optionalInt(b.duration, LIMITS.subjectDuration),
  }),
  { name: 1 },
  async (id, schoolId) => {
    if (await Schedule.exists({ schoolId, "days.items.subjectId": id }))
      throw new HttpError(409, "Mapel masih dipakai di jadwal. Hapus dari jadwal terlebih dahulu.");
    await Teacher.updateMany({ schoolId }, { $pull: { subjectIds: id } });
  },
);

export const classesCrud = crud(
  ClassRoom,
  async (b, schoolId) => {
    const homeroom = idOrNull(b.homeroomTeacherId);
    return {
      name: required(str(b.name), "Nama kelas"),
      grade: str(b.grade),
      homeroomTeacherId: homeroom && (await Teacher.exists({ _id: homeroom, schoolId })) ? homeroom : null,
    };
  },
  { grade: 1, name: 1 },
  async (id, schoolId) => {
    await Schedule.deleteOne({ schoolId, classId: id });
    await Duty.updateOne({ schoolId }, { $pull: { entries: { classId: id } } });
  },
);
