"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import type { Schedule } from "@/lib/repositories/schedules";
import type { Department } from "@/lib/repositories/departments";
import type { Trainee } from "@/lib/repositories/trainees";
import type { Location } from "@/lib/repositories/locations";
import SchedulesCalendar from "./SchedulesCalendar";

type ScheduleWithAssignments = Schedule & { trainee_ids: string[] };

interface FormState {
  department_id: string;
  start_date: string;
  end_date: string;
  session_name: string;
  start_time: string;
  end_time: string;
  location_id: string;
  trainee_ids: string[];
}

const EMPTY_FORM: FormState = {
  department_id: "",
  start_date: "",
  end_date: "",
  session_name: "",
  start_time: "",
  end_time: "",
  location_id: "",
  trainee_ids: [],
};

export default function SchedulesClient() {
  const [schedules, setSchedules] = useState<ScheduleWithAssignments[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [trainees, setTrainees] = useState<Trainee[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [loadingList, setLoadingList] = useState(true);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoadingList(true);
    const [scheduleRes, deptRes, traineeRes, locationRes] = await Promise.all([
      fetch("/api/schedules"),
      fetch("/api/departments"),
      fetch("/api/trainees"),
      fetch("/api/locations"),
    ]);
    const [scheduleData, deptData, traineeData, locationData] = await Promise.all([
      scheduleRes.json(),
      deptRes.json(),
      traineeRes.json(),
      locationRes.json(),
    ]);
    if (scheduleRes.ok) setSchedules(scheduleData.schedules);
    if (deptRes.ok) setDepartments(deptData.departments);
    if (traineeRes.ok) setTrainees(traineeData.trainees);
    if (locationRes.ok) setLocations(locationData.locations);
    setLoadingList(false);
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchData();
  }, [fetchData]);

  const departmentName = (id: string) =>
    departments.find((d) => d.id === id)?.name ?? "-";

  const traineesInDepartment = (departmentId: string) =>
    trainees.filter((t) => t.department_id === departmentId);

  function traineeNames(ids: string[]): string {
    if (ids.length === 0) return "Belum ada";
    return ids
      .map((id) => trainees.find((t) => t.id === id)?.name ?? "?")
      .join(", ");
  }

  function findMatchingLocationId(schedule: Schedule): string {
    const match = locations.find(
      (l) => l.lat === schedule.lat && l.lng === schedule.lng && l.radius_m === schedule.radius_m
    );
    return match?.id ?? "";
  }

  function startEdit(schedule: ScheduleWithAssignments) {
    setEditingId(schedule.id);
    setForm({
      department_id: schedule.department_id,
      start_date: schedule.date,
      end_date: schedule.date,
      session_name: schedule.session_name,
      start_time: schedule.start_time,
      end_time: schedule.end_time,
      location_id: findMatchingLocationId(schedule),
      trainee_ids: schedule.trainee_ids,
    });
  }

  function resetForm() {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setError(null);
  }

  function toggleTrainee(id: string) {
    setForm((f) => ({
      ...f,
      trainee_ids: f.trainee_ids.includes(id)
        ? f.trainee_ids.filter((t) => t !== id)
        : [...f.trainee_ids, id],
    }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.department_id) {
      setError("Pilih department terlebih dahulu");
      return;
    }
    const location = locations.find((l) => l.id === form.location_id);
    if (!location) {
      setError("Pilih lokasi training terlebih dahulu");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const basePayload = {
        department_id: form.department_id,
        session_name: form.session_name,
        start_time: form.start_time,
        end_time: form.end_time,
        lat: location.lat,
        lng: location.lng,
        radius_m: location.radius_m,
        trainee_ids: form.trainee_ids,
      };
      const payload = editingId
        ? { ...basePayload, date: form.start_date }
        : { ...basePayload, start_date: form.start_date, end_date: form.end_date || form.start_date };

      const res = await fetch(
        editingId ? `/api/schedules/${editingId}` : "/api/schedules",
        {
          method: editingId ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        }
      );
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Gagal menyimpan jadwal");
        return;
      }
      resetForm();
      await fetchData();
    } catch {
      setError("Terjadi kesalahan jaringan");
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Hapus jadwal ini?")) return;
    const res = await fetch(`/api/schedules/${id}`, { method: "DELETE" });
    if (res.ok) await fetchData();
  }

  const sorted = [...schedules]
    .filter((s) => !selectedDate || s.date === selectedDate)
    .sort((a, b) => (a.date < b.date ? 1 : -1));
  const formTrainees = traineesInDepartment(form.department_id);

  return (
    <div className="flex flex-col gap-6">
      <form
        onSubmit={handleSubmit}
        className="grid grid-cols-1 gap-3 rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900 sm:grid-cols-2 lg:grid-cols-4"
      >
        <div>
          <label className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
            Department
          </label>
          <select
            required
            value={form.department_id}
            onChange={(e) =>
              setForm({ ...form, department_id: e.target.value, trainee_ids: [] })
            }
            className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-zinc-500 dark:border-zinc-700 dark:bg-zinc-800"
          >
            <option value="">Pilih...</option>
            {departments.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
            {editingId ? "Tanggal" : "Tanggal Mulai"}
          </label>
          <input
            type="date"
            required
            value={form.start_date}
            onChange={(e) => setForm({ ...form, start_date: e.target.value })}
            className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-zinc-500 dark:border-zinc-700 dark:bg-zinc-800"
          />
        </div>
        {!editingId && (
          <div>
            <label className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
              Tanggal Selesai
            </label>
            <input
              type="date"
              placeholder="Sama dengan tanggal mulai jika kosong"
              value={form.end_date}
              min={form.start_date || undefined}
              onChange={(e) => setForm({ ...form, end_date: e.target.value })}
              className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-zinc-500 dark:border-zinc-700 dark:bg-zinc-800"
            />
            <p className="mt-1 text-xs text-zinc-400">
              Kosongkan jika cuma 1 hari. Isi untuk buat jadwal yang sama tiap hari dalam rentang ini.
            </p>
          </div>
        )}
        <div>
          <label className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
            Nama Sesi
          </label>
          <input
            required
            placeholder="Sesi Pagi"
            value={form.session_name}
            onChange={(e) => setForm({ ...form, session_name: e.target.value })}
            className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-zinc-500 dark:border-zinc-700 dark:bg-zinc-800"
          />
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
              Jam Mulai
            </label>
            <input
              type="time"
              required
              value={form.start_time}
              onChange={(e) => setForm({ ...form, start_time: e.target.value })}
              className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-zinc-500 dark:border-zinc-700 dark:bg-zinc-800"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
              Jam Selesai
            </label>
            <input
              type="time"
              required
              value={form.end_time}
              onChange={(e) => setForm({ ...form, end_time: e.target.value })}
              className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-zinc-500 dark:border-zinc-700 dark:bg-zinc-800"
            />
          </div>
        </div>

        <div className="lg:col-span-4">
          <label className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
            Lokasi Training
          </label>
          {locations.length === 0 ? (
            <p className="text-sm text-zinc-400">
              Belum ada lokasi tersimpan.{" "}
              <Link href="/admin/locations" className="underline">
                Buat lokasi dulu di menu Lokasi
              </Link>
              .
            </p>
          ) : (
            <select
              required
              value={form.location_id}
              onChange={(e) => setForm({ ...form, location_id: e.target.value })}
              className="w-full max-w-sm rounded-md border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-zinc-500 dark:border-zinc-700 dark:bg-zinc-800"
            >
              <option value="">Pilih lokasi...</option>
              {locations.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.name} (radius {l.radius_m}m)
                </option>
              ))}
            </select>
          )}
        </div>

        <div className="lg:col-span-4">
          <label className="mb-2 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
            Anak Training di Sesi Ini
          </label>
          {!form.department_id && (
            <p className="text-sm text-zinc-400">Pilih department dulu.</p>
          )}
          {form.department_id && formTrainees.length === 0 && (
            <p className="text-sm text-zinc-400">
              Belum ada anak training di department ini.
            </p>
          )}
          {formTrainees.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {formTrainees.map((t) => {
                const checked = form.trainee_ids.includes(t.id);
                return (
                  <label
                    key={t.id}
                    className={`cursor-pointer rounded-full border px-3 py-1.5 text-sm ${
                      checked
                        ? "border-zinc-900 bg-zinc-900 text-white dark:border-zinc-50 dark:bg-zinc-50 dark:text-zinc-900"
                        : "border-zinc-300 text-zinc-600 dark:border-zinc-700 dark:text-zinc-300"
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => toggleTrainee(t.id)}
                      className="hidden"
                    />
                    {t.name}
                  </label>
                );
              })}
            </div>
          )}
        </div>

        <div className="flex items-end gap-2 lg:col-span-4">
          <button
            type="submit"
            disabled={loading}
            className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700 disabled:opacity-50 dark:bg-zinc-50 dark:text-zinc-900"
          >
            {editingId ? "Simpan" : "Tambah Jadwal"}
          </button>
          {editingId && (
            <button
              type="button"
              onClick={resetForm}
              className="rounded-md border border-zinc-300 px-4 py-2 text-sm dark:border-zinc-700"
            >
              Batal
            </button>
          )}
        </div>
      </form>

      {error && (
        <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950 dark:text-red-300">
          {error}
        </p>
      )}

      <SchedulesCalendar
        schedules={schedules}
        selectedDate={selectedDate}
        onSelectDate={setSelectedDate}
      />

      <div className="overflow-x-auto rounded-xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-zinc-200 text-left text-zinc-500 dark:border-zinc-800">
              <th className="px-4 py-3 font-medium">Tanggal</th>
              <th className="px-4 py-3 font-medium">Department</th>
              <th className="px-4 py-3 font-medium">Sesi</th>
              <th className="px-4 py-3 font-medium">Jam</th>
              <th className="px-4 py-3 font-medium">Anak Training</th>
              <th className="px-4 py-3 font-medium"></th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((schedule) => (
              <tr
                key={schedule.id}
                className="border-b border-zinc-100 last:border-0 dark:border-zinc-800"
              >
                <td className="px-4 py-3 font-medium text-zinc-900 dark:text-zinc-50">
                  {schedule.date}
                </td>
                <td className="px-4 py-3 text-zinc-500">
                  {departmentName(schedule.department_id)}
                </td>
                <td className="px-4 py-3 text-zinc-500">{schedule.session_name}</td>
                <td className="px-4 py-3 text-zinc-500">
                  {schedule.start_time}–{schedule.end_time}
                </td>
                <td className="px-4 py-3 text-zinc-500">
                  {traineeNames(schedule.trainee_ids)}
                </td>
                <td className="px-4 py-3 text-right whitespace-nowrap">
                  <button
                    onClick={() => startEdit(schedule)}
                    className="mr-3 text-zinc-600 hover:underline dark:text-zinc-300"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleDelete(schedule.id)}
                    className="text-red-600 hover:underline"
                  >
                    Hapus
                  </button>
                </td>
              </tr>
            ))}
            {!loadingList && sorted.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-6 text-center text-zinc-400">
                  {selectedDate ? `Tidak ada jadwal di ${selectedDate}.` : "Belum ada jadwal."}
                </td>
              </tr>
            )}
            {loadingList && (
              <tr>
                <td colSpan={6} className="px-4 py-6 text-center text-zinc-400">
                  Memuat...
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
