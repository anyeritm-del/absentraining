import { NextResponse } from "next/server";
import { z } from "zod";
import { assertDepartmentScope, requireAdminOrResponse } from "@/lib/session";
import { createSchedule, listSchedules } from "@/lib/repositories/schedules";

export const dynamic = "force-dynamic";

const scheduleSchema = z.object({
  department_id: z.string().min(1),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Format tanggal harus YYYY-MM-DD"),
  session_name: z.string().min(1),
  start_time: z.string().regex(/^\d{2}:\d{2}$/, "Format jam harus HH:mm"),
  end_time: z.string().regex(/^\d{2}:\d{2}$/, "Format jam harus HH:mm"),
  lat: z.number(),
  lng: z.number(),
  radius_m: z.number().positive(),
});

export async function GET() {
  const { session, response } = await requireAdminOrResponse();
  if (response) return response;

  const schedules = await listSchedules();
  const scoped =
    session.role === "full_access"
      ? schedules
      : schedules.filter((s) => s.department_id === session.departmentId);
  return NextResponse.json({ schedules: scoped });
}

export async function POST(req: Request) {
  const { session, response } = await requireAdminOrResponse();
  if (response) return response;

  const parsed = scheduleSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Data jadwal tidak valid" },
      { status: 400 }
    );
  }

  const forbidden = assertDepartmentScope(session, parsed.data.department_id);
  if (forbidden) return forbidden;

  const schedule = await createSchedule(parsed.data);
  return NextResponse.json({ schedule }, { status: 201 });
}
