import { NextResponse } from "next/server";
import { Readable } from "stream";
import { getPhotoStream } from "@/lib/googleDrive";
import { assertDepartmentScope, requireAdminOrResponse } from "@/lib/session";
import { listAttendance } from "@/lib/repositories/attendance";
import { getTraineeById } from "@/lib/repositories/trainees";

export const dynamic = "force-dynamic";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ fileId: string }> }
) {
  const { session, response } = await requireAdminOrResponse();
  if (response) return response;

  const { fileId } = await params;

  if (session.role !== "full_access") {
    const attendance = await listAttendance();
    const record = attendance.find((a) => a.photo_file_id === fileId);
    const trainee = record ? await getTraineeById(record.trainee_id) : null;
    const forbidden = assertDepartmentScope(session, trainee?.department_id ?? "");
    if (forbidden) return forbidden;
  }

  try {
    const { stream, mimeType } = await getPhotoStream(fileId);
    const webStream = Readable.toWeb(
      stream as Readable
    ) as unknown as ReadableStream;
    return new Response(webStream, {
      headers: {
        "Content-Type": mimeType,
        "Cache-Control": "private, max-age=3600",
      },
    });
  } catch {
    return NextResponse.json({ error: "Foto tidak ditemukan" }, { status: 404 });
  }
}
