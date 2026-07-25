import { NextResponse } from "next/server";
import { z } from "zod";
import { requireFullAccessOrResponse } from "@/lib/session";
import { deleteLocation, updateLocation } from "@/lib/repositories/locations";

export const dynamic = "force-dynamic";

const updateSchema = z.object({
  name: z.string().min(1),
  lat: z.number(),
  lng: z.number(),
  radius_m: z.number().positive(),
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
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Data lokasi tidak valid" },
      { status: 400 }
    );
  }
  try {
    const location = await updateLocation(id, parsed.data);
    return NextResponse.json({ location });
  } catch {
    return NextResponse.json({ error: "Lokasi tidak ditemukan" }, { status: 404 });
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
    await deleteLocation(id);
    return NextResponse.json({ message: "Lokasi dihapus" });
  } catch {
    return NextResponse.json({ error: "Lokasi tidak ditemukan" }, { status: 404 });
  }
}
