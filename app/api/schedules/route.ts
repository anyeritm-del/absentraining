import { NextResponse } from "next/server";
import { z } from "zod";
import { assertDepartmentScope, requireAdminOrResponse } from "@/lib/session";
import { createSchedule, listSchedules } from "@/lib/repositories/schedules";
import { listTrainees } from "@/lib/repositories/trainees";
import {
  listScheduleAssignments,
  setAssignmentsForSchedule,
} from "@/lib/repositories/scheduleAssignments";
import { enumerateDates } from "@/lib/date";

export const dynamic = "force-dynamic";

const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;

const traineeAssignmentSchema = z.object({
  trainee_id: z.string().min(1),
  status: z.enum(["assigned", "excused"]).default("assigned"),
});

const createSchema = z.object({
  department_id: z.string().min(1),
  start_date: z.string().regex(DATE_REGEX, "Format tanggal harus YYYY-MM-DD"),
  end_date: z.string().regex(DATE_REGEX, "Format tanggal harus YYYY-MM-DD"),
  session_name: z.string().min(1),
  start_time: z.string().regex(/^\d{2}:\d{2}$/, "Format jam harus HH:mm"),
  end_time: z.string().regex(/^\d{2}:\d{2}$/, "Format jam harus HH:mm"),
  lat: z.number(),
  lng: z.number(),
  radius_m: z.number().positive(),
  trainees: z.array(traineeAssignmentSchema).default([]),
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
    trainees: assignments
      .filter((a) => a.schedule_id === schedule.id)
      .map((a) => ({ trainee_id: a.trainee_id, status: a.status })),
  }));

  return NextResponse.json({ schedules: withAssignments });
}

export async function POST(req: Request) {
  const { session, response } = await requireAdminOrResponse();
  if (response) return response;

  const parsed = createSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Data jadwal tidak valid" },
      { status: 400 }
    );
  }
  const { trainees, start_date, end_date, ...scheduleData } = parsed.data;

  const forbidden = assertDepartmentScope(session, scheduleData.department_id);
  if (forbidden) return forbidden;

  const dates = enumerateDates(start_date, end_date);
  if (dates.length === 0) {
    return NextResponse.json(
      { error: "Rentang tanggal tidak valid (tanggal selesai harus ≥ tanggal mulai)" },
      { status: 400 }
    );
  }

  const departmentTrainees = await listTrainees();
  const validTraineeIds = new Set(
    departmentTrainees
      .filter((t) => t.department_id === scheduleData.department_id)
      .map((t) => t.id)
  );
  const invalidId = trainees.find((t) => !validTraineeIds.has(t.trainee_id));
  if (invalidId) {
    return NextResponse.json(
      { error: "Salah satu anak training tidak berada di department ini" },
      { status: 400 }
    );
  }

  const createdSchedules = [];
  for (const date of dates) {
    const schedule = await createSchedule({ ...scheduleData, date });
    await setAssignmentsForSchedule(schedule.id, trainees);
    createdSchedules.push({ ...schedule, trainees });
  }

  return NextResponse.json({ schedules: createdSchedules }, { status: 201 });
}
