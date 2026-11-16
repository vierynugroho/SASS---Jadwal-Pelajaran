"use client";

import { useMemo } from "react";
import { useApi } from "./client";
import { byId } from "./schedule";
import type { ClassRoom, DutyEntry, Schedule, Settings, Subject, Teacher } from "./types";

export function useAllData() {
  const settings = useApi<Settings>("/api/settings");
  const teachers = useApi<Teacher[]>("/api/teachers");
  const subjects = useApi<Subject[]>("/api/subjects");
  const classes = useApi<ClassRoom[]>("/api/classes");
  const schedules = useApi<Schedule[]>("/api/schedules");
  const duties = useApi<DutyEntry[]>("/api/duties");

  const all = [settings, teachers, subjects, classes, schedules, duties];
  const error = all.find((x) => x.error)?.error ?? null;
  const ready = all.every((x) => x.data);

  const maps = useMemo(
    () => ({
      subjectMap: byId(subjects.data ?? []),
      teacherMap: byId(teachers.data ?? []),
      classMap: byId(classes.data ?? []),
    }),
    [subjects.data, teachers.data, classes.data],
  );

  return {
    ready,
    error,
    settings: settings.data!,
    teachers: teachers.data ?? [],
    subjects: subjects.data ?? [],
    classes: classes.data ?? [],
    schedules: schedules.data ?? [],
    setSchedules: schedules.setData,
    duties: duties.data ?? [],
    setDuties: duties.setData,
    ...maps,
  };
}
