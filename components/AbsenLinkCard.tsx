"use client";

import { useEffect, useState } from "react";
import QRCode from "qrcode";

export default function AbsenLinkCard() {
  const [url, setUrl] = useState("");
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);

  useEffect(() => {
    const absenUrl = `${window.location.origin}/absen`;
    QRCode.toDataURL(absenUrl, { width: 600, margin: 2 }).then((dataUrl) => {
      setUrl(absenUrl);
      setQrDataUrl(dataUrl);
    });
  }, []);

  return (
    <>
      <div className="flex flex-col items-center gap-3 rounded-xl border border-zinc-200 bg-white p-5 text-center dark:border-zinc-800 dark:bg-zinc-900 sm:flex-row sm:items-center sm:text-left print:hidden">
        {qrDataUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={qrDataUrl} alt="QR link absen" width={140} height={140} />
        )}
        <div className="flex flex-col gap-2">
          <div>
            <p className="font-medium text-zinc-900 dark:text-zinc-50">Link Absen (satu untuk semua)</p>
            <p className="text-sm text-zinc-500">
              Tempel QR ini di lokasi training. Setiap anak training scan yang sama, lalu sign in
              dengan Google pribadi mereka untuk absen.
            </p>
          </div>
          <p className="break-all rounded-md bg-zinc-100 px-3 py-1.5 text-sm text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">
            {url}
          </p>
          <button
            onClick={() => window.print()}
            className="w-fit rounded-md border border-zinc-300 px-3 py-1.5 text-sm text-zinc-600 hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
          >
            Cetak QR
          </button>
        </div>
      </div>

      {/* Print-only: full A4 poster, hidden on screen */}
      <div className="hidden print:fixed print:inset-0 print:flex print:flex-col print:items-center print:justify-center print:gap-8 print:bg-white">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/logo.png" alt="Aston Anyer Beach Hotel" className="h-28 w-28 object-contain" />
        <div className="text-center">
          <p className="text-sm font-semibold uppercase tracking-[0.3em] text-brand-muted">
            Absensi Training
          </p>
          <h1 className="mt-1 text-5xl font-bold text-brand">Scan untuk Absen</h1>
        </div>
        {qrDataUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={qrDataUrl}
            alt="QR link absen"
            className="h-[340px] w-[340px] border-8 border-brand p-2"
          />
        )}
        <ol className="max-w-sm list-decimal space-y-2 text-lg text-black">
          <li>Scan QR di atas dengan kamera HP</li>
          <li>Sign in dengan akun Google pribadi Anda</li>
          <li>Ambil foto & izinkan akses lokasi untuk absen</li>
        </ol>
        <p className="text-base text-zinc-500">{url}</p>
        <div className="absolute inset-x-0 bottom-0 h-6 bg-brand" />
      </div>
    </>
  );
}
