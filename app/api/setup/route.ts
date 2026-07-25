import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { ensureDepartmentsHeaders } from "@/lib/repositories/departments";
import { ensureTraineesHeaders } from "@/lib/repositories/trainees";
import { ensureSchedulesHeaders } from "@/lib/repositories/schedules";
import { ensureAttendanceHeaders } from "@/lib/repositories/attendance";
import { ensureScheduleAssignmentsHeaders } from "@/lib/repositories/scheduleAssignments";
import {
  ensureAdminsHeaders,
  createAdmin,
  listAdmins,
} from "@/lib/repositories/admins";

export const dynamic = "force-dynamic";

/**
 * One-time setup: creates the header row of every sheet tab (if missing) and
 * seeds the first admin from ADMIN_EMAIL / ADMIN_PASSWORD. Safe to call more
 * than once — it will not reseed if an admin already exists.
 */
export async function POST() {
  await Promise.all([
    ensureDepartmentsHeaders(),
    ensureTraineesHeaders(),
    ensureSchedulesHeaders(),
    ensureAttendanceHeaders(),
    ensureAdminsHeaders(),
    ensureScheduleAssignmentsHeaders(),
  ]);

  const existingAdmins = await listAdmins();
  if (existingAdmins.length > 0) {
    return NextResponse.json({
      message: "Setup already completed. Sheet tabs verified, admin already exists.",
    });
  }

  const email = process.env.ADMIN_EMAIL;
  const password = process.env.ADMIN_PASSWORD;
  if (!email || !password) {
    return NextResponse.json(
      {
        error:
          "Sheet tabs created, but ADMIN_EMAIL/ADMIN_PASSWORD env vars are missing so no admin was seeded.",
      },
      { status: 400 }
    );
  }

  const password_hash = await bcrypt.hash(password, 10);
  await createAdmin({ email, password_hash, role: "full_access", department_id: "" });

  return NextResponse.json({
    message: `Setup complete. Sheet tabs created and admin ${email} seeded.`,
  });
}
