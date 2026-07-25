import { nanoid } from "nanoid";
import {
  appendRow,
  deleteRowById,
  ensureHeaders,
  getRows,
  updateRowById,
} from "../googleSheetsClient";

export const DEPARTMENTS_TAB = "Departments";
export const DEPARTMENTS_HEADERS = ["id", "name", "description", "created_at"];

export interface Department {
  id: string;
  name: string;
  description: string;
  created_at: string;
}

export async function ensureDepartmentsHeaders() {
  await ensureHeaders(DEPARTMENTS_TAB, DEPARTMENTS_HEADERS);
}

export async function listDepartments(): Promise<Department[]> {
  const rows = await getRows(DEPARTMENTS_TAB);
  return rows as unknown as Department[];
}

export async function getDepartmentById(
  id: string
): Promise<Department | null> {
  const list = await listDepartments();
  return list.find((d) => d.id === id) ?? null;
}

export async function createDepartment(data: {
  name: string;
  description: string;
}): Promise<Department> {
  const dept: Department = {
    id: nanoid(10),
    name: data.name,
    description: data.description,
    created_at: new Date().toISOString(),
  };
  await appendRow(
    DEPARTMENTS_TAB,
    DEPARTMENTS_HEADERS,
    dept as unknown as Record<string, string>
  );
  return dept;
}

export async function updateDepartment(
  id: string,
  data: { name: string; description: string }
): Promise<Department> {
  const existing = await getDepartmentById(id);
  if (!existing) throw new Error("Department not found");
  const updated: Department = { ...existing, ...data };
  await updateRowById(
    DEPARTMENTS_TAB,
    DEPARTMENTS_HEADERS,
    "id",
    id,
    updated as unknown as Record<string, string>
  );
  return updated;
}

export async function deleteDepartment(id: string): Promise<void> {
  await deleteRowById(DEPARTMENTS_TAB, "id", id);
}
