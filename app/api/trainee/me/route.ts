import { NextResponse } from "next/server";
import { z } from "zod";
import { verifyGoogleIdToken } from "@/lib/googleIdToken";
import { getTraineeByEmail } from "@/lib/repositories/trainees";
import { getDepartmentById } from "@/lib/repositories/departments";
import { getSchedulesForDepartmentOnDate, listSchedules } from "@/lib/repositories/schedules";
import { getAttendanceForTrainee } from "@/lib/repositories/attendance";
import { getAssignmentsForTrainee } from "@/lib/repositories/scheduleAssignments";
import { todayInJakarta } from "@/lib/date";

export const dynamic = "force-dynamic";

const HISTORY_LIMIT = 30;

const bodySchema = z.object({
  google_id_token: z.string().min(1),
});

export async function POST(req: Request) {
  const parsed = bodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Sign in dengan Google terlebih dahulu" }, { status: 400 });
  }

  const email = await verifyGoogleIdToken(parsed.data.google_id_token);
  if (!email) {
    return NextResponse.json({ error: "Sesi Google tidak valid, silakan sign in ulang" }, { status: 401 });
  }

  const trainee = await getTraineeByEmail(email);
  if (!trainee || trainee.status !== "active") {
    return NextResponse.json(
      { error: `Email ${email} belum terdaftar sebagai anak training. Hubungi admin.` },
      { status: 404 }
    );
  }

  const today = todayInJakarta();
  const [department, todaysDeptSchedules, myAssignments, myAttendance] = await Promise.all([
    getDepartmentById(trainee.department_id),
    getSchedulesForDepartmentOnDate(trainee.department_id, today),
    getAssignmentsForTrainee(trainee.id),
    getAttendanceForTrainee(trainee.id),
  ]);

  const assignmentByScheduleId = new Map(myAssignments.map((a) => [a.schedule_id, a]));
  const todaySchedules = todaysDeptSchedules.filter((s) => assignmentByScheduleId.has(s.id));

  const schedulesWithStatus = todaySchedules.map((schedule) => {
    const clockIn = myAttendance.find(
      (a) => a.schedule_id === schedule.id && a.type === "clock_in"
    );
    const clockOut = myAttendance.find(
      (a) => a.schedule_id === schedule.id && a.type === "clock_out"
    );
    return {
      schedule,
      assignmentStatus: assignmentByScheduleId.get(schedule.id)?.status ?? "assigned",
      clockedInAt: clockIn?.timestamp ?? null,
      clockInStatus: clockIn?.status ?? null,
      clockedOutAt: clockOut?.timestamp ?? null,
    };
  });

  // Personal history: every schedule this trainee was ever assigned to,
  // regardless of department (in case they've moved), most recent first.
  const allSchedules = await listSchedules();
  const scheduleById = new Map(allSchedules.map((s) => [s.id, s]));
  const history = myAssignments
    .map((assignment) => {
      const schedule = scheduleById.get(assignment.schedule_id);
      if (!schedule) return null;
      const clockIn = myAttendance.find(
        (a) => a.schedule_id === schedule.id && a.type === "clock_in"
      );
      const clockOut = myAttendance.find(
        (a) => a.schedule_id === schedule.id && a.type === "clock_out"
      );
      return {
        date: schedule.date,
        session_name: schedule.session_name,
        assignmentStatus: assignment.status,
        clockedInAt: clockIn?.timestamp ?? null,
        clockInStatus: clockIn?.status ?? null,
        clockedOutAt: clockOut?.timestamp ?? null,
      };
    })
    .filter((h): h is NonNullable<typeof h> => h !== null && h.date <= today)
    .sort((a, b) => (a.date < b.date ? 1 : -1))
    .slice(0, HISTORY_LIMIT);

  return NextResponse.json({
    trainee: { id: trainee.id, name: trainee.name, email: trainee.email },
    department: department ? { id: department.id, name: department.name } : null,
    schedules: schedulesWithStatus,
    history,
  });
}
