import { listDepartments } from "@/lib/repositories/departments";
import { listTrainees } from "@/lib/repositories/trainees";
import { listSchedules } from "@/lib/repositories/schedules";
import { listAttendance } from "@/lib/repositories/attendance";
import { todayInJakarta } from "@/lib/date";

function StatCard({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
      <p className="text-sm text-zinc-500">{label}</p>
      <p className="mt-1 text-2xl font-semibold text-zinc-900 dark:text-zinc-50">{value}</p>
    </div>
  );
}

export default async function DashboardPage() {
  const [departments, trainees, schedules, attendance] = await Promise.all([
    listDepartments(),
    listTrainees(),
    listSchedules(),
    listAttendance(),
  ]);

  const today = todayInJakarta();
  const todaySchedules = schedules.filter((s) => s.date === today);
  const todayScheduleIds = new Set(todaySchedules.map((s) => s.id));
  const activeTrainees = trainees.filter((t) => t.status === "active");
  const todayClockIns = attendance.filter(
    (a) => a.type === "clock_in" && todayScheduleIds.has(a.schedule_id)
  );
  const todayLate = todayClockIns.filter((a) => a.status === "late");

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">Dashboard</h1>
        <p className="text-sm text-zinc-500">Ringkasan hari ini ({today})</p>
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
        <StatCard label="Department" value={departments.length} />
        <StatCard label="Anak Training Aktif" value={activeTrainees.length} />
        <StatCard label="Jadwal Hari Ini" value={todaySchedules.length} />
        <StatCard label="Sudah Absen Masuk" value={todayClockIns.length} />
        <StatCard label="Terlambat" value={todayLate.length} />
      </div>

      {todaySchedules.length === 0 && (
        <p className="text-sm text-zinc-500">
          Belum ada jadwal training untuk hari ini. Buat jadwal baru di menu Jadwal.
        </p>
      )}
    </div>
  );
}
