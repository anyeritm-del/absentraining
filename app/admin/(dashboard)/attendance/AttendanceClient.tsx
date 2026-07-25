"use client";

import { useEffect, useState, useCallback } from "react";
import type { AttendanceView } from "@/lib/attendanceView";
import type { Department } from "@/lib/repositories/departments";
import type { Trainee } from "@/lib/repositories/trainees";

function formatTimestamp(iso: string): string {
  if (!iso) return "-";
  return new Date(iso).toLocaleString("id-ID", {
    timeZone: "Asia/Jakarta",
    dateStyle: "medium",
    timeStyle: "short",
  });
}

export default function AttendanceClient({ sheetUrl }: { sheetUrl: string | null }) {
  const [attendance, setAttendance] = useState<AttendanceView[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [trainees, setTrainees] = useState<Trainee[]>([]);
  const [departmentId, setDepartmentId] = useState("");
  const [date, setDate] = useState("");
  const [traineeId, setTraineeId] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    async function loadFilters() {
      const [deptRes, traineeRes] = await Promise.all([
        fetch("/api/departments"),
        fetch("/api/trainees"),
      ]);
      const [deptData, traineeData] = await Promise.all([
        deptRes.json(),
        traineeRes.json(),
      ]);
      if (deptRes.ok) setDepartments(deptData.departments);
      if (traineeRes.ok) setTrainees(traineeData.trainees);
    }
     
    loadFilters();
  }, []);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (departmentId) params.set("department_id", departmentId);
      if (date) params.set("date", date);
      if (traineeId) params.set("trainee_id", traineeId);
      const res = await fetch(`/api/attendance?${params.toString()}`);
      const data = await res.json();
      if (res.ok) setAttendance(data.attendance);
    } finally {
      setLoading(false);
    }
  }, [departmentId, date, traineeId]);

  useEffect(() => {
    // Refetch whenever a filter changes — not the setState-loop pattern this rule
    // guards against, since fetchData never updates its own deps (the filters).
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchData();
  }, [fetchData]);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-end gap-3 rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
        <div>
          <label className="mb-1 block text-xs font-medium text-zinc-700 dark:text-zinc-300">
            Department
          </label>
          <select
            value={departmentId}
            onChange={(e) => setDepartmentId(e.target.value)}
            className="rounded-md border border-zinc-300 px-3 py-1.5 text-sm dark:border-zinc-700 dark:bg-zinc-800"
          >
            <option value="">Semua</option>
            {departments.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-zinc-700 dark:text-zinc-300">
            Tanggal
          </label>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="rounded-md border border-zinc-300 px-3 py-1.5 text-sm dark:border-zinc-700 dark:bg-zinc-800"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-zinc-700 dark:text-zinc-300">
            Anak Training
          </label>
          <select
            value={traineeId}
            onChange={(e) => setTraineeId(e.target.value)}
            className="rounded-md border border-zinc-300 px-3 py-1.5 text-sm dark:border-zinc-700 dark:bg-zinc-800"
          >
            <option value="">Semua</option>
            {trainees.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>
        </div>
        {(departmentId || date || traineeId) && (
          <button
            onClick={() => {
              setDepartmentId("");
              setDate("");
              setTraineeId("");
            }}
            className="rounded-md border border-zinc-300 px-3 py-1.5 text-sm text-zinc-600 dark:border-zinc-700 dark:text-zinc-300"
          >
            Reset Filter
          </button>
        )}
        {sheetUrl && (
          <a
            href={sheetUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="ml-auto text-sm text-zinc-600 underline dark:text-zinc-300"
          >
            Buka Google Sheet
          </a>
        )}
      </div>

      <div className="overflow-x-auto rounded-xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-zinc-200 text-left text-zinc-500 dark:border-zinc-800">
              <th className="px-4 py-3 font-medium">Waktu</th>
              <th className="px-4 py-3 font-medium">Nama</th>
              <th className="px-4 py-3 font-medium">Department</th>
              <th className="px-4 py-3 font-medium">Sesi</th>
              <th className="px-4 py-3 font-medium">Tipe</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium">Jarak</th>
              <th className="px-4 py-3 font-medium">Foto</th>
            </tr>
          </thead>
          <tbody>
            {attendance.map((a) => (
              <tr key={a.id} className="border-b border-zinc-100 last:border-0 dark:border-zinc-800">
                <td className="px-4 py-3 whitespace-nowrap text-zinc-500">
                  {formatTimestamp(a.timestamp)}
                </td>
                <td className="px-4 py-3 font-medium text-zinc-900 dark:text-zinc-50">
                  {a.trainee_name}
                </td>
                <td className="px-4 py-3 text-zinc-500">{a.department_name}</td>
                <td className="px-4 py-3 text-zinc-500">{a.schedule_session_name}</td>
                <td className="px-4 py-3">
                  {a.type === "clock_in" ? "Masuk" : "Pulang"}
                </td>
                <td className="px-4 py-3">
                  {a.status === "late" && (
                    <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs text-amber-700 dark:bg-amber-950 dark:text-amber-400">
                      Terlambat
                    </span>
                  )}
                  {a.status === "on_time" && (
                    <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs text-green-700 dark:bg-green-950 dark:text-green-400">
                      Tepat Waktu
                    </span>
                  )}
                </td>
                <td className="px-4 py-3 text-zinc-500">{a.distance_m}m</td>
                <td className="px-4 py-3">
                  {a.photo_file_id ? (
                    <a
                      href={`/api/photo/${a.photo_file_id}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-zinc-600 underline dark:text-zinc-300"
                    >
                      Lihat
                    </a>
                  ) : (
                    "-"
                  )}
                </td>
              </tr>
            ))}
            {attendance.length === 0 && !loading && (
              <tr>
                <td colSpan={8} className="px-4 py-6 text-center text-zinc-400">
                  Belum ada data absensi.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
