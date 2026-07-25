import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdminOrResponse } from "@/lib/session";
import { createDepartment, listDepartments } from "@/lib/repositories/departments";


export const dynamic = "force-dynamic";
const createSchema = z.object({
  name: z.string().min(1),
  description: z.string().default(""),
});

export async function GET() {
  const { response } = await requireAdminOrResponse();
  if (response) return response;

  const departments = await listDepartments();
  return NextResponse.json({ departments });
}

export async function POST(req: Request) {
  const { response } = await requireAdminOrResponse();
  if (response) return response;

  const parsed = createSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Nama department wajib diisi" }, { status: 400 });
  }
  const department = await createDepartment(parsed.data);
  return NextResponse.json({ department }, { status: 201 });
}
