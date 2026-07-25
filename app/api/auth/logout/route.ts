import { NextResponse } from "next/server";
import { ADMIN_COOKIE_NAME } from "@/lib/session";


export const dynamic = "force-dynamic";
export async function POST() {
  const res = NextResponse.json({ message: "Logout berhasil" });
  res.cookies.delete(ADMIN_COOKIE_NAME);
  return res;
}
