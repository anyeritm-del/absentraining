import { nanoid } from "nanoid";
import {
  appendRow,
  deleteRowById,
  ensureHeaders,
  getRows,
  SheetRow,
  updateRowById,
} from "../googleSheetsClient";

export const SCHEDULES_TAB = "Schedules";
export const SCHEDULES_HEADERS = [
  "id",
  "department_id",
  "date",
  "session_name",
  "start_time",
  "end_time",
  "lat",
  "lng",
  "radius_m",
  "created_at",
];

export interface Schedule {
  id: string;
  department_id: string;
  date: string; // YYYY-MM-DD
  session_name: string;
  start_time: string; // HH:mm
  end_time: string; // HH:mm
  lat: number;
  lng: number;
  radius_m: number;
  created_at: string;
}

function parseSchedule(row: SheetRow): Schedule {
  return {
    id: row.id,
    department_id: row.department_id,
    date: row.date,
    session_name: row.session_name,
    start_time: row.start_time,
    end_time: row.end_time,
    lat: Number(row.lat),
    lng: Number(row.lng),
    radius_m: Number(row.radius_m),
    created_at: row.created_at,
  };
}

function serializeSchedule(schedule: Schedule): SheetRow {
  return {
    id: schedule.id,
    department_id: schedule.department_id,
    date: schedule.date,
    session_name: schedule.session_name,
    start_time: schedule.start_time,
    end_time: schedule.end_time,
    lat: String(schedule.lat),
    lng: String(schedule.lng),
    radius_m: String(schedule.radius_m),
    created_at: schedule.created_at,
  };
}

export async function ensureSchedulesHeaders() {
  await ensureHeaders(SCHEDULES_TAB, SCHEDULES_HEADERS);
}

export async function listSchedules(): Promise<Schedule[]> {
  const rows = await getRows(SCHEDULES_TAB);
  return rows.map(parseSchedule);
}

export async function getScheduleById(id: string): Promise<Schedule | null> {
  const list = await listSchedules();
  return list.find((s) => s.id === id) ?? null;
}

export async function getSchedulesForDepartmentOnDate(
  departmentId: string,
  date: string
): Promise<Schedule[]> {
  const list = await listSchedules();
  return list.filter((s) => s.department_id === departmentId && s.date === date);
}

export async function createSchedule(data: {
  department_id: string;
  date: string;
  session_name: string;
  start_time: string;
  end_time: string;
  lat: number;
  lng: number;
  radius_m: number;
}): Promise<Schedule> {
  const schedule: Schedule = {
    id: nanoid(10),
    ...data,
    created_at: new Date().toISOString(),
  };
  await appendRow(SCHEDULES_TAB, SCHEDULES_HEADERS, serializeSchedule(schedule));
  return schedule;
}

export async function updateSchedule(
  id: string,
  data: {
    department_id: string;
    date: string;
    session_name: string;
    start_time: string;
    end_time: string;
    lat: number;
    lng: number;
    radius_m: number;
  }
): Promise<Schedule> {
  const existing = await getScheduleById(id);
  if (!existing) throw new Error("Schedule not found");
  const updated: Schedule = { ...existing, ...data };
  await updateRowById(
    SCHEDULES_TAB,
    SCHEDULES_HEADERS,
    "id",
    id,
    serializeSchedule(updated)
  );
  return updated;
}

export async function deleteSchedule(id: string): Promise<void> {
  await deleteRowById(SCHEDULES_TAB, "id", id);
}
