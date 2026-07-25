import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { getAdminByEmail } from "@/lib/repositories/admins";
import { ADMIN_COOKIE_NAME, SESSION_MAX_AGE, signAdminSession } from "@/lib/session";


export const dynamic = "force-dynamic";
const bodySchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export async function POST(req: Request) {
  const parsed = bodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Email dan password wajib diisi" }, { status: 400 });
  }
  const { email, password } = parsed.data;

  const admin = await getAdminByEmail(email);
  if (!admin) {
    return NextResponse.json({ error: "Email atau password salah" }, { status: 401 });
  }

  const valid = await bcrypt.compare(password, admin.password_hash);
  if (!valid) {
    return NextResponse.json({ error: "Email atau password salah" }, { status: 401 });
  }

  const token = await signAdminSession({ adminId: admin.id, email: admin.email });
  const res = NextResponse.json({ message: "Login berhasil" });
  res.cookies.set(ADMIN_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_MAX_AGE,
  });
  return res;
}
