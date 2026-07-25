import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { ADMIN_COOKIE_NAME } from "./constants";
import type { AdminRole } from "./repositories/admins";

export { ADMIN_COOKIE_NAME };
const SESSION_TTL_SECONDS = 60 * 60 * 24 * 7; // 7 days

export interface AdminSessionPayload {
  adminId: string;
  email: string;
  role: AdminRole;
  departmentId: string; // "" for full_access
  [key: string]: unknown;
}

function getSecretKey(): Uint8Array {
  const secret = process.env.SESSION_SECRET;
  if (!secret) throw new Error("Missing SESSION_SECRET environment variable");
  return new TextEncoder().encode(secret);
}

export async function signAdminSession(
  payload: AdminSessionPayload
): Promise<string> {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${SESSION_TTL_SECONDS}s`)
    .sign(getSecretKey());
}

export async function verifyAdminSession(
  token: string
): Promise<AdminSessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, getSecretKey());
    return payload as AdminSessionPayload;
  } catch {
    return null;
  }
}

/** Server-only: reads and verifies the admin session cookie for the current request. */
export async function getAdminSession(): Promise<AdminSessionPayload | null> {
  const store = await cookies();
  const token = store.get(ADMIN_COOKIE_NAME)?.value;
  if (!token) return null;
  return verifyAdminSession(token);
}

export const SESSION_MAX_AGE = SESSION_TTL_SECONDS;

/** Server-only: returns the admin session, or a ready-to-return 401 response if absent. */
export async function requireAdminOrResponse(): Promise<
  | { session: AdminSessionPayload; response: null }
  | { session: null; response: NextResponse }
> {
  const session = await getAdminSession();
  if (!session) {
    return {
      session: null,
      response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    };
  }
  return { session, response: null };
}

/** Server-only: like requireAdminOrResponse, but also requires the full_access role. */
export async function requireFullAccessOrResponse(): Promise<
  | { session: AdminSessionPayload; response: null }
  | { session: null; response: NextResponse }
> {
  const result = await requireAdminOrResponse();
  if (result.response) return result;
  if (result.session.role !== "full_access") {
    return {
      session: null,
      response: NextResponse.json(
        { error: "Hanya admin full-access yang bisa mengakses ini" },
        { status: 403 }
      ),
    };
  }
  return result;
}

/**
 * Checks whether the session may act on the given department. full_access
 * always passes; department_admin only passes for their own department.
 * Returns a ready-to-return 403 response when forbidden, or null when allowed.
 */
export function assertDepartmentScope(
  session: AdminSessionPayload,
  departmentId: string
): NextResponse | null {
  if (session.role === "full_access") return null;
  if (session.departmentId === departmentId) return null;
  return NextResponse.json(
    { error: "Anda tidak punya akses ke department ini" },
    { status: 403 }
  );
}
