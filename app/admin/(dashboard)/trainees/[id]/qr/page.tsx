import { headers } from "next/headers";
import { notFound } from "next/navigation";
import QRCode from "qrcode";
import { getTraineeById } from "@/lib/repositories/trainees";
import { getDepartmentById } from "@/lib/repositories/departments";
import PrintButton from "@/components/PrintButton";

export default async function TraineeQrPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const trainee = await getTraineeById(id);
  if (!trainee) notFound();
  const department = await getDepartmentById(trainee.department_id);

  const hdrs = await headers();
  const host = hdrs.get("host") ?? "localhost:3000";
  const protocol = host.startsWith("localhost") || host.startsWith("127.0.0.1") ? "http" : "https";
  const absenUrl = `${protocol}://${host}/absen/${trainee.code}`;
  const qrDataUrl = await QRCode.toDataURL(absenUrl, { width: 320, margin: 2 });

  return (
    <div className="flex flex-col items-center gap-4">
      <div className="text-center">
        <h1 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
          Kode Absen — {trainee.name}
        </h1>
        <p className="text-sm text-zinc-500">{department?.name ?? "-"}</p>
      </div>
      <div className="rounded-xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={qrDataUrl} alt={`QR absen ${trainee.name}`} width={320} height={320} />
      </div>
      <p className="max-w-xs break-all text-center text-sm text-zinc-500">{absenUrl}</p>
      <PrintButton />
    </div>
  );
}
