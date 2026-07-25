import { listSchedules } from "@/lib/repositories/schedules";
import { listDepartments } from "@/lib/repositories/departments";
import SchedulesClient from "./SchedulesClient";

export default async function SchedulesPage() {
  const [schedules, departments] = await Promise.all([
    listSchedules(),
    listDepartments(),
  ]);

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">Jadwal Training</h1>
      <SchedulesClient initialSchedules={schedules} departments={departments} />
    </div>
  );
}
