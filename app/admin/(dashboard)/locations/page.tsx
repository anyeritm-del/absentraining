import LocationsClient from "./LocationsClient";

export default function LocationsPage() {
  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">Lokasi Training</h1>
        <p className="text-sm text-zinc-500">
          Buat titik lokasi sekali di sini, lalu pilih dari daftar ini saat membuat jadwal.
        </p>
      </div>
      <LocationsClient />
    </div>
  );
}
