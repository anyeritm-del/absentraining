import SchedulesClient from "./SchedulesClient";

export default function SchedulesPage() {
  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">Jadwal Training</h1>
      <SchedulesClient />
    </div>
  );
}
