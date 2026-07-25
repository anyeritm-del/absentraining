import { nanoid } from "nanoid";
import {
  appendRow,
  deleteRowById,
  ensureHeaders,
  getRows,
} from "../googleSheetsClient";

export const SCHEDULE_ASSIGNMENTS_TAB = "ScheduleAssignments";
export const SCHEDULE_ASSIGNMENTS_HEADERS = [
  "id",
  "schedule_id",
  "trainee_id",
  "created_at",
];

export interface ScheduleAssignment {
  id: string;
  schedule_id: string;
  trainee_id: string;
  created_at: string;
}

export async function ensureScheduleAssignmentsHeaders() {
  await ensureHeaders(SCHEDULE_ASSIGNMENTS_TAB, SCHEDULE_ASSIGNMENTS_HEADERS);
}

export async function listScheduleAssignments(): Promise<ScheduleAssignment[]> {
  const rows = await getRows(SCHEDULE_ASSIGNMENTS_TAB);
  return rows as unknown as ScheduleAssignment[];
}

export async function getTraineeIdsForSchedule(scheduleId: string): Promise<string[]> {
  const list = await listScheduleAssignments();
  return list.filter((a) => a.schedule_id === scheduleId).map((a) => a.trainee_id);
}

export async function getScheduleIdsForTrainee(traineeId: string): Promise<Set<string>> {
  const list = await listScheduleAssignments();
  return new Set(list.filter((a) => a.trainee_id === traineeId).map((a) => a.schedule_id));
}

export async function isTraineeAssignedToSchedule(
  traineeId: string,
  scheduleId: string
): Promise<boolean> {
  const list = await listScheduleAssignments();
  return list.some((a) => a.trainee_id === traineeId && a.schedule_id === scheduleId);
}

export async function setAssignmentsForSchedule(
  scheduleId: string,
  traineeIds: string[]
): Promise<void> {
  await deleteAssignmentsForSchedule(scheduleId);
  for (const traineeId of traineeIds) {
    const assignment: ScheduleAssignment = {
      id: nanoid(10),
      schedule_id: scheduleId,
      trainee_id: traineeId,
      created_at: new Date().toISOString(),
    };
    await appendRow(
      SCHEDULE_ASSIGNMENTS_TAB,
      SCHEDULE_ASSIGNMENTS_HEADERS,
      assignment as unknown as Record<string, string>
    );
  }
}

export async function deleteAssignmentsForSchedule(scheduleId: string): Promise<void> {
  const list = await listScheduleAssignments();
  const toDelete = list.filter((a) => a.schedule_id === scheduleId);
  for (const assignment of toDelete) {
    await deleteRowById(SCHEDULE_ASSIGNMENTS_TAB, "id", assignment.id);
  }
}
