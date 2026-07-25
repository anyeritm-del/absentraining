import ReportsClient from "./ReportsClient";

export default function ReportsPage() {
  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
          Report Kehadiran
        </h1>
        <p className="text-sm text-zinc-500">
          Rekap kehadiran per anak training dalam periode tertentu.
        </p>
      </div>
      <ReportsClient />
    </div>
  );
}
