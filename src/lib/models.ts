import mongoose, { Schema, type Model, type Types } from "mongoose";
import type { DayConfig, ItemType, Role } from "./types";

type Id = Types.ObjectId;

export interface UserDoc {
  username: string;
  name: string;
  passwordHash: string;
  role: Role;
  /** Sekolah tempat admin bertugas. null untuk superadmin. */
  schoolId: Id | null;
  active: boolean;
}
export interface SchoolDoc {
  name: string;
  address: string;
  city: string;
  academicYear: string;
  semester: string;
  principalName: string;
  principalNip: string;
  breakDuration: number;
  days: DayConfig[];
  active: boolean;
}
export interface InviteDoc {
  tokenHash: string;
  role: Role;
  schoolId: Id | null;
  note: string;
  expiresAt: Date;
  usedAt: Date | null;
  usedBy: Id | null;
  createdBy: Id | null;
}
export interface TeacherDoc { schoolId: Id; name: string; code: string; nip: string; phone: string; subjectIds: Id[] }
export interface SubjectDoc { schoolId: Id; name: string; code: string; color: string; duration: number | null }
export interface ClassDoc { schoolId: Id; name: string; grade: string; homeroomTeacherId: Id | null }
export interface ItemDoc { uid: string; type: ItemType; subjectId: Id | null; teacherId: Id | null; jp: number; duration: number | null; label: string }
export interface ScheduleDoc { schoolId: Id; classId: Id; days: { day: string; items: ItemDoc[] }[] }

const opts = { timestamps: true, versionKey: false } as const;
const ObjectId = Schema.Types.ObjectId;
const schoolRef = { type: ObjectId, ref: "School", required: true, index: true } as const;

function getModel<T>(name: string, schema: Schema<T>, collection: string): Model<T> {
  return (mongoose.models[name] as Model<T>) ?? mongoose.model<T>(name, schema, collection);
}

const UserSchema = new Schema<UserDoc>(
  {
    username: { type: String, required: true, unique: true, lowercase: true, trim: true },
    name: { type: String, required: true, trim: true },
    passwordHash: { type: String, required: true },
    role: { type: String, enum: ["superadmin", "admin"], default: "admin" },
    schoolId: { type: ObjectId, ref: "School", default: null, index: true },
    active: { type: Boolean, default: true },
  },
  opts,
);

const DaySchema = new Schema<DayConfig>(
  { day: String, active: Boolean, startTime: String, lessonDuration: Number },
  { _id: false },
);

const SchoolSchema = new Schema<SchoolDoc>(
  {
    name: { type: String, required: true, trim: true },
    address: { type: String, default: "" },
    city: { type: String, default: "" },
    academicYear: { type: String, default: "" },
    semester: { type: String, default: "" },
    principalName: { type: String, default: "" },
    principalNip: { type: String, default: "" },
    breakDuration: { type: Number, default: 15 },
    days: { type: [DaySchema], default: [] },
    active: { type: Boolean, default: true },
  },
  opts,
);

const InviteSchema = new Schema<InviteDoc>(
  {
    tokenHash: { type: String, required: true, unique: true },
    role: { type: String, enum: ["superadmin", "admin"], required: true },
    schoolId: { type: ObjectId, ref: "School", default: null, index: true },
    note: { type: String, default: "" },
    expiresAt: { type: Date, required: true },
    usedAt: { type: Date, default: null },
    usedBy: { type: ObjectId, ref: "User", default: null },
    createdBy: { type: ObjectId, ref: "User", default: null },
  },
  opts,
);

const TeacherSchema = new Schema<TeacherDoc>(
  {
    schoolId: schoolRef,
    name: { type: String, required: true, trim: true },
    code: { type: String, default: "", trim: true },
    nip: { type: String, default: "", trim: true },
    phone: { type: String, default: "", trim: true },
    subjectIds: [{ type: ObjectId, ref: "Subject" }],
  },
  opts,
);

const SubjectSchema = new Schema<SubjectDoc>(
  {
    schoolId: schoolRef,
    name: { type: String, required: true, trim: true },
    code: { type: String, default: "", trim: true },
    color: { type: String, default: "#3b82f6" },
    duration: { type: Number, default: null, min: 1 },
  },
  opts,
);

const ClassSchema = new Schema<ClassDoc>(
  {
    schoolId: schoolRef,
    name: { type: String, required: true, trim: true },
    grade: { type: String, default: "", trim: true },
    homeroomTeacherId: { type: ObjectId, ref: "Teacher", default: null },
  },
  opts,
);

const ItemSchema = new Schema<ItemDoc>(
  {
    uid: { type: String, required: true },
    type: { type: String, enum: ["lesson", "break", "activity"], required: true },
    subjectId: { type: ObjectId, ref: "Subject", default: null },
    teacherId: { type: ObjectId, ref: "Teacher", default: null },
    jp: { type: Number, default: 1 },
    duration: { type: Number, default: null },
    label: { type: String, default: "" },
  },
  { _id: false },
);

const ScheduleSchema = new Schema<ScheduleDoc>(
  {
    schoolId: schoolRef,
    classId: { type: ObjectId, ref: "ClassRoom", required: true, unique: true },
    days: [new Schema<ScheduleDoc["days"][number]>({ day: String, items: [ItemSchema] }, { _id: false })],
  },
  opts,
);

export const User = getModel<UserDoc>("User", UserSchema, "users");
export const School = getModel<SchoolDoc>("School", SchoolSchema, "schools");
export const Invite = getModel<InviteDoc>("Invite", InviteSchema, "invites");
export const Teacher = getModel<TeacherDoc>("Teacher", TeacherSchema, "teachers");
export const Subject = getModel<SubjectDoc>("Subject", SubjectSchema, "subjects");
export const ClassRoom = getModel<ClassDoc>("ClassRoom", ClassSchema, "classes");
export const Schedule = getModel<ScheduleDoc>("Schedule", ScheduleSchema, "schedules");
