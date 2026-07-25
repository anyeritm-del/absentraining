import { NextResponse } from "next/server";
import { Readable } from "stream";
import { getPhotoStream } from "@/lib/googleDrive";
import { requireAdminOrResponse } from "@/lib/session";


export const dynamic = "force-dynamic";
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ fileId: string }> }
) {
  const { response } = await requireAdminOrResponse();
  if (response) return response;

  const { fileId } = await params;
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
