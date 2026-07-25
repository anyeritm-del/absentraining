"use client";

import { useCallback, useEffect, useState } from "react";
import type { Department } from "@/lib/repositories/departments";
import type { TraineeAttendanceSummary } from "@/app/api/reports/attendance-summary/route";
import { todayInJakarta } from "@/lib/date";
import AttendanceChart from "./AttendanceChart";

function firstDayOfCurrentMonth(): string {
  const today = todayInJakarta();
  const [y, m] = today.split("-");
  return `${y}-${m}-01`;
}

function csvEscape(value: string | number): string {
  const str = String(value);
  if (/[",\n]/.test(str)) return `"${str.replace(/"/g, '""')}"`;
  return str;
}

export default function ReportsClient() {
  const [departments, setDepartments] = useState<Department[]>([]);
  const [summaries, setSummaries] = useState<TraineeAttendanceSummary[]>([]);
  const [startDate, setStartDate] = useState(firstDayOfCurrentMonth());
  const [endDate, setEndDate] = useState(todayInJakarta());
  const [departmentId, setDepartmentId] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/departments")
      .then((res) => res.json())
      .then((data) => setDepartments(data.departments ?? []))
      .catch(() => {});
  }, []);

  const fetchSummaries = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ start_date: startDate, end_date: endDate });
      if (departmentId) params.set("department_id", departmentId);
      const res = await fetch(`/api/reports/attendance-summary?${params.toString()}`);
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Gagal memuat report");
        return;
      }
      setSummaries(data.summaries);
    } catch {
      setError("Terjadi kesalahan jaringan");
    } finally {
      setLoading(false);
    }
  }, [startDate, endDate, departmentId]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchSummaries();
  }, [fetchSummaries]);

  function exportCsv() {
    const headers = [
      "Nama",
      "Department",
      "Total Sesi",
      "Hadir",
      "Terlambat",
      "Izin",
      "Tidak Hadir",
      "Persentase Kehadiran",
    ];
    const rows = summaries.map((s) => [
      s.trainee_name,
      s.department_name,
      s.total_sessions,
      s.present,
      s.late,
      s.excused,
      s.absent,
      `${s.attendance_rate}%`,
    ]);
    const csv = [headers, ...rows]
      .map((row) => row.map(csvEscape).join(","))
      .join("\n");
    const blob = new Blob([`﻿${csv}`], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `rekap-kehadiran_${startDate}_${endDate}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  const totals = summaries.reduce(
    (acc, s) => ({
      total_sessions: acc.total_sessions + s.total_sessions,
      present: acc.present + s.present,
      late: acc.late + s.late,
      excused: acc.excused + s.excused,
      absent: acc.absent + s.absent,
    }),
    { total_sessions: 0, present: 0, late: 0, excused: 0, absent: 0 }
  );
  const totalRequired = totals.total_sessions - totals.excused;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-end gap-3 rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
        <div>
          <label className="mb-1 block text-xs font-medium text-zinc-700 dark:text-zinc-300">
            Dari Tanggal
          </label>
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="rounded-md border border-zinc-300 px-3 py-1.5 text-sm dark:border-zinc-700 dark:bg-zinc-800"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-zinc-700 dark:text-zinc-300">
            Sampai Tanggal
          </label>
          <input
            type="date"
            value={endDate}
            min={startDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="rounded-md border border-zinc-300 px-3 py-1.5 text-sm dark:border-zinc-700 dark:bg-zinc-800"
          />
        </div>
        {departments.length > 1 && (
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
        )}
        <button
          onClick={exportCsv}
          disabled={summaries.length === 0}
          className="ml-auto rounded-md bg-brand px-4 py-2 text-sm font-medium text-white hover:bg-brand/90 disabled:opacity-50 dark:bg-zinc-50 dark:text-brand"
        >
          Export CSV
        </button>
      </div>

      {error && (
        <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950 dark:text-red-300">
          {error}
        </p>
      )}

      <AttendanceChart summaries={summaries} />

      <div className="overflow-x-auto rounded-xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-zinc-200 text-left text-zinc-500 dark:border-zinc-800">
              <th className="px-4 py-3 font-medium">Nama</th>
              <th className="px-4 py-3 font-medium">Department</th>
              <th className="px-4 py-3 font-medium">Total Sesi</th>
              <th className="px-4 py-3 font-medium">Hadir</th>
              <th className="px-4 py-3 font-medium">Terlambat</th>
              <th className="px-4 py-3 font-medium">Izin</th>
              <th className="px-4 py-3 font-medium">Tidak Hadir</th>
              <th className="px-4 py-3 font-medium">Kehadiran</th>
            </tr>
          </thead>
          <tbody>
            {summaries.map((s) => (
              <tr key={s.trainee_id} className="border-b border-zinc-100 last:border-0 dark:border-zinc-800">
                <td className="px-4 py-3 font-medium text-zinc-900 dark:text-zinc-50">
                  {s.trainee_name}
                </td>
                <td className="px-4 py-3 text-zinc-500">{s.department_name}</td>
                <td className="px-4 py-3 text-zinc-500">{s.total_sessions}</td>
                <td className="px-4 py-3 text-zinc-500">{s.present}</td>
                <td className="px-4 py-3">
                  {s.late > 0 ? (
                    <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs text-amber-700 dark:bg-amber-950 dark:text-amber-400">
                      {s.late}
                    </span>
                  ) : (
                    <span className="text-zinc-400">0</span>
                  )}
                </td>
                <td className="px-4 py-3">
                  {s.excused > 0 ? (
                    <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-xs text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300">
                      {s.excused}
                    </span>
                  ) : (
                    <span className="text-zinc-400">0</span>
                  )}
                </td>
                <td className="px-4 py-3">
                  {s.absent > 0 ? (
                    <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs text-red-700 dark:bg-red-950 dark:text-red-400">
                      {s.absent}
                    </span>
                  ) : (
                    <span className="text-zinc-400">0</span>
                  )}
                </td>
                <td className="px-4 py-3 font-medium text-zinc-900 dark:text-zinc-50">
                  {s.attendance_rate}%
                </td>
              </tr>
            ))}
            {!loading && summaries.length === 0 && (
              <tr>
                <td colSpan={8} className="px-4 py-6 text-center text-zinc-400">
                  Tidak ada data pada periode ini.
                </td>
              </tr>
            )}
            {loading && (
              <tr>
                <td colSpan={8} className="px-4 py-6 text-center text-zinc-400">
                  Memuat...
                </td>
              </tr>
            )}
          </tbody>
          {summaries.length > 0 && (
            <tfoot>
              <tr className="border-t border-zinc-200 font-medium text-zinc-900 dark:border-zinc-800 dark:text-zinc-50">
                <td className="px-4 py-3" colSpan={2}>
                  Total ({summaries.length} anak training)
                </td>
                <td className="px-4 py-3">{totals.total_sessions}</td>
                <td className="px-4 py-3">{totals.present}</td>
                <td className="px-4 py-3">{totals.late}</td>
                <td className="px-4 py-3">{totals.excused}</td>
                <td className="px-4 py-3">{totals.absent}</td>
                <td className="px-4 py-3">
                  {totalRequired === 0
                    ? "-"
                    : `${Math.round((totals.present / totalRequired) * 100)}%`}
                </td>
              </tr>
            </tfoot>
          )}
        </table>
      </div>
    </div>
  );
}
