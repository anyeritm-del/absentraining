import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { requireFullAccessOrResponse } from "@/lib/session";
import { createAdmin, getAdminByEmail, listAdmins } from "@/lib/repositories/admins";
import { getDepartmentById } from "@/lib/repositories/departments";

export const dynamic = "force-dynamic";

const createSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8, "Password minimal 8 karakter"),
  role: z.enum(["full_access", "department_admin"]),
  department_id: z.string().optional().default(""),
});

export async function GET() {
  const { response } = await requireFullAccessOrResponse();
  if (response) return response;

  const admins = await listAdmins();
  return NextResponse.json({
    admins: admins.map((a) => ({
      id: a.id,
      email: a.email,
      created_at: a.created_at,
      role: a.role,
      department_id: a.department_id,
    })),
  });
}

export async function POST(req: Request) {
  const { response } = await requireFullAccessOrResponse();
  if (response) return response;

  const parsed = createSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Data admin tidak valid" },
      { status: 400 }
    );
  }
  const { email, password, role, department_id } = parsed.data;

  if (role === "department_admin") {
    if (!department_id) {
      return NextResponse.json(
        { error: "Admin department wajib memilih department" },
        { status: 400 }
      );
    }
    const department = await getDepartmentById(department_id);
    if (!department) {
      return NextResponse.json({ error: "Department tidak ditemukan" }, { status: 400 });
    }
  }

  const existing = await getAdminByEmail(email);
  if (existing) {
    return NextResponse.json({ error: "Email ini sudah terdaftar sebagai admin" }, { status: 400 });
  }

  const password_hash = await bcrypt.hash(password, 10);
  const admin = await createAdmin({
    email,
    password_hash,
    role,
    department_id: role === "department_admin" ? department_id : "",
  });
  return NextResponse.json(
    {
      admin: {
        id: admin.id,
        email: admin.email,
        created_at: admin.created_at,
        role: admin.role,
        department_id: admin.department_id,
      },
    },
    { status: 201 }
  );
}
