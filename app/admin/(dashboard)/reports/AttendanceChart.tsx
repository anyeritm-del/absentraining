import type { TraineeAttendanceSummary } from "@/app/api/reports/attendance-summary/route";

function LegendItem({ colorClass, label }: { colorClass: string; label: string }) {
  return (
    <div className="flex items-center gap-1.5 text-xs text-zinc-500 dark:text-zinc-400">
      <span className={`h-2.5 w-2.5 rounded-sm ${colorClass}`} />
      {label}
    </div>
  );
}

export default function AttendanceChart({
  summaries,
}: {
  summaries: TraineeAttendanceSummary[];
}) {
  if (summaries.length === 0) return null;

  const maxTotal = Math.max(...summaries.map((s) => s.total_sessions), 1);

  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
      <div className="mb-4 flex items-center justify-between">
        <p className="font-medium text-zinc-900 dark:text-zinc-50">Kehadiran per Anak Training</p>
        <div className="flex gap-4">
          <LegendItem colorClass="bg-status-good" label="Tepat Waktu" />
          <LegendItem colorClass="bg-status-warning" label="Terlambat" />
          <LegendItem colorClass="bg-status-critical" label="Tidak Hadir" />
        </div>
      </div>

      <div className="flex flex-col gap-3">
        {summaries.map((s) => {
          const barWidthPct = (s.total_sessions / maxTotal) * 100;
          // present includes late arrivals, so split it into two mutually
          // exclusive segments (on-time, late) that actually sum to the total.
          const onTime = s.present - s.late;
          return (
            <div key={s.trainee_id} className="flex items-center gap-3">
              <p className="w-32 shrink-0 truncate text-sm text-zinc-700 dark:text-zinc-300" title={s.trainee_name}>
                {s.trainee_name}
              </p>
              <div className="h-5 flex-1 rounded-sm bg-zinc-100 dark:bg-zinc-800">
                <div
                  className="flex h-full gap-0.5 overflow-hidden rounded-r-sm"
                  style={{ width: `${barWidthPct}%` }}
                >
                  {onTime > 0 && (
                    <div
                      className="h-full bg-status-good"
                      style={{ flexGrow: onTime }}
                      title={`Hadir tepat waktu: ${onTime}`}
                    />
                  )}
                  {s.late > 0 && (
                    <div
                      className="h-full bg-status-warning"
                      style={{ flexGrow: s.late }}
                      title={`Terlambat: ${s.late}`}
                    />
                  )}
                  {s.absent > 0 && (
                    <div
                      className="h-full bg-status-critical"
                      style={{ flexGrow: s.absent }}
                      title={`Tidak Hadir: ${s.absent}`}
                    />
                  )}
                </div>
              </div>
              <p className="w-12 shrink-0 text-right text-sm tabular-nums text-zinc-900 dark:text-zinc-50">
                {s.attendance_rate}%
              </p>
            </div>
          );
        })}
      </div>

      <p className="mt-4 text-xs text-zinc-400">
        Panjang bar sebanding dengan jumlah sesi terhadap anak training tersibuk. Angka detail
        ada di tabel di bawah.
      </p>
    </div>
  );
}
