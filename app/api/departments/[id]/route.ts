import { NextResponse } from "next/server";
import { z } from "zod";
import { requireFullAccessOrResponse } from "@/lib/session";
import { deleteDepartment, updateDepartment } from "@/lib/repositories/departments";


export const dynamic = "force-dynamic";
const updateSchema = z.object({
  name: z.string().min(1),
  description: z.string().default(""),
});

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { response } = await requireFullAccessOrResponse();
  if (response) return response;

  const { id } = await params;
  const parsed = updateSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Nama department wajib diisi" }, { status: 400 });
  }
  try {
    const department = await updateDepartment(id, parsed.data);
    return NextResponse.json({ department });
  } catch {
    return NextResponse.json({ error: "Department tidak ditemukan" }, { status: 404 });
  }
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { response } = await requireFullAccessOrResponse();
  if (response) return response;

  const { id } = await params;
  try {
    await deleteDepartment(id);
    return NextResponse.json({ message: "Department dihapus" });
  } catch {
    return NextResponse.json({ error: "Department tidak ditemukan" }, { status: 404 });
  }
}
