import { NextResponse } from "next/server";
import { requireAdminOrResponse } from "@/lib/session";
import { listTrainees } from "@/lib/repositories/trainees";
import { listDepartments } from "@/lib/repositories/departments";
import { listSchedules } from "@/lib/repositories/schedules";
import { listScheduleAssignments } from "@/lib/repositories/scheduleAssignments";
import { listAttendance } from "@/lib/repositories/attendance";

export const dynamic = "force-dynamic";

export interface TraineeAttendanceSummary {
  trainee_id: string;
  trainee_name: string;
  department_id: string;
  department_name: string;
  total_sessions: number;
  present: number;
  late: number;
  excused: number;
  absent: number;
  attendance_rate: number; // 0-100
}

export async function GET(req: Request) {
  const { session, response } = await requireAdminOrResponse();
  if (response) return response;

  const url = new URL(req.url);
  const startDate = url.searchParams.get("start_date");
  const endDate = url.searchParams.get("end_date");
  const requestedDepartmentId = url.searchParams.get("department_id");
  if (!startDate || !endDate) {
    return NextResponse.json(
      { error: "start_date dan end_date wajib diisi" },
      { status: 400 }
    );
  }
  const departmentId =
    session.role === "full_access" ? requestedDepartmentId : session.departmentId;

  const [trainees, departments, schedules, assignments, attendance] = await Promise.all([
    listTrainees(),
    listDepartments(),
    listSchedules(),
    listScheduleAssignments(),
    listAttendance(),
  ]);

  const departmentMap = new Map(departments.map((d) => [d.id, d]));
  const schedulesInRange = schedules.filter(
    (s) => s.date >= startDate && s.date <= endDate
  );
  const scheduleIdsInRange = new Set(schedulesInRange.map((s) => s.id));

  const scopedTrainees = trainees.filter((t) => {
    if (departmentId && t.department_id !== departmentId) return false;
    return true;
  });

  const summaries: TraineeAttendanceSummary[] = scopedTrainees
    .map((trainee) => {
      const traineeAssignments = assignments.filter(
        (a) => a.trainee_id === trainee.id && scheduleIdsInRange.has(a.schedule_id)
      );

      let present = 0;
      let late = 0;
      let excused = 0;
      for (const assignment of traineeAssignments) {
        const clockIn = attendance.find(
          (a) =>
            a.trainee_id === trainee.id &&
            a.schedule_id === assignment.schedule_id &&
            a.type === "clock_in"
        );
        if (clockIn) {
          present += 1;
          if (clockIn.status === "late") late += 1;
        } else if (assignment.status === "excused") {
          // Only counts as excused if they actually didn't show up — if an
          // excused trainee attends anyway it just counts as present.
          excused += 1;
        }
      }

      const total_sessions = traineeAssignments.length;
      const required_sessions = total_sessions - excused;
      const absent = Math.max(0, required_sessions - present);
      const attendance_rate =
        required_sessions === 0
          ? 100
          : Math.min(100, Math.round((present / required_sessions) * 100));

      return {
        trainee_id: trainee.id,
        trainee_name: trainee.name,
        department_id: trainee.department_id,
        department_name: departmentMap.get(trainee.department_id)?.name ?? "-",
        total_sessions,
        present,
        late,
        excused,
        absent,
        attendance_rate,
      };
    })
    .filter((s) => s.total_sessions > 0)
    .sort((a, b) => a.trainee_name.localeCompare(b.trainee_name));

  return NextResponse.json({ summaries });
}
