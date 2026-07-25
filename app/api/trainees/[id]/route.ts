import { NextResponse } from "next/server";
import { z } from "zod";
import { assertDepartmentScope, requireAdminOrResponse } from "@/lib/session";
import { deleteTrainee, getTraineeById, updateTrainee } from "@/lib/repositories/trainees";

export const dynamic = "force-dynamic";

const updateSchema = z.object({
  name: z.string().min(1),
  department_id: z.string().min(1),
  phone: z.string().default(""),
  email: z.string().default(""),
  status: z.enum(["active", "inactive"]),
});

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { session, response } = await requireAdminOrResponse();
  if (response) return response;

  const { id } = await params;
  const parsed = updateSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Data trainee tidak valid" }, { status: 400 });
  }

  const existing = await getTraineeById(id);
  if (!existing) {
    return NextResponse.json({ error: "Trainee tidak ditemukan" }, { status: 404 });
  }
  const forbiddenExisting = assertDepartmentScope(session, existing.department_id);
  if (forbiddenExisting) return forbiddenExisting;
  const forbiddenTarget = assertDepartmentScope(session, parsed.data.department_id);
  if (forbiddenTarget) return forbiddenTarget;

  try {
    const trainee = await updateTrainee(id, parsed.data);
    return NextResponse.json({ trainee });
  } catch {
    return NextResponse.json({ error: "Trainee tidak ditemukan" }, { status: 404 });
  }
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { session, response } = await requireAdminOrResponse();
  if (response) return response;

  const { id } = await params;
  const existing = await getTraineeById(id);
  if (!existing) {
    return NextResponse.json({ error: "Trainee tidak ditemukan" }, { status: 404 });
  }
  const forbidden = assertDepartmentScope(session, existing.department_id);
  if (forbidden) return forbidden;

  try {
    await deleteTrainee(id);
    return NextResponse.json({ message: "Trainee dihapus" });
  } catch {
    return NextResponse.json({ error: "Trainee tidak ditemukan" }, { status: 404 });
  }
}
