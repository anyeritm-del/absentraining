import { redirect } from "next/navigation";

// Per-trainee links have been replaced by a single shared link that
// identifies the trainee via Google Sign-In instead of a URL code.
export default function LegacyAbsenCodePage() {
  redirect("/absen");
}
