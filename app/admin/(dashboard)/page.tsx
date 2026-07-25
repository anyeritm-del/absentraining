"use client";

import { useEffect, useState } from "react";
import type { Department } from "@/lib/repositories/departments";
import type { Trainee } from "@/lib/repositories/trainees";
import type { Schedule } from "@/lib/repositories/schedules";
import type { AttendanceRecord } from "@/lib/repositories/attendance";
import { todayInJakarta } from "@/lib/date";
import AbsenLinkCard from "@/components/AbsenLinkCard";

function StatCard({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
      <p className="text-sm text-zinc-500">{label}</p>
      <p className="mt-1 text-2xl font-semibold text-zinc-900 dark:text-zinc-50">{value}</p>
    </div>
  );
}

export default function DashboardPage() {
  const [loading, setLoading] = useState(true);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [trainees, setTrainees] = useState<Trainee[]>([]);
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);

  useEffect(() => {
    async function load() {
      setLoading(true);
      const [depRes, traineeRes, scheduleRes, attendanceRes] = await Promise.all([
        fetch("/api/departments"),
        fetch("/api/trainees"),
        fetch("/api/schedules"),
        fetch("/api/attendance"),
      ]);
      const [depData, traineeData, scheduleData, attendanceData] = await Promise.all([
        depRes.json(),
        traineeRes.json(),
        scheduleRes.json(),
        attendanceRes.json(),
      ]);
      setDepartments(depData.departments ?? []);
      setTrainees(traineeData.trainees ?? []);
      setSchedules(scheduleData.schedules ?? []);
      setAttendance(attendanceData.attendance ?? []);
      setLoading(false);
    }
     
    load();
  }, []);

  const today = todayInJakarta();
  const todaySchedules = schedules.filter((s) => s.date === today);
  const todayScheduleIds = new Set(todaySchedules.map((s) => s.id));
  const activeTrainees = trainees.filter((t) => t.status === "active");
  const todayClockIns = attendance.filter(
    (a) => a.type === "clock_in" && todayScheduleIds.has(a.schedule_id)
  );
  const todayLate = todayClockIns.filter((a) => a.status === "late");

  if (loading) {
    return <p className="text-sm text-zinc-500">Memuat...</p>;
  }

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

      <AbsenLinkCard />

      {todaySchedules.length === 0 && (
        <p className="text-sm text-zinc-500">
          Belum ada jadwal training untuk hari ini. Buat jadwal baru di menu Jadwal.
        </p>
      )}
    </div>
  );
}
