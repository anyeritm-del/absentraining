"use client";

import { useCallback, useEffect, useState } from "react";
import type { AdminRole } from "@/lib/repositories/admins";
import type { Department } from "@/lib/repositories/departments";

interface AdminRow {
  id: string;
  email: string;
  created_at: string;
  role: AdminRole;
  department_id: string;
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
  const [departments, setDepartments] = useState<Department[]>([]);
  const [currentAdminId, setCurrentAdminId] = useState<string | null>(null);
  const [loadingList, setLoadingList] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<AdminRole>("full_access");
  const [departmentId, setDepartmentId] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const departmentName = (id: string) =>
    departments.find((d) => d.id === id)?.name ?? "-";

  const fetchData = useCallback(async () => {
    setLoadingList(true);
    const [meRes, adminsRes, deptRes] = await Promise.all([
      fetch("/api/auth/me"),
      fetch("/api/admins"),
      fetch("/api/departments"),
    ]);
    const [meData, adminsData, deptData] = await Promise.all([
      meRes.json(),
      adminsRes.json(),
      deptRes.json(),
    ]);
    if (meRes.ok) setCurrentAdminId(meData.adminId);
    if (adminsRes.ok) setAdmins(adminsData.admins);
    if (deptRes.ok) setDepartments(deptData.departments);
    setLoadingList(false);
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchData();
  }, [fetchData]);

  function resetForm() {
    setEditingId(null);
    setEmail("");
    setPassword("");
    setRole("full_access");
    setDepartmentId("");
    setError(null);
  }

  function startEdit(admin: AdminRow) {
    setEditingId(admin.id);
    setEmail(admin.email);
    setPassword("");
    setRole(admin.role);
    setDepartmentId(admin.department_id);
    setError(null);
  }

  const isEditingSelf = editingId !== null && editingId === currentAdminId;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (role === "department_admin" && !departmentId) {
      setError("Pilih department untuk admin department");
      return;
    }
    if (!editingId && !password) {
      setError("Password wajib diisi");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const payload: Record<string, unknown> = { email, role, department_id: departmentId };
      if (password) payload.password = password;

      const res = await fetch(editingId ? `/api/admins/${editingId}` : "/api/admins", {
        method: editingId ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Gagal menyimpan admin");
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
        className="grid grid-cols-1 gap-3 rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900 sm:grid-cols-2 lg:grid-cols-5"
      >
        <div>
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
        <div>
          <label className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
            Password
          </label>
          <input
            type="password"
            required={!editingId}
            minLength={8}
            placeholder={editingId ? "Kosongkan jika tidak diubah" : ""}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-zinc-500 dark:border-zinc-700 dark:bg-zinc-800"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
            Role
          </label>
          <select
            value={role}
            disabled={isEditingSelf}
            onChange={(e) => setRole(e.target.value as AdminRole)}
            className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-zinc-500 disabled:opacity-50 dark:border-zinc-700 dark:bg-zinc-800"
          >
            <option value="full_access">Full Access</option>
            <option value="department_admin">Admin Department</option>
          </select>
          {isEditingSelf && (
            <p className="mt-1 text-xs text-zinc-400">Tidak bisa ubah role akun sendiri.</p>
          )}
        </div>
        {role === "department_admin" && (
          <div>
            <label className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
              Department
            </label>
            <select
              value={departmentId}
              disabled={isEditingSelf}
              onChange={(e) => setDepartmentId(e.target.value)}
              className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-zinc-500 disabled:opacity-50 dark:border-zinc-700 dark:bg-zinc-800"
            >
              <option value="">Pilih...</option>
              {departments.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </select>
          </div>
        )}
        <div className="flex items-end gap-2">
          <button
            type="submit"
            disabled={loading}
            className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700 disabled:opacity-50 dark:bg-zinc-50 dark:text-zinc-900"
          >
            {editingId ? "Simpan" : "Tambah Admin"}
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
              <th className="px-4 py-3 font-medium">Email</th>
              <th className="px-4 py-3 font-medium">Role</th>
              <th className="px-4 py-3 font-medium">Department</th>
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
                <td className="px-4 py-3">
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs ${
                      admin.role === "full_access"
                        ? "bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300"
                        : "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300"
                    }`}
                  >
                    {admin.role === "full_access" ? "Full Access" : "Admin Department"}
                  </span>
                </td>
                <td className="px-4 py-3 text-zinc-500">
                  {admin.role === "department_admin" ? departmentName(admin.department_id) : "-"}
                </td>
                <td className="px-4 py-3 text-zinc-500">{formatDate(admin.created_at)}</td>
                <td className="px-4 py-3 text-right whitespace-nowrap">
                  <button
                    onClick={() => startEdit(admin)}
                    className="mr-3 text-zinc-600 hover:underline dark:text-zinc-300"
                  >
                    Edit
                  </button>
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
                <td colSpan={5} className="px-4 py-6 text-center text-zinc-400">
                  Belum ada admin.
                </td>
              </tr>
            )}
            {loadingList && (
              <tr>
                <td colSpan={5} className="px-4 py-6 text-center text-zinc-400">
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
