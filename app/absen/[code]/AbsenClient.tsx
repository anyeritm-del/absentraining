"use client";

import { useCallback, useEffect, useState } from "react";
import CameraCapture from "@/components/CameraCapture";
import GoogleSignInButton from "@/components/GoogleSignInButton";
import { decodeJwtPayload } from "@/lib/decodeJwtPayload";

interface ScheduleInfo {
  id: string;
  date: string;
  session_name: string;
  start_time: string;
  end_time: string;
}

interface ScheduleStatus {
  schedule: ScheduleInfo;
  clockedInAt: string | null;
  clockInStatus: "on_time" | "late" | null;
  clockedOutAt: string | null;
}

interface TraineeData {
  trainee: {
    id: string;
    name: string;
    code: string;
    email: string;
    requiresGoogleSignIn: boolean;
  };
  department: { id: string; name: string } | null;
  schedules: ScheduleStatus[];
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

export default function AbsenClient({ code }: { code: string }) {
  const [data, setData] = useState<TraineeData | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const [googleIdToken, setGoogleIdToken] = useState<string | null>(null);
  const [googleMismatchEmail, setGoogleMismatchEmail] = useState<string | null>(null);

  const [action, setAction] = useState<{ scheduleId: string; type: ActionType } | null>(null);
  const [photoBlob, setPhotoBlob] = useState<Blob | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const res = await fetch(`/api/trainee/${code}`);
      const json = await res.json();
      if (!res.ok) {
        setLoadError(json.error ?? "Kode absen tidak ditemukan");
        return;
      }
      setData(json);
    } catch {
      setLoadError("Terjadi kesalahan jaringan");
    } finally {
      setLoading(false);
    }
  }, [code]);

  useEffect(() => {
    // Fetch-on-mount (and again whenever `code` changes) — not the setState-loop
    // pattern this rule guards against, since fetchData never updates its own deps.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchData();
  }, [fetchData]);

  function handleGoogleSignIn(idToken: string) {
    const payload = decodeJwtPayload<{ email?: string }>(idToken);
    const signedInEmail = payload?.email?.toLowerCase() ?? "";
    const expectedEmail = data?.trainee.email.toLowerCase() ?? "";
    if (!signedInEmail || signedInEmail !== expectedEmail) {
      setGoogleMismatchEmail(payload?.email ?? "tidak dikenali");
      setGoogleIdToken(null);
      return;
    }
    setGoogleMismatchEmail(null);
    setGoogleIdToken(idToken);
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

  async function submitAttendance() {
    if (!action || !photoBlob || !data) return;
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
          form.set("code", data.trainee.code);
          form.set("schedule_id", action.scheduleId);
          form.set("type", action.type);
          form.set("lat", String(pos.coords.latitude));
          form.set("lng", String(pos.coords.longitude));
          form.set("photo", photoBlob, "absen.jpg");
          if (googleIdToken) form.set("google_id_token", googleIdToken);

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
          await fetchData();
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

  if (loading) {
    return <p className="text-center text-sm text-zinc-500">Memuat...</p>;
  }

  if (loadError || !data) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-center text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-300">
        {loadError ?? "Kode absen tidak valid"}
      </div>
    );
  }

  const needsGoogleVerification = data.trainee.requiresGoogleSignIn && !googleIdToken;

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

      {needsGoogleVerification ? (
        <div className="flex flex-col items-center gap-3 rounded-xl border border-zinc-200 bg-white p-6 text-center dark:border-zinc-800 dark:bg-zinc-900">
          <p className="text-sm text-zinc-600 dark:text-zinc-300">
            Untuk mencegah titip absen, silakan sign in dengan akun Google pribadi Anda
            yang terdaftar sebelum melanjutkan.
          </p>
          <GoogleSignInButton onSignIn={handleGoogleSignIn} />
          {googleMismatchEmail && (
            <p className="text-sm text-red-600 dark:text-red-400">
              Akun Google &quot;{googleMismatchEmail}&quot; tidak sesuai dengan akun yang
              terdaftar untuk Anda. Klik tombol di atas lagi dan pilih akun yang benar.
            </p>
          )}
        </div>
      ) : (
        <>
          {data.schedules.length === 0 && (
            <p className="text-center text-sm text-zinc-500">
              Tidak ada jadwal training untuk Anda hari ini.
            </p>
          )}

          {data.schedules.map(({ schedule, clockedInAt, clockInStatus, clockedOutAt }) => {
            const isActive = action?.scheduleId === schedule.id;
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
                </div>

                <p className="mb-3 text-sm text-zinc-500">
                  Masuk: {formatTime(clockedInAt)} &middot; Pulang: {formatTime(clockedOutAt)}
                </p>

                {!isActive && (
                  <>
                    {!clockedInAt && (
                      <button
                        onClick={() => startAction(schedule.id, "clock_in")}
                        className="w-full rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white dark:bg-zinc-50 dark:text-zinc-900"
                      >
                        Absen Masuk
                      </button>
                    )}
                    {clockedInAt && !clockedOutAt && (
                      <button
                        onClick={() => startAction(schedule.id, "clock_out")}
                        className="w-full rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white dark:bg-zinc-50 dark:text-zinc-900"
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
                            className="flex-1 rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50 dark:bg-zinc-50 dark:text-zinc-900"
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
        </>
      )}
    </div>
  );
}
