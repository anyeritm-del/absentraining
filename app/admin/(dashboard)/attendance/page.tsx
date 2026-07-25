import AttendanceClient from "./AttendanceClient";

export default function AttendancePage() {
  const sheetId = process.env.GOOGLE_SHEET_ID;
  const sheetUrl = sheetId
    ? `https://docs.google.com/spreadsheets/d/${sheetId}/edit`
    : null;

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">Log Absensi</h1>
      <AttendanceClient sheetUrl={sheetUrl} />
    </div>
  );
}
