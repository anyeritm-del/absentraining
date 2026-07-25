import { listDepartments } from "@/lib/repositories/departments";
import { listTrainees } from "@/lib/repositories/trainees";
import { getJoinedAttendance } from "@/lib/attendanceView";
import AttendanceClient from "./AttendanceClient";

export default async function AttendancePage() {
  const [attendance, departments, trainees] = await Promise.all([
    getJoinedAttendance(),
    listDepartments(),
    listTrainees(),
  ]);

  const sheetId = process.env.GOOGLE_SHEET_ID;
  const sheetUrl = sheetId
    ? `https://docs.google.com/spreadsheets/d/${sheetId}/edit`
    : null;

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">Log Absensi</h1>
      <AttendanceClient
        initialAttendance={attendance}
        departments={departments}
        trainees={trainees}
        sheetUrl={sheetUrl}
      />
    </div>
  );
}
