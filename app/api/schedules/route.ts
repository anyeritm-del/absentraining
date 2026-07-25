import { NextResponse } from "next/server";
import { z } from "zod";
import { assertDepartmentScope, requireAdminOrResponse } from "@/lib/session";
import { createSchedule, listSchedules } from "@/lib/repositories/schedules";
import { listTrainees } from "@/lib/repositories/trainees";
import {
  listScheduleAssignments,
  setAssignmentsForSchedule,
} from "@/lib/repositories/scheduleAssignments";

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
  trainee_ids: z.array(z.string()).default([]),
});

export async function GET() {
  const { session, response } = await requireAdminOrResponse();
  if (response) return response;

  const [schedules, assignments] = await Promise.all([
    listSchedules(),
    listScheduleAssignments(),
  ]);
  const scoped =
    session.role === "full_access"
      ? schedules
      : schedules.filter((s) => s.department_id === session.departmentId);

  const withAssignments = scoped.map((schedule) => ({
    ...schedule,
    trainee_ids: assignments
      .filter((a) => a.schedule_id === schedule.id)
      .map((a) => a.trainee_id),
  }));

  return NextResponse.json({ schedules: withAssignments });
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
  const { trainee_ids, ...scheduleData } = parsed.data;

  const forbidden = assertDepartmentScope(session, scheduleData.department_id);
  if (forbidden) return forbidden;

  const departmentTrainees = await listTrainees();
  const validTraineeIds = new Set(
    departmentTrainees
      .filter((t) => t.department_id === scheduleData.department_id)
      .map((t) => t.id)
  );
  const invalidId = trainee_ids.find((id) => !validTraineeIds.has(id));
  if (invalidId) {
    return NextResponse.json(
      { error: "Salah satu anak training tidak berada di department ini" },
      { status: 400 }
    );
  }

  const schedule = await createSchedule(scheduleData);
  await setAssignmentsForSchedule(schedule.id, trainee_ids);
  return NextResponse.json({ schedule: { ...schedule, trainee_ids } }, { status: 201 });
}
