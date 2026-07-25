import { nanoid } from "nanoid";
import {
  appendRow,
  deleteRowById,
  ensureHeaders,
  getRows,
  SheetRow,
  updateRowById,
} from "../googleSheetsClient";

export const ADMINS_TAB = "Admins";
export const ADMINS_HEADERS = [
  "id",
  "email",
  "password_hash",
  "created_at",
  "role",
  "department_id",
];

export type AdminRole = "full_access" | "department_admin";

export interface Admin {
  id: string;
  email: string;
  password_hash: string;
  created_at: string;
  role: AdminRole;
  department_id: string; // "" for full_access
}

// Admins created before roles existed have no "role" cell — treat them (and
// any other unrecognized value) as full_access rather than locking them out.
function normalizeRole(role: string): AdminRole {
  return role === "department_admin" ? "department_admin" : "full_access";
}

function parseAdmin(row: SheetRow): Admin {
  return {
    id: row.id,
    email: row.email,
    password_hash: row.password_hash,
    created_at: row.created_at,
    role: normalizeRole(row.role),
    department_id: row.department_id ?? "",
  };
}

export async function ensureAdminsHeaders() {
  await ensureHeaders(ADMINS_TAB, ADMINS_HEADERS);
}

export async function listAdmins(): Promise<Admin[]> {
  const rows = await getRows(ADMINS_TAB);
  return rows.map(parseAdmin);
}

export async function getAdminByEmail(email: string): Promise<Admin | null> {
  const list = await listAdmins();
  return (
    list.find((a) => a.email.toLowerCase() === email.toLowerCase()) ?? null
  );
}

export async function getAdminById(id: string): Promise<Admin | null> {
  const list = await listAdmins();
  return list.find((a) => a.id === id) ?? null;
}

export async function deleteAdmin(id: string): Promise<void> {
  await deleteRowById(ADMINS_TAB, "id", id);
}

export async function updateAdmin(
  id: string,
  data: {
    email: string;
    role: AdminRole;
    department_id: string;
    password_hash?: string;
  }
): Promise<Admin> {
  const existing = await getAdminById(id);
  if (!existing) throw new Error("Admin not found");
  const updated: Admin = {
    ...existing,
    email: data.email,
    role: data.role,
    department_id: data.department_id,
    password_hash: data.password_hash ?? existing.password_hash,
  };
  await updateRowById(
    ADMINS_TAB,
    ADMINS_HEADERS,
    "id",
    id,
    updated as unknown as Record<string, string>
  );
  return updated;
}

export async function createAdmin(data: {
  email: string;
  password_hash: string;
  role: AdminRole;
  department_id: string;
}): Promise<Admin> {
  const admin: Admin = {
    id: nanoid(10),
    email: data.email,
    password_hash: data.password_hash,
    role: data.role,
    department_id: data.department_id,
    created_at: new Date().toISOString(),
  };
  await appendRow(
    ADMINS_TAB,
    ADMINS_HEADERS,
    admin as unknown as Record<string, string>
  );
  return admin;
}
