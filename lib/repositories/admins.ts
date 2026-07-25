import { nanoid } from "nanoid";
import { appendRow, ensureHeaders, getRows } from "../googleSheetsClient";

export const ADMINS_TAB = "Admins";
export const ADMINS_HEADERS = ["id", "email", "password_hash", "created_at"];

export interface Admin {
  id: string;
  email: string;
  password_hash: string;
  created_at: string;
}

export async function ensureAdminsHeaders() {
  await ensureHeaders(ADMINS_TAB, ADMINS_HEADERS);
}

export async function listAdmins(): Promise<Admin[]> {
  const rows = await getRows(ADMINS_TAB);
  return rows as unknown as Admin[];
}

export async function getAdminByEmail(email: string): Promise<Admin | null> {
  const list = await listAdmins();
  return (
    list.find((a) => a.email.toLowerCase() === email.toLowerCase()) ?? null
  );
}

export async function createAdmin(data: {
  email: string;
  password_hash: string;
}): Promise<Admin> {
  const admin: Admin = {
    id: nanoid(10),
    email: data.email,
    password_hash: data.password_hash,
    created_at: new Date().toISOString(),
  };
  await appendRow(
    ADMINS_TAB,
    ADMINS_HEADERS,
    admin as unknown as Record<string, string>
  );
  return admin;
}
