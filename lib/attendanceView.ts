import { listAttendance, AttendanceRecord } from "./repositories/attendance";
import { listTrainees } from "./repositories/trainees";
import { listSchedules } from "./repositories/schedules";
import { listDepartments } from "./repositories/departments";

export interface AttendanceView extends AttendanceRecord {
  trainee_name: string;
  department_id: string;
  department_name: string;
  schedule_date: string;
  schedule_session_name: string;
}

export interface AttendanceFilters {
  departmentId?: string | null;
  date?: string | null;
  traineeId?: string | null;
}

export async function getJoinedAttendance(
  filters: AttendanceFilters = {}
): Promise<AttendanceView[]> {
  const [attendance, trainees, schedules, departments] = await Promise.all([
    listAttendance(),
    listTrainees(),
    listSchedules(),
    listDepartments(),
  ]);
  const traineeMap = new Map(trainees.map((t) => [t.id, t]));
  const scheduleMap = new Map(schedules.map((s) => [s.id, s]));
  const departmentMap = new Map(departments.map((d) => [d.id, d]));

  let joined: AttendanceView[] = attendance.map((a) => {
    const trainee = traineeMap.get(a.trainee_id);
    const schedule = scheduleMap.get(a.schedule_id);
    const department = trainee ? departmentMap.get(trainee.department_id) : undefined;
    return {
      ...a,
      trainee_name: trainee?.name ?? "(dihapus)",
      department_id: trainee?.department_id ?? "",
      department_name: department?.name ?? "(dihapus)",
      schedule_date: schedule?.date ?? "",
      schedule_session_name: schedule?.session_name ?? "(dihapus)",
    };
  });

  if (filters.departmentId) {
    joined = joined.filter((a) => a.department_id === filters.departmentId);
  }
  if (filters.date) {
    joined = joined.filter((a) => a.schedule_date === filters.date);
  }
  if (filters.traineeId) {
    joined = joined.filter((a) => a.trainee_id === filters.traineeId);
  }

  joined.sort((a, b) => (a.timestamp < b.timestamp ? 1 : -1));
  return joined;
}
