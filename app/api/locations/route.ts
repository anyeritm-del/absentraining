import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdminOrResponse, requireFullAccessOrResponse } from "@/lib/session";
import { createLocation, listLocations } from "@/lib/repositories/locations";

export const dynamic = "force-dynamic";

const createSchema = z.object({
  name: z.string().min(1),
  lat: z.number(),
  lng: z.number(),
  radius_m: z.number().positive(),
});

export async function GET() {
  // Every admin (including department_admin) can read the shared location
  // list to pick from when creating a schedule — only full_access curates it.
  const { response } = await requireAdminOrResponse();
  if (response) return response;

  const locations = await listLocations();
  return NextResponse.json({ locations });
}

export async function POST(req: Request) {
  const { response } = await requireFullAccessOrResponse();
  if (response) return response;

  const parsed = createSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Data lokasi tidak valid" },
      { status: 400 }
    );
  }
  const location = await createLocation(parsed.data);
  return NextResponse.json({ location }, { status: 201 });
}
