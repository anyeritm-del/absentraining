"use client";

import { useEffect, useState } from "react";
import QRCode from "qrcode";

export default function AbsenLinkCard() {
  const [url, setUrl] = useState("");
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);

  useEffect(() => {
    const absenUrl = `${window.location.origin}/absen`;
    QRCode.toDataURL(absenUrl, { width: 220, margin: 2 }).then((dataUrl) => {
      setUrl(absenUrl);
      setQrDataUrl(dataUrl);
    });
  }, []);

  return (
    <div className="flex flex-col items-center gap-3 rounded-xl border border-zinc-200 bg-white p-5 text-center dark:border-zinc-800 dark:bg-zinc-900 sm:flex-row sm:items-center sm:text-left print:border-none print:p-0 print:text-center">
      <p className="hidden text-lg font-semibold text-black print:mb-4 print:block">
        Scan untuk Absen Training
      </p>
      {qrDataUrl && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={qrDataUrl}
          alt="QR link absen"
          width={140}
          height={140}
          className="print:mx-auto print:h-72 print:w-72"
        />
      )}
      <div className="flex flex-col gap-2 print:mt-4 print:items-center">
        <div className="print:hidden">
          <p className="font-medium text-zinc-900 dark:text-zinc-50">Link Absen (satu untuk semua)</p>
          <p className="text-sm text-zinc-500">
            Tempel QR ini di lokasi training. Setiap anak training scan yang sama, lalu sign in
            dengan Google pribadi mereka untuk absen.
          </p>
        </div>
        <p className="break-all rounded-md bg-zinc-100 px-3 py-1.5 text-sm text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300 print:bg-transparent print:text-black">
          {url}
        </p>
        <button
          onClick={() => window.print()}
          className="w-fit rounded-md border border-zinc-300 px-3 py-1.5 text-sm text-zinc-600 hover:bg-zinc-100 print:hidden dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
        >
          Cetak QR
        </button>
      </div>
    </div>
  );
}
