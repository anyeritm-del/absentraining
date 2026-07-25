import { NextResponse } from "next/server";
import { z } from "zod";
import { assertDepartmentScope, requireAdminOrResponse } from "@/lib/session";
import { deleteSchedule, getScheduleById, updateSchedule } from "@/lib/repositories/schedules";
import { listTrainees } from "@/lib/repositories/trainees";
import {
  deleteAssignmentsForSchedule,
  setAssignmentsForSchedule,
} from "@/lib/repositories/scheduleAssignments";

export const dynamic = "force-dynamic";

const traineeAssignmentSchema = z.object({
  trainee_id: z.string().min(1),
  status: z.enum(["assigned", "excused"]).default("assigned"),
});

const scheduleSchema = z.object({
  department_id: z.string().min(1),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Format tanggal harus YYYY-MM-DD"),
  session_name: z.string().min(1),
  start_time: z.string().regex(/^\d{2}:\d{2}$/, "Format jam harus HH:mm"),
  end_time: z.string().regex(/^\d{2}:\d{2}$/, "Format jam harus HH:mm"),
  lat: z.number(),
  lng: z.number(),
  radius_m: z.number().positive(),
  trainees: z.array(traineeAssignmentSchema).default([]),
});

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { session, response } = await requireAdminOrResponse();
  if (response) return response;

  const { id } = await params;
  const parsed = scheduleSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Data jadwal tidak valid" },
      { status: 400 }
    );
  }
  const { trainees, ...scheduleData } = parsed.data;

  const existing = await getScheduleById(id);
  if (!existing) {
    return NextResponse.json({ error: "Jadwal tidak ditemukan" }, { status: 404 });
  }
  const forbiddenExisting = assertDepartmentScope(session, existing.department_id);
  if (forbiddenExisting) return forbiddenExisting;
  const forbiddenTarget = assertDepartmentScope(session, scheduleData.department_id);
  if (forbiddenTarget) return forbiddenTarget;

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

  try {
    const schedule = await updateSchedule(id, scheduleData);
    await setAssignmentsForSchedule(id, trainees);
    return NextResponse.json({ schedule: { ...schedule, trainees } });
  } catch {
    return NextResponse.json({ error: "Jadwal tidak ditemukan" }, { status: 404 });
  }
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { session, response } = await requireAdminOrResponse();
  if (response) return response;

  const { id } = await params;
  const existing = await getScheduleById(id);
  if (!existing) {
    return NextResponse.json({ error: "Jadwal tidak ditemukan" }, { status: 404 });
  }
  const forbidden = assertDepartmentScope(session, existing.department_id);
  if (forbidden) return forbidden;

  try {
    await deleteSchedule(id);
    await deleteAssignmentsForSchedule(id);
    return NextResponse.json({ message: "Jadwal dihapus" });
  } catch {
    return NextResponse.json({ error: "Jadwal tidak ditemukan" }, { status: 404 });
  }
}
