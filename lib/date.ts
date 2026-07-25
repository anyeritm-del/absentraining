const TIMEZONE = "Asia/Jakarta";

/** Today's date as YYYY-MM-DD, in Jakarta wall-clock time regardless of server timezone. */
export function todayInJakarta(): string {
  const fmt = new Intl.DateTimeFormat("en-CA", {
    timeZone: TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  return fmt.format(new Date());
}

/** Current time as HH:mm, in Jakarta wall-clock time regardless of server timezone. */
export function nowTimeInJakarta(): string {
  const fmt = new Intl.DateTimeFormat("en-GB", {
    timeZone: TIMEZONE,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
  return fmt.format(new Date());
}

export function minutesSinceMidnight(hhmm: string): number {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
}

const MAX_DATE_RANGE_DAYS = 90;

/** All YYYY-MM-DD dates from startDate to endDate inclusive. Date-only, UTC-based to avoid DST/timezone drift. */
export function enumerateDates(startDate: string, endDate: string): string[] {
  const start = new Date(`${startDate}T00:00:00Z`);
  const end = new Date(`${endDate}T00:00:00Z`);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end < start) {
    return [];
  }
  const dates: string[] = [];
  const cursor = new Date(start);
  while (cursor <= end && dates.length < MAX_DATE_RANGE_DAYS) {
    dates.push(cursor.toISOString().slice(0, 10));
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }
  return dates;
}
