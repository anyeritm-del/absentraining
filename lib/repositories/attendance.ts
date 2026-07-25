import { nanoid } from "nanoid";
import {
  appendRow,
  ensureHeaders,
  getRows,
  SheetRow,
} from "../googleSheetsClient";

export const ATTENDANCE_TAB = "Attendance";
export const ATTENDANCE_HEADERS = [
  "id",
  "trainee_id",
  "schedule_id",
  "type",
  "timestamp",
  "lat",
  "lng",
  "distance_m",
  "within_radius",
  "status",
  "photo_file_id",
  "created_at",
];

export type AttendanceType = "clock_in" | "clock_out";
export type AttendanceStatus = "on_time" | "late" | "";

export interface AttendanceRecord {
  id: string;
  trainee_id: string;
  schedule_id: string;
  type: AttendanceType;
  timestamp: string;
  lat: number;
  lng: number;
  distance_m: number;
  within_radius: boolean;
  status: AttendanceStatus;
  photo_file_id: string;
  created_at: string;
}

function parseAttendance(row: SheetRow): AttendanceRecord {
  return {
    id: row.id,
    trainee_id: row.trainee_id,
    schedule_id: row.schedule_id,
    type: row.type as AttendanceType,
    timestamp: row.timestamp,
    lat: Number(row.lat),
    lng: Number(row.lng),
    distance_m: Number(row.distance_m),
    within_radius: row.within_radius === "true",
    status: row.status as AttendanceStatus,
    photo_file_id: row.photo_file_id,
    created_at: row.created_at,
  };
}

export async function ensureAttendanceHeaders() {
  await ensureHeaders(ATTENDANCE_TAB, ATTENDANCE_HEADERS);
}

export async function listAttendance(): Promise<AttendanceRecord[]> {
  const rows = await getRows(ATTENDANCE_TAB);
  return rows.map(parseAttendance);
}

export async function getAttendanceForTraineeSchedule(
  traineeId: string,
  scheduleId: string
): Promise<AttendanceRecord[]> {
  const list = await listAttendance();
  return list.filter(
    (a) => a.trainee_id === traineeId && a.schedule_id === scheduleId
  );
}

export async function getAttendanceForTrainee(traineeId: string): Promise<AttendanceRecord[]> {
  const list = await listAttendance();
  return list.filter((a) => a.trainee_id === traineeId);
}

export async function createAttendance(data: {
  trainee_id: string;
  schedule_id: string;
  type: AttendanceType;
  timestamp: string;
  lat: number;
  lng: number;
  distance_m: number;
  within_radius: boolean;
  status: AttendanceStatus;
  photo_file_id: string;
}): Promise<AttendanceRecord> {
  const record: AttendanceRecord = {
    id: nanoid(10),
    ...data,
    created_at: new Date().toISOString(),
  };
  await appendRow(ATTENDANCE_TAB, ATTENDANCE_HEADERS, {
    ...record,
    lat: String(record.lat),
    lng: String(record.lng),
    distance_m: String(record.distance_m),
    within_radius: String(record.within_radius),
  } as unknown as SheetRow);
  return record;
}
