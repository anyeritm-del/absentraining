import { NextResponse } from "next/server";
import { z } from "zod";
import { assertDepartmentScope, requireAdminOrResponse } from "@/lib/session";
import { createTrainee, listTrainees } from "@/lib/repositories/trainees";

export const dynamic = "force-dynamic";

const createSchema = z.object({
  name: z.string().min(1),
  department_id: z.string().min(1),
  phone: z.string().default(""),
  email: z.string().default(""),
});

export async function GET() {
  const { session, response } = await requireAdminOrResponse();
  if (response) return response;

  const trainees = await listTrainees();
  const scoped =
    session.role === "full_access"
      ? trainees
      : trainees.filter((t) => t.department_id === session.departmentId);
  return NextResponse.json({ trainees: scoped });
}

export async function POST(req: Request) {
  const { session, response } = await requireAdminOrResponse();
  if (response) return response;

  const parsed = createSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Nama dan department wajib diisi" },
      { status: 400 }
    );
  }

  const forbidden = assertDepartmentScope(session, parsed.data.department_id);
  if (forbidden) return forbidden;

  const trainee = await createTrainee(parsed.data);
  return NextResponse.json({ trainee }, { status: 201 });
}
