import { nanoid } from "nanoid";
import {
  appendRow,
  deleteRowById,
  ensureHeaders,
  getRows,
  updateRowById,
} from "../googleSheetsClient";

export const TRAINEES_TAB = "Trainees";
export const TRAINEES_HEADERS = [
  "id",
  "name",
  "department_id",
  "phone",
  "email",
  "code",
  "status",
  "created_at",
];

export type TraineeStatus = "active" | "inactive";

export interface Trainee {
  id: string;
  name: string;
  department_id: string;
  phone: string;
  email: string;
  code: string; // legacy per-trainee link id; only used as a filename-safe identifier now
  status: TraineeStatus;
  created_at: string;
}

export async function ensureTraineesHeaders() {
  await ensureHeaders(TRAINEES_TAB, TRAINEES_HEADERS);
}

export async function listTrainees(): Promise<Trainee[]> {
  const rows = await getRows(TRAINEES_TAB);
  return rows as unknown as Trainee[];
}

export async function getTraineeById(id: string): Promise<Trainee | null> {
  const list = await listTrainees();
  return list.find((t) => t.id === id) ?? null;
}

export async function getTraineeByEmail(email: string): Promise<Trainee | null> {
  const list = await listTrainees();
  return (
    list.find((t) => t.email.toLowerCase() === email.toLowerCase()) ?? null
  );
}

export async function createTrainee(data: {
  name: string;
  department_id: string;
  phone: string;
  email: string;
}): Promise<Trainee> {
  const trainee: Trainee = {
    id: nanoid(10),
    name: data.name,
    department_id: data.department_id,
    phone: data.phone,
    email: data.email,
    code: nanoid(10),
    status: "active",
    created_at: new Date().toISOString(),
  };
  await appendRow(
    TRAINEES_TAB,
    TRAINEES_HEADERS,
    trainee as unknown as Record<string, string>
  );
  return trainee;
}

export async function updateTrainee(
  id: string,
  data: {
    name: string;
    department_id: string;
    phone: string;
    email: string;
    status: TraineeStatus;
  }
): Promise<Trainee> {
  const existing = await getTraineeById(id);
  if (!existing) throw new Error("Trainee not found");
  const updated: Trainee = { ...existing, ...data };
  await updateRowById(
    TRAINEES_TAB,
    TRAINEES_HEADERS,
    "id",
    id,
    updated as unknown as Record<string, string>
  );
  return updated;
}

export async function deleteTrainee(id: string): Promise<void> {
  await deleteRowById(TRAINEES_TAB, "id", id);
}
