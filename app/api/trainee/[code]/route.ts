import { NextResponse } from "next/server";
import { getTraineeByCode } from "@/lib/repositories/trainees";
import { getDepartmentById } from "@/lib/repositories/departments";
import { getSchedulesForDepartmentOnDate } from "@/lib/repositories/schedules";
import { getAttendanceForTraineeSchedule } from "@/lib/repositories/attendance";
import { todayInJakarta } from "@/lib/date";


export const dynamic = "force-dynamic";
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ code: string }> }
) {
  const { code } = await params;
  const trainee = await getTraineeByCode(code);
  if (!trainee || trainee.status !== "active") {
    return NextResponse.json({ error: "Kode absen tidak valid" }, { status: 404 });
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
    trainee: { id: trainee.id, name: trainee.name, code: trainee.code },
    department: department ? { id: department.id, name: department.name } : null,
    schedules: schedulesWithStatus,
  });
}
