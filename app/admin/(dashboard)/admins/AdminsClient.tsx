"use client";

import { useCallback, useEffect, useState } from "react";

interface AdminRow {
  id: string;
  email: string;
  created_at: string;
}

function formatDate(iso: string): string {
  if (!iso) return "-";
  return new Date(iso).toLocaleDateString("id-ID", {
    timeZone: "Asia/Jakarta",
    dateStyle: "medium",
  });
}

export default function AdminsClient() {
  const [admins, setAdmins] = useState<AdminRow[]>([]);
  const [currentAdminId, setCurrentAdminId] = useState<string | null>(null);
  const [loadingList, setLoadingList] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const fetchData = useCallback(async () => {
    setLoadingList(true);
    const [meRes, adminsRes] = await Promise.all([
      fetch("/api/auth/me"),
      fetch("/api/admins"),
    ]);
    const [meData, adminsData] = await Promise.all([meRes.json(), adminsRes.json()]);
    if (meRes.ok) setCurrentAdminId(meData.adminId);
    if (adminsRes.ok) setAdmins(adminsData.admins);
    setLoadingList(false);
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchData();
  }, [fetchData]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admins", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Gagal menambahkan admin");
        return;
      }
      setEmail("");
      setPassword("");
      await fetchData();
    } catch {
      setError("Terjadi kesalahan jaringan");
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Hapus admin ini? Admin tersebut tidak akan bisa login lagi.")) return;
    const res = await fetch(`/api/admins/${id}`, { method: "DELETE" });
    const data = await res.json();
    if (!res.ok) {
      alert(data.error ?? "Gagal menghapus admin");
      return;
    }
    await fetchData();
  }

  return (
    <div className="flex flex-col gap-6">
      <form
        onSubmit={handleSubmit}
        className="flex flex-col gap-3 rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900 sm:flex-row sm:items-end"
      >
        <div className="flex-1">
          <label className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
            Email
          </label>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-zinc-500 dark:border-zinc-700 dark:bg-zinc-800"
          />
        </div>
        <div className="flex-1">
          <label className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
            Password
          </label>
          <input
            type="password"
            required
            minLength={8}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-zinc-500 dark:border-zinc-700 dark:bg-zinc-800"
          />
        </div>
        <button
          type="submit"
          disabled={loading}
          className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700 disabled:opacity-50 dark:bg-zinc-50 dark:text-zinc-900"
        >
          Tambah Admin
        </button>
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
              <th className="px-4 py-3 font-medium">Email</th>
              <th className="px-4 py-3 font-medium">Dibuat</th>
              <th className="px-4 py-3 font-medium"></th>
            </tr>
          </thead>
          <tbody>
            {admins.map((admin) => (
              <tr key={admin.id} className="border-b border-zinc-100 last:border-0 dark:border-zinc-800">
                <td className="px-4 py-3 font-medium text-zinc-900 dark:text-zinc-50">
                  {admin.email}
                  {admin.id === currentAdminId && (
                    <span className="ml-2 rounded-full bg-zinc-100 px-2 py-0.5 text-xs text-zinc-500 dark:bg-zinc-800">
                      Anda
                    </span>
                  )}
                </td>
                <td className="px-4 py-3 text-zinc-500">{formatDate(admin.created_at)}</td>
                <td className="px-4 py-3 text-right">
                  {admin.id !== currentAdminId && (
                    <button
                      onClick={() => handleDelete(admin.id)}
                      className="text-red-600 hover:underline"
                    >
                      Hapus
                    </button>
                  )}
                </td>
              </tr>
            ))}
            {!loadingList && admins.length === 0 && (
              <tr>
                <td colSpan={3} className="px-4 py-6 text-center text-zinc-400">
                  Belum ada admin.
                </td>
              </tr>
            )}
            {loadingList && (
              <tr>
                <td colSpan={3} className="px-4 py-6 text-center text-zinc-400">
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
