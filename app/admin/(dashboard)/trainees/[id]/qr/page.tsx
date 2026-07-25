"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import PrintButton from "@/components/PrintButton";

interface QrData {
  traineeName: string;
  departmentName: string | null;
  absenUrl: string;
  qrDataUrl: string;
}

export default function TraineeQrPage() {
  const params = useParams<{ id: string }>();
  const [data, setData] = useState<QrData | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      const res = await fetch(`/api/trainees/${params.id}/qr`);
      const json = await res.json();
      if (!res.ok) {
        setError(json.error ?? "Gagal memuat QR");
        return;
      }
      setData(json);
    }
     
    load();
  }, [params.id]);

  if (error) {
    return <p className="text-center text-sm text-red-600 dark:text-red-400">{error}</p>;
  }

  if (!data) {
    return <p className="text-center text-sm text-zinc-500">Memuat...</p>;
  }

  return (
    <div className="flex flex-col items-center gap-4">
      <div className="text-center">
        <h1 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
          Kode Absen — {data.traineeName}
        </h1>
        <p className="text-sm text-zinc-500">{data.departmentName ?? "-"}</p>
      </div>
      <div className="rounded-xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={data.qrDataUrl} alt={`QR absen ${data.traineeName}`} width={320} height={320} />
      </div>
      <p className="max-w-xs break-all text-center text-sm text-zinc-500">{data.absenUrl}</p>
      <PrintButton />
    </div>
  );
}
