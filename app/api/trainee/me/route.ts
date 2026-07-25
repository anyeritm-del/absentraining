import { NextResponse } from "next/server";
import { z } from "zod";
import { verifyGoogleIdToken } from "@/lib/googleIdToken";
import { getTraineeByEmail } from "@/lib/repositories/trainees";
import { getDepartmentById } from "@/lib/repositories/departments";
import { getSchedulesForDepartmentOnDate } from "@/lib/repositories/schedules";
import { getAttendanceForTraineeSchedule } from "@/lib/repositories/attendance";
import { todayInJakarta } from "@/lib/date";

export const dynamic = "force-dynamic";

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

  const [department, schedules] = await Promise.all([
    getDepartmentById(trainee.department_id),
    getSchedulesForDepartmentOnDate(trainee.department_id, todayInJakarta()),
  ]);

  const schedulesWithStatus = await Promise.all(
    schedules.map(async (schedule) => {
      const records = await getAttendanceForTraineeSchedule(trainee.id, schedule.id);
      const clockIn = records.find((r) => r.type === "clock_in") ?? null;
      const clockOut = records.find((r) => r.type === "clock_out") ?? null;
      return {
        schedule,
        clockedInAt: clockIn?.timestamp ?? null,
        clockInStatus: clockIn?.status ?? null,
        clockedOutAt: clockOut?.timestamp ?? null,
      };
    })
  );

  return NextResponse.json({
    trainee: { id: trainee.id, name: trainee.name, email: trainee.email },
    department: department ? { id: department.id, name: department.name } : null,
    schedules: schedulesWithStatus,
  });
}
