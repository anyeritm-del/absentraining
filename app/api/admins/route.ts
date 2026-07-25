import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { requireAdminOrResponse } from "@/lib/session";
import { createAdmin, getAdminByEmail, listAdmins } from "@/lib/repositories/admins";

export const dynamic = "force-dynamic";

const createSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8, "Password minimal 8 karakter"),
});

export async function GET() {
  const { response } = await requireAdminOrResponse();
  if (response) return response;

  const admins = await listAdmins();
  return NextResponse.json({
    admins: admins.map((a) => ({ id: a.id, email: a.email, created_at: a.created_at })),
  });
}

export async function POST(req: Request) {
  const { response } = await requireAdminOrResponse();
  if (response) return response;

  const parsed = createSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Email/password tidak valid" },
      { status: 400 }
    );
  }
  const { email, password } = parsed.data;

  const existing = await getAdminByEmail(email);
  if (existing) {
    return NextResponse.json({ error: "Email ini sudah terdaftar sebagai admin" }, { status: 400 });
  }

  const password_hash = await bcrypt.hash(password, 10);
  const admin = await createAdmin({ email, password_hash });
  return NextResponse.json(
    { admin: { id: admin.id, email: admin.email, created_at: admin.created_at } },
    { status: 201 }
  );
}
