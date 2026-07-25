import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdminOrResponse } from "@/lib/session";
import { createTrainee, listTrainees } from "@/lib/repositories/trainees";


export const dynamic = "force-dynamic";
const createSchema = z.object({
  name: z.string().min(1),
  department_id: z.string().min(1),
  phone: z.string().default(""),
  email: z.string().default(""),
});

export async function GET() {
  const { response } = await requireAdminOrResponse();
  if (response) return response;

  const trainees = await listTrainees();
  return NextResponse.json({ trainees });
}

export async function POST(req: Request) {
  const { response } = await requireAdminOrResponse();
  if (response) return response;

  const parsed = createSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Nama dan department wajib diisi" },
      { status: 400 }
    );
  }
  const trainee = await createTrainee(parsed.data);
  return NextResponse.json({ trainee }, { status: 201 });
}
