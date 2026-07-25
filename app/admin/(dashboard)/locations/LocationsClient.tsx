"use client";

import { useCallback, useEffect, useState } from "react";
import type { Location } from "@/lib/repositories/locations";

interface FormState {
  name: string;
  lat: string;
  lng: string;
  radius_m: string;
}

const EMPTY_FORM: FormState = { name: "", lat: "", lng: "", radius_m: "100" };

export default function LocationsClient() {
  const [locations, setLocations] = useState<Location[]>([]);
  const [loadingList, setLoadingList] = useState(true);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [locating, setLocating] = useState(false);

  const fetchData = useCallback(async () => {
    setLoadingList(true);
    const res = await fetch("/api/locations");
    const data = await res.json();
    if (res.ok) setLocations(data.locations);
    setLoadingList(false);
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchData();
  }, [fetchData]);

  function startEdit(location: Location) {
    setEditingId(location.id);
    setForm({
      name: location.name,
      lat: String(location.lat),
      lng: String(location.lng),
      radius_m: String(location.radius_m),
    });
  }

  function resetForm() {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setError(null);
  }

  function useMyLocation() {
    if (!navigator.geolocation) {
      setError("Geolocation tidak didukung browser ini");
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setForm((f) => ({
          ...f,
          lat: String(pos.coords.latitude),
          lng: String(pos.coords.longitude),
        }));
        setLocating(false);
      },
      () => {
        setError("Gagal mengambil lokasi. Izinkan akses lokasi di browser.");
        setLocating(false);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const payload = {
        name: form.name,
        lat: Number(form.lat),
        lng: Number(form.lng),
        radius_m: Number(form.radius_m),
      };
      const res = await fetch(
        editingId ? `/api/locations/${editingId}` : "/api/locations",
        {
          method: editingId ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        }
      );
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Gagal menyimpan lokasi");
        return;
      }
      resetForm();
      await fetchData();
    } catch {
      setError("Terjadi kesalahan jaringan");
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Hapus lokasi ini? Jadwal yang sudah memakainya tidak ikut berubah.")) return;
    const res = await fetch(`/api/locations/${id}`, { method: "DELETE" });
    if (res.ok) await fetchData();
  }

  return (
    <div className="flex flex-col gap-6">
      <form
        onSubmit={handleSubmit}
        className="grid grid-cols-1 gap-3 rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900 sm:grid-cols-2 lg:grid-cols-5"
      >
        <div>
          <label className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
            Nama Lokasi
          </label>
          <input
            required
            placeholder="Lobby Utama"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-zinc-500 dark:border-zinc-700 dark:bg-zinc-800"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
            Latitude
          </label>
          <input
            required
            type="number"
            step="any"
            value={form.lat}
            onChange={(e) => setForm({ ...form, lat: e.target.value })}
            className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-zinc-500 dark:border-zinc-700 dark:bg-zinc-800"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
            Longitude
          </label>
          <input
            required
            type="number"
            step="any"
            value={form.lng}
            onChange={(e) => setForm({ ...form, lng: e.target.value })}
            className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-zinc-500 dark:border-zinc-700 dark:bg-zinc-800"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
            Radius (meter)
          </label>
          <input
            required
            type="number"
            value={form.radius_m}
            onChange={(e) => setForm({ ...form, radius_m: e.target.value })}
            className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-zinc-500 dark:border-zinc-700 dark:bg-zinc-800"
          />
        </div>
        <div className="flex items-end gap-2">
          <button
            type="button"
            onClick={useMyLocation}
            disabled={locating}
            className="rounded-md border border-zinc-300 px-3 py-2 text-sm text-zinc-600 hover:bg-zinc-100 disabled:opacity-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
          >
            {locating ? "Mengambil..." : "Gunakan lokasi saya sekarang"}
          </button>
        </div>

        <div className="flex items-end gap-2 lg:col-span-5">
          <button
            type="submit"
            disabled={loading}
            className="rounded-md bg-brand px-4 py-2 text-sm font-medium text-white hover:bg-brand/90 disabled:opacity-50 dark:bg-zinc-50 dark:text-brand"
          >
            {editingId ? "Simpan" : "Tambah Lokasi"}
          </button>
          {editingId && (
            <button
              type="button"
              onClick={resetForm}
              className="rounded-md border border-zinc-300 px-4 py-2 text-sm dark:border-zinc-700"
            >
              Batal
            </button>
          )}
        </div>
      </form>

      {error && (
        <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950 dark:text-red-300">
          {error}
        </p>
      )}

      <div className="overflow-x-auto rounded-xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-zinc-200 text-left text-zinc-500 dark:border-zinc-800">
              <th className="px-4 py-3 font-medium">Nama</th>
              <th className="px-4 py-3 font-medium">Koordinat</th>
              <th className="px-4 py-3 font-medium">Radius</th>
              <th className="px-4 py-3 font-medium"></th>
            </tr>
          </thead>
          <tbody>
            {locations.map((location) => (
              <tr key={location.id} className="border-b border-zinc-100 last:border-0 dark:border-zinc-800">
                <td className="px-4 py-3 font-medium text-zinc-900 dark:text-zinc-50">
                  {location.name}
                </td>
                <td className="px-4 py-3 text-zinc-500">
                  {location.lat.toFixed(6)}, {location.lng.toFixed(6)}
                </td>
                <td className="px-4 py-3 text-zinc-500">{location.radius_m}m</td>
                <td className="px-4 py-3 text-right">
                  <button
                    onClick={() => startEdit(location)}
                    className="mr-3 text-zinc-600 hover:underline dark:text-zinc-300"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleDelete(location.id)}
                    className="text-red-600 hover:underline"
                  >
                    Hapus
                  </button>
                </td>
              </tr>
            ))}
            {!loadingList && locations.length === 0 && (
              <tr>
                <td colSpan={4} className="px-4 py-6 text-center text-zinc-400">
                  Belum ada lokasi.
                </td>
              </tr>
            )}
            {loadingList && (
              <tr>
                <td colSpan={4} className="px-4 py-6 text-center text-zinc-400">
                  Memuat...
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
