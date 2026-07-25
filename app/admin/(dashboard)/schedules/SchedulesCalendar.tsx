"use client";

import { useMemo, useState } from "react";
import { todayInJakarta } from "@/lib/date";

interface CalendarSchedule {
  id: string;
  date: string;
  session_name: string;
}

const WEEKDAY_LABELS = ["Sen", "Sel", "Rab", "Kam", "Jum", "Sab", "Min"];

function formatDateKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function getMonthGrid(year: number, month: number): (Date | null)[] {
  const firstOfMonth = new Date(year, month, 1);
  const startWeekday = (firstOfMonth.getDay() + 6) % 7; // Monday = 0
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells: (Date | null)[] = [];
  for (let i = 0; i < startWeekday; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(new Date(year, month, d));
  while (cells.length % 7 !== 0) cells.push(null);
  return cells;
}

export default function SchedulesCalendar({
  schedules,
  selectedDate,
  onSelectDate,
}: {
  schedules: CalendarSchedule[];
  selectedDate: string | null;
  onSelectDate: (date: string | null) => void;
}) {
  const [cursor, setCursor] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });

  const schedulesByDate = useMemo(() => {
    const map = new Map<string, CalendarSchedule[]>();
    for (const s of schedules) {
      const list = map.get(s.date) ?? [];
      list.push(s);
      map.set(s.date, list);
    }
    return map;
  }, [schedules]);

  const cells = useMemo(
    () => getMonthGrid(cursor.getFullYear(), cursor.getMonth()),
    [cursor]
  );
  const today = todayInJakarta();
  const monthLabel = cursor.toLocaleDateString("id-ID", { month: "long", year: "numeric" });

  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
      <div className="mb-3 flex items-center justify-between">
        <button
          type="button"
          onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() - 1, 1))}
          className="rounded-md border border-zinc-300 px-2 py-1 text-sm text-zinc-600 hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
        >
          ‹
        </button>
        <p className="text-sm font-medium capitalize text-zinc-900 dark:text-zinc-50">
          {monthLabel}
        </p>
        <button
          type="button"
          onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1))}
          className="rounded-md border border-zinc-300 px-2 py-1 text-sm text-zinc-600 hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
        >
          ›
        </button>
      </div>

      <div className="grid grid-cols-7 gap-1 text-center text-xs text-zinc-400">
        {WEEKDAY_LABELS.map((label) => (
          <div key={label} className="py-1">
            {label}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-1">
        {cells.map((date, i) => {
          if (!date) return <div key={i} />;
          const key = formatDateKey(date);
          const daySchedules = schedulesByDate.get(key) ?? [];
          const isToday = key === today;
          const isSelected = key === selectedDate;
          return (
            <button
              type="button"
              key={key}
              onClick={() => onSelectDate(isSelected ? null : key)}
              className={`flex min-h-[3.5rem] flex-col items-center gap-0.5 rounded-md border p-1 text-sm ${
                isSelected
                  ? "border-zinc-900 bg-zinc-900 text-white dark:border-zinc-50 dark:bg-zinc-50 dark:text-zinc-900"
                  : isToday
                    ? "border-zinc-400 bg-zinc-50 text-zinc-900 dark:border-zinc-500 dark:bg-zinc-800 dark:text-zinc-50"
                    : "border-transparent text-zinc-700 hover:bg-zinc-50 dark:text-zinc-300 dark:hover:bg-zinc-800"
              }`}
            >
              <span>{date.getDate()}</span>
              {daySchedules.length > 0 && (
                <span
                  className={`rounded-full px-1.5 text-[10px] ${
                    isSelected
                      ? "bg-white/20"
                      : "bg-zinc-200 text-zinc-600 dark:bg-zinc-700 dark:text-zinc-300"
                  }`}
                >
                  {daySchedules.length}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {selectedDate && (
        <button
          type="button"
          onClick={() => onSelectDate(null)}
          className="mt-3 text-xs text-zinc-400 underline"
        >
          Tampilkan semua tanggal
        </button>
      )}
    </div>
  );
}
