import { NextResponse } from "next/server";
import { requireFullAccessOrResponse } from "@/lib/session";
import { deleteAdmin, getAdminById, listAdmins } from "@/lib/repositories/admins";

export const dynamic = "force-dynamic";

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
