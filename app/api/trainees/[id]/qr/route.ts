import { NextResponse } from "next/server";
import QRCode from "qrcode";
import { assertDepartmentScope, requireAdminOrResponse } from "@/lib/session";
import { getTraineeById } from "@/lib/repositories/trainees";
import { getDepartmentById } from "@/lib/repositories/departments";

export const dynamic = "force-dynamic";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { session, response } = await requireAdminOrResponse();
  if (response) return response;

  const { id } = await params;
  const trainee = await getTraineeById(id);
  if (!trainee) {
    return NextResponse.json({ error: "Trainee tidak ditemukan" }, { status: 404 });
  }
  const forbidden = assertDepartmentScope(session, trainee.department_id);
  if (forbidden) return forbidden;

  const department = await getDepartmentById(trainee.department_id);

  const url = new URL(req.url);
  const absenUrl = `${url.protocol}//${url.host}/absen/${trainee.code}`;
  const qrDataUrl = await QRCode.toDataURL(absenUrl, { width: 320, margin: 2 });

  return NextResponse.json({
    traineeName: trainee.name,
    departmentName: department?.name ?? null,
    absenUrl,
    qrDataUrl,
  });
}
