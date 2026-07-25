import { NextResponse } from "next/server";
import { requireAdminOrResponse } from "@/lib/session";

export const dynamic = "force-dynamic";

export async function GET() {
  const { session, response } = await requireAdminOrResponse();
  if (response) return response;

  return NextResponse.json({
    adminId: session.adminId,
    email: session.email,
    role: session.role,
    departmentId: session.departmentId,
  });
}
