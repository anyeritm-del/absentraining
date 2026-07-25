import { nanoid } from "nanoid";
import {
  appendRow,
  deleteRowById,
  ensureHeaders,
  getRows,
  SheetRow,
} from "../googleSheetsClient";

export const SCHEDULE_ASSIGNMENTS_TAB = "ScheduleAssignments";
export const SCHEDULE_ASSIGNMENTS_HEADERS = [
  "id",
  "schedule_id",
  "trainee_id",
  "created_at",
  "status",
];

export type AssignmentStatus = "assigned" | "excused";

export interface ScheduleAssignment {
  id: string;
  schedule_id: string;
  trainee_id: string;
  created_at: string;
  status: AssignmentStatus;
}

export interface TraineeAssignmentInput {
  trainee_id: string;
  status: AssignmentStatus;
}

// Assignments created before "izin" existed have no status cell — treat them
// as a normal (non-excused) assignment rather than losing the data.
function normalizeStatus(status: string): AssignmentStatus {
  return status === "excused" ? "excused" : "assigned";
}

function parseAssignment(row: SheetRow): ScheduleAssignment {
  return {
    id: row.id,
    schedule_id: row.schedule_id,
    trainee_id: row.trainee_id,
    created_at: row.created_at,
    status: normalizeStatus(row.status),
  };
}

export async function ensureScheduleAssignmentsHeaders() {
  await ensureHeaders(SCHEDULE_ASSIGNMENTS_TAB, SCHEDULE_ASSIGNMENTS_HEADERS);
}

export async function listScheduleAssignments(): Promise<ScheduleAssignment[]> {
  const rows = await getRows(SCHEDULE_ASSIGNMENTS_TAB);
  return rows.map(parseAssignment);
}

export async function getAssignmentsForSchedule(
  scheduleId: string
): Promise<ScheduleAssignment[]> {
  const list = await listScheduleAssignments();
  return list.filter((a) => a.schedule_id === scheduleId);
}

export async function getScheduleIdsForTrainee(traineeId: string): Promise<Set<string>> {
  const list = await listScheduleAssignments();
  return new Set(list.filter((a) => a.trainee_id === traineeId).map((a) => a.schedule_id));
}

export async function getAssignmentsForTrainee(
  traineeId: string
): Promise<ScheduleAssignment[]> {
  const list = await listScheduleAssignments();
  return list.filter((a) => a.trainee_id === traineeId);
}

export async function getAssignmentForTraineeSchedule(
  traineeId: string,
  scheduleId: string
): Promise<ScheduleAssignment | null> {
  const list = await listScheduleAssignments();
  return (
    list.find((a) => a.trainee_id === traineeId && a.schedule_id === scheduleId) ?? null
  );
}

export async function isTraineeAssignedToSchedule(
  traineeId: string,
  scheduleId: string
): Promise<boolean> {
  const assignment = await getAssignmentForTraineeSchedule(traineeId, scheduleId);
  return assignment !== null;
}

export async function setAssignmentsForSchedule(
  scheduleId: string,
  trainees: TraineeAssignmentInput[]
): Promise<void> {
  await deleteAssignmentsForSchedule(scheduleId);
  for (const { trainee_id, status } of trainees) {
    const assignment: ScheduleAssignment = {
      id: nanoid(10),
      schedule_id: scheduleId,
      trainee_id,
      status,
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
