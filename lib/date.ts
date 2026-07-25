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
