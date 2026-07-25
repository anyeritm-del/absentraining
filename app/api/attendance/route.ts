import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdminOrResponse } from "@/lib/session";
import {
  createAttendance,
  getAttendanceForTraineeSchedule,
} from "@/lib/repositories/attendance";
import { getTraineeByCode } from "@/lib/repositories/trainees";
import { getScheduleById } from "@/lib/repositories/schedules";
import { haversineDistanceMeters } from "@/lib/distance";
import { minutesSinceMidnight, nowTimeInJakarta } from "@/lib/date";
import { uploadPhoto } from "@/lib/googleDrive";
import { getJoinedAttendance } from "@/lib/attendanceView";

export const dynamic = "force-dynamic";

const LATE_GRACE_MINUTES = 15;
const MAX_PHOTO_BYTES = 5 * 1024 * 1024;

export async function GET(req: Request) {
  const { session, response } = await requireAdminOrResponse();
  if (response) return response;

  const url = new URL(req.url);
  const requestedDepartmentId = url.searchParams.get("department_id");
  // department_admin can only ever see their own department, regardless of
  // what the query string asks for.
  const departmentId =
    session.role === "full_access" ? requestedDepartmentId : session.departmentId;

  const attendance = await getJoinedAttendance({
    departmentId,
    date: url.searchParams.get("date"),
    traineeId: url.searchParams.get("trainee_id"),
  });

  return NextResponse.json({ attendance });
}

const postSchema = z.object({
  code: z.string().min(1),
  schedule_id: z.string().min(1),
  type: z.enum(["clock_in", "clock_out"]),
  lat: z.coerce.number(),
  lng: z.coerce.number(),
});

export async function POST(req: Request) {
  const form = await req.formData().catch(() => null);
  if (!form) {
    return NextResponse.json({ error: "Data tidak valid" }, { status: 400 });
  }

  const parsed = postSchema.safeParse({
    code: form.get("code"),
    schedule_id: form.get("schedule_id"),
    type: form.get("type"),
    lat: form.get("lat"),
    lng: form.get("lng"),
  });
  if (!parsed.success) {
    return NextResponse.json({ error: "Data absen tidak lengkap/valid" }, { status: 400 });
  }
  const { code, schedule_id, type, lat, lng } = parsed.data;

  const photo = form.get("photo");
  if (!(photo instanceof File) || photo.size === 0) {
    return NextResponse.json({ error: "Foto wajib diambil" }, { status: 400 });
  }
  if (photo.size > MAX_PHOTO_BYTES) {
    return NextResponse.json({ error: "Ukuran foto terlalu besar" }, { status: 400 });
  }

  const trainee = await getTraineeByCode(code);
  if (!trainee || trainee.status !== "active") {
    return NextResponse.json({ error: "Kode absen tidak valid" }, { status: 404 });
  }

  const schedule = await getScheduleById(schedule_id);
  if (!schedule || schedule.department_id !== trainee.department_id) {
    return NextResponse.json({ error: "Jadwal tidak ditemukan" }, { status: 404 });
  }

  const existing = await getAttendanceForTraineeSchedule(trainee.id, schedule.id);
  const hasClockIn = existing.some((r) => r.type === "clock_in");
  const hasClockOut = existing.some((r) => r.type === "clock_out");
  if (type === "clock_in" && hasClockIn) {
    return NextResponse.json(
      { error: "Anda sudah absen masuk untuk sesi ini" },
      { status: 400 }
    );
  }
  if (type === "clock_out" && !hasClockIn) {
    return NextResponse.json(
      { error: "Anda belum absen masuk untuk sesi ini" },
      { status: 400 }
    );
  }
  if (type === "clock_out" && hasClockOut) {
    return NextResponse.json(
      { error: "Anda sudah absen pulang untuk sesi ini" },
      { status: 400 }
    );
  }

  const distance_m = Math.round(
    haversineDistanceMeters(lat, lng, schedule.lat, schedule.lng)
  );
  const within_radius = distance_m <= schedule.radius_m;
  if (!within_radius) {
    return NextResponse.json(
      {
        error: `Lokasi Anda berjarak ${distance_m}m dari titik training (maksimal ${schedule.radius_m}m). Absen ditolak.`,
      },
      { status: 400 }
    );
  }

  let status: "on_time" | "late" | "" = "";
  if (type === "clock_in") {
    const nowMinutes = minutesSinceMidnight(nowTimeInJakarta());
    const startMinutes = minutesSinceMidnight(schedule.start_time);
    status = nowMinutes > startMinutes + LATE_GRACE_MINUTES ? "late" : "on_time";
  }

  const buffer = Buffer.from(await photo.arrayBuffer());
  const filename = `${trainee.code}_${schedule.date}_${type}_${Date.now()}.jpg`;
  const photo_file_id = await uploadPhoto(buffer, filename, photo.type || "image/jpeg");

  const record = await createAttendance({
    trainee_id: trainee.id,
    schedule_id: schedule.id,
    type,
    timestamp: new Date().toISOString(),
    lat,
    lng,
    distance_m,
    within_radius,
    status,
    photo_file_id,
  });

  return NextResponse.json({ attendance: record }, { status: 201 });
}
