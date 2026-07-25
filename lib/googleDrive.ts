import { google, drive_v3 } from "googleapis";
import { Readable } from "stream";
import { getGoogleAuth } from "./googleSheetsClient";

let cachedClient: drive_v3.Drive | null = null;

function getDriveClient(): drive_v3.Drive {
  if (!cachedClient) {
    cachedClient = google.drive({ version: "v3", auth: getGoogleAuth() });
  }
  return cachedClient;
}

function getFolderId(): string {
  const id = process.env.GOOGLE_DRIVE_FOLDER_ID;
  if (!id) throw new Error("Missing GOOGLE_DRIVE_FOLDER_ID environment variable");
  return id;
}

export async function uploadPhoto(
  buffer: Buffer,
  filename: string,
  mimeType: string
): Promise<string> {
  const drive = getDriveClient();
  const res = await drive.files.create({
    requestBody: {
      name: filename,
      parents: [getFolderId()],
    },
    media: {
      mimeType,
      body: Readable.from(buffer),
    },
    fields: "id",
    // Required whenever the parent lives inside a Shared Drive (service
    // accounts have no My Drive storage quota of their own, so photo uploads
    // must land in a Shared Drive — this flag is a no-op for a normal folder).
    supportsAllDrives: true,
  });
  const fileId = res.data.id;
  if (!fileId) throw new Error("Google Drive did not return a file id");
  return fileId;
}

export async function getPhotoStream(fileId: string): Promise<{
  stream: NodeJS.ReadableStream;
  mimeType: string;
}> {
  const drive = getDriveClient();
  const meta = await drive.files.get({
    fileId,
    fields: "mimeType",
    supportsAllDrives: true,
  });
  const mimeType = meta.data.mimeType ?? "image/jpeg";
  const res = await drive.files.get(
    { fileId, alt: "media", supportsAllDrives: true },
    { responseType: "stream" }
  );
  return { stream: res.data as NodeJS.ReadableStream, mimeType };
}
