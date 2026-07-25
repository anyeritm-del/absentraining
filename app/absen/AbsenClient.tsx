"use client";

import { useState } from "react";
import CameraCapture from "@/components/CameraCapture";
import GoogleSignInButton from "@/components/GoogleSignInButton";

interface ScheduleInfo {
  id: string;
  date: string;
  session_name: string;
  start_time: string;
  end_time: string;
}

interface ScheduleStatus {
  schedule: ScheduleInfo;
  assignmentStatus: "assigned" | "excused";
  clockedInAt: string | null;
  clockInStatus: "on_time" | "late" | null;
  clockedOutAt: string | null;
}

interface HistoryEntry {
  date: string;
  session_name: string;
  assignmentStatus: "assigned" | "excused";
  clockedInAt: string | null;
  clockInStatus: "on_time" | "late" | null;
  clockedOutAt: string | null;
}

interface TraineeData {
  trainee: { id: string; name: string; email: string };
  department: { id: string; name: string } | null;
  schedules: ScheduleStatus[];
  history: HistoryEntry[];
}

type ActionType = "clock_in" | "clock_out";

function formatTime(iso: string | null): string {
  if (!iso) return "-";
  return new Date(iso).toLocaleTimeString("id-ID", {
    timeZone: "Asia/Jakarta",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatDate(dateStr: string): string {
  return new Date(`${dateStr}T00:00:00`).toLocaleDateString("id-ID", {
    timeZone: "Asia/Jakarta",
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export default function AbsenClient() {
  const [googleIdToken, setGoogleIdToken] = useState<string | null>(null);
  const [data, setData] = useState<TraineeData | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [loadingMe, setLoadingMe] = useState(false);

  const [action, setAction] = useState<{ scheduleId: string; type: ActionType } | null>(null);
  const [photoBlob, setPhotoBlob] = useState<Blob | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [showHistory, setShowHistory] = useState(false);

  async function loadMe(idToken: string) {
    setLoadingMe(true);
    setLoadError(null);
    try {
      const res = await fetch("/api/trainee/me", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ google_id_token: idToken }),
      });
      const json = await res.json();
      if (!res.ok) {
        setLoadError(json.error ?? "Gagal memuat data Anda");
        setGoogleIdToken(null);
        return;
      }
      setData(json);
      setGoogleIdToken(idToken);
    } catch {
      setLoadError("Terjadi kesalahan jaringan");
      setGoogleIdToken(null);
    } finally {
      setLoadingMe(false);
    }
  }

  function handleGoogleSignIn(idToken: string) {
    loadMe(idToken);
  }

  function startAction(scheduleId: string, type: ActionType) {
    setAction({ scheduleId, type });
    setPhotoBlob(null);
    setPreviewUrl(null);
    setSubmitError(null);
    setSuccessMessage(null);
  }

  function cancelAction() {
    setAction(null);
    setPhotoBlob(null);
    setPreviewUrl(null);
    setSubmitError(null);
  }

  async function refreshMe() {
    if (googleIdToken) await loadMe(googleIdToken);
  }

  async function submitAttendance() {
    if (!action || !photoBlob || !googleIdToken) return;
    setSubmitting(true);
    setSubmitError(null);

    if (!navigator.geolocation) {
      setSubmitError("Geolocation tidak didukung browser ini");
      setSubmitting(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const form = new FormData();
          form.set("schedule_id", action.scheduleId);
          form.set("type", action.type);
          form.set("lat", String(pos.coords.latitude));
          form.set("lng", String(pos.coords.longitude));
          form.set("google_id_token", googleIdToken);
          form.set("photo", photoBlob, "absen.jpg");

          const res = await fetch("/api/attendance", { method: "POST", body: form });
          const json = await res.json();
          if (!res.ok) {
            setSubmitError(json.error ?? "Gagal mengirim absen");
            return;
          }
          setSuccessMessage(
            action.type === "clock_in" ? "Absen masuk berhasil dicatat." : "Absen pulang berhasil dicatat."
          );
          setAction(null);
          setPhotoBlob(null);
          setPreviewUrl(null);
          await refreshMe();
        } catch {
          setSubmitError("Terjadi kesalahan jaringan saat mengirim absen");
        } finally {
          setSubmitting(false);
        }
      },
      () => {
        setSubmitError("Gagal mengambil lokasi. Izinkan akses lokasi di browser.");
        setSubmitting(false);
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
    );
  }

  if (!data) {
    return (
      <div className="flex flex-col items-center gap-4 text-center">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/logo.png" alt="Aston Anyer Beach Hotel" className="h-16 w-16 object-contain" />
        <div>
          <h1 className="text-xl font-semibold text-zinc-900 dark:text-zinc-50">
            Absen Training
          </h1>
          <p className="mt-1 text-sm text-zinc-500">
            Sign in dengan akun Google pribadi Anda yang terdaftar untuk absen.
          </p>
        </div>

        {loadingMe ? (
          <p className="text-sm text-zinc-500">Memeriksa akun...</p>
        ) : (
          <GoogleSignInButton onSignIn={handleGoogleSignIn} />
        )}

        {loadError && (
          <p className="max-w-sm text-sm text-red-600 dark:text-red-400">{loadError}</p>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="text-center">
        <h1 className="text-xl font-semibold text-zinc-900 dark:text-zinc-50">
          {data.trainee.name}
        </h1>
        <p className="text-sm text-zinc-500">{data.department?.name ?? "-"}</p>
      </div>

      {successMessage && (
        <p className="rounded-md bg-green-50 px-3 py-2 text-center text-sm text-green-700 dark:bg-green-950 dark:text-green-300">
          {successMessage}
        </p>
      )}

      {data.schedules.length === 0 && (
        <p className="text-center text-sm text-zinc-500">
          Tidak ada jadwal training untuk Anda hari ini.
        </p>
      )}

      {data.schedules.map(({ schedule, assignmentStatus, clockedInAt, clockInStatus, clockedOutAt }) => {
        const isActive = action?.scheduleId === schedule.id;
        const isExcused = assignmentStatus === "excused" && !clockedInAt;
        return (
          <div
            key={schedule.id}
            className="rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900"
          >
            <div className="mb-3 flex items-center justify-between">
              <div>
                <p className="font-medium text-zinc-900 dark:text-zinc-50">
                  {schedule.session_name}
                </p>
                <p className="text-sm text-zinc-500">
                  {schedule.start_time}–{schedule.end_time}
                </p>
              </div>
              {clockInStatus === "late" && (
                <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs text-amber-700 dark:bg-amber-950 dark:text-amber-400">
                  Terlambat
                </span>
              )}
              {isExcused && (
                <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-xs text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300">
                  Izin
                </span>
              )}
            </div>

            <p className="mb-3 text-sm text-zinc-500">
              Masuk: {formatTime(clockedInAt)} &middot; Pulang: {formatTime(clockedOutAt)}
            </p>

            {isExcused && (
              <p className="text-center text-sm text-zinc-400">
                Anda diizinkan tidak hadir di sesi ini.
              </p>
            )}

            {!isExcused && !isActive && (
              <>
                {!clockedInAt && (
                  <button
                    onClick={() => startAction(schedule.id, "clock_in")}
                    className="w-full rounded-md bg-brand px-4 py-2 text-sm font-medium text-white dark:bg-zinc-50 dark:text-brand"
                  >
                    Absen Masuk
                  </button>
                )}
                {clockedInAt && !clockedOutAt && (
                  <button
                    onClick={() => startAction(schedule.id, "clock_out")}
                    className="w-full rounded-md bg-brand px-4 py-2 text-sm font-medium text-white dark:bg-zinc-50 dark:text-brand"
                  >
                    Absen Pulang
                  </button>
                )}
                {clockedInAt && clockedOutAt && (
                  <p className="text-center text-sm text-zinc-400">Absensi selesai</p>
                )}
              </>
            )}

            {isActive && (
              <div className="flex flex-col gap-3 border-t border-zinc-100 pt-4 dark:border-zinc-800">
                {!previewUrl && (
                  <CameraCapture
                    onCapture={(blob, url) => {
                      setPhotoBlob(blob);
                      setPreviewUrl(url);
                    }}
                  />
                )}

                {previewUrl && (
                  <div className="flex flex-col items-center gap-3">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={previewUrl}
                      alt="Preview foto absen"
                      className="w-full max-w-sm scale-x-[-1] rounded-lg"
                    />
                    <div className="flex w-full max-w-sm gap-2">
                      <button
                        onClick={() => {
                          setPhotoBlob(null);
                          setPreviewUrl(null);
                        }}
                        className="flex-1 rounded-md border border-zinc-300 px-4 py-2 text-sm dark:border-zinc-700"
                      >
                        Ambil Ulang
                      </button>
                      <button
                        onClick={submitAttendance}
                        disabled={submitting}
                        className="flex-1 rounded-md bg-brand px-4 py-2 text-sm font-medium text-white disabled:opacity-50 dark:bg-zinc-50 dark:text-brand"
                      >
                        {submitting ? "Mengirim..." : "Kirim Absen"}
                      </button>
                    </div>
                  </div>
                )}

                {submitError && (
                  <p className="text-center text-sm text-red-600 dark:text-red-400">
                    {submitError}
                  </p>
                )}

                <button onClick={cancelAction} className="text-center text-xs text-zinc-400 underline">
                  Batal
                </button>
              </div>
            )}
          </div>
        );
      })}

      <div className="border-t border-zinc-200 pt-4 dark:border-zinc-800">
        <button
          onClick={() => setShowHistory((v) => !v)}
          className="w-full text-center text-sm text-zinc-500 underline"
        >
          {showHistory ? "Sembunyikan riwayat" : "Lihat riwayat absen saya"}
        </button>

        {showHistory && (
          <div className="mt-3 flex flex-col gap-2">
            {data.history.length === 0 && (
              <p className="text-center text-sm text-zinc-400">Belum ada riwayat.</p>
            )}
            {data.history.map((h, i) => (
              <div
                key={`${h.date}-${h.session_name}-${i}`}
                className="flex items-center justify-between rounded-lg border border-zinc-200 px-3 py-2 text-sm dark:border-zinc-800"
              >
                <div>
                  <p className="font-medium text-zinc-900 dark:text-zinc-50">
                    {formatDate(h.date)} &middot; {h.session_name}
                  </p>
                  <p className="text-xs text-zinc-500">
                    Masuk: {formatTime(h.clockedInAt)} &middot; Pulang: {formatTime(h.clockedOutAt)}
                  </p>
                </div>
                {h.assignmentStatus === "excused" && !h.clockedInAt && (
                  <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-xs text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300">
                    Izin
                  </span>
                )}
                {h.clockInStatus === "late" && (
                  <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs text-amber-700 dark:bg-amber-950 dark:text-amber-400">
                    Terlambat
                  </span>
                )}
                {h.clockInStatus === "on_time" && (
                  <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs text-green-700 dark:bg-green-950 dark:text-green-400">
                    Tepat Waktu
                  </span>
                )}
                {!h.clockedInAt && h.assignmentStatus !== "excused" && (
                  <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs text-red-700 dark:bg-red-950 dark:text-red-400">
                    Tidak Hadir
                  </span>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
