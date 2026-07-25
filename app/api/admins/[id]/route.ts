import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { requireFullAccessOrResponse } from "@/lib/session";
import {
  deleteAdmin,
  getAdminByEmail,
  getAdminById,
  listAdmins,
  updateAdmin,
} from "@/lib/repositories/admins";
import { getDepartmentById } from "@/lib/repositories/departments";

export const dynamic = "force-dynamic";

const updateSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8, "Password minimal 8 karakter").optional(),
  role: z.enum(["full_access", "department_admin"]),
  department_id: z.string().optional().default(""),
});

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { session, response } = await requireFullAccessOrResponse();
  if (response) return response;

  const { id } = await params;
  const target = await getAdminById(id);
  if (!target) {
    return NextResponse.json({ error: "Admin tidak ditemukan" }, { status: 404 });
  }

  const parsed = updateSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Data admin tidak valid" },
      { status: 400 }
    );
  }
  const { email, password, department_id } = parsed.data;
  // Prevent self-demotion: editing your own account never changes your own
  // role/department, even if the request body asks for it.
  const role = id === session.adminId ? target.role : parsed.data.role;
  const resolvedDepartmentId = id === session.adminId ? target.department_id : department_id;

  if (role === "department_admin") {
    if (!resolvedDepartmentId) {
      return NextResponse.json(
        { error: "Admin department wajib memilih department" },
        { status: 400 }
      );
    }
    const department = await getDepartmentById(resolvedDepartmentId);
    if (!department) {
      return NextResponse.json({ error: "Department tidak ditemukan" }, { status: 400 });
    }
  }

  const emailOwner = await getAdminByEmail(email);
  if (emailOwner && emailOwner.id !== id) {
    return NextResponse.json({ error: "Email ini sudah dipakai admin lain" }, { status: 400 });
  }

  const password_hash = password ? await bcrypt.hash(password, 10) : undefined;
  const admin = await updateAdmin(id, {
    email,
    role,
    department_id: role === "department_admin" ? resolvedDepartmentId : "",
    password_hash,
  });

  return NextResponse.json({
    admin: {
      id: admin.id,
      email: admin.email,
      created_at: admin.created_at,
      role: admin.role,
      department_id: admin.department_id,
    },
  });
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { session, response } = await requireFullAccessOrResponse();
  if (response) return response;

  const { id } = await params;

  if (id === session.adminId) {
    return NextResponse.json(
      { error: "Tidak bisa menghapus akun admin yang sedang login" },
      { status: 400 }
    );
  }

  const target = await getAdminById(id);
  if (!target) {
    return NextResponse.json({ error: "Admin tidak ditemukan" }, { status: 404 });
  }

  const allAdmins = await listAdmins();
  if (allAdmins.length <= 1) {
    return NextResponse.json(
      { error: "Tidak bisa menghapus satu-satunya admin yang tersisa" },
      { status: 400 }
    );
  }

  await deleteAdmin(id);
  return NextResponse.json({ message: "Admin dihapus" });
}
