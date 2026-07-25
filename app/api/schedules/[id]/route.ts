import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdminOrResponse } from "@/lib/session";
import { deleteSchedule, updateSchedule } from "@/lib/repositories/schedules";


export const dynamic = "force-dynamic";
const scheduleSchema = z.object({
  department_id: z.string().min(1),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Format tanggal harus YYYY-MM-DD"),
  session_name: z.string().min(1),
  start_time: z.string().regex(/^\d{2}:\d{2}$/, "Format jam harus HH:mm"),
  end_time: z.string().regex(/^\d{2}:\d{2}$/, "Format jam harus HH:mm"),
  lat: z.number(),
  lng: z.number(),
  radius_m: z.number().positive(),
});

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { response } = await requireAdminOrResponse();
  if (response) return response;

  const { id } = await params;
  const parsed = scheduleSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Data jadwal tidak valid" },
      { status: 400 }
    );
  }
  try {
    const schedule = await updateSchedule(id, parsed.data);
    return NextResponse.json({ schedule });
  } catch {
    return NextResponse.json({ error: "Jadwal tidak ditemukan" }, { status: 404 });
  }
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { response } = await requireAdminOrResponse();
  if (response) return response;

  const { id } = await params;
  try {
    await deleteSchedule(id);
    return NextResponse.json({ message: "Jadwal dihapus" });
  } catch {
    return NextResponse.json({ error: "Jadwal tidak ditemukan" }, { status: 404 });
  }
}
