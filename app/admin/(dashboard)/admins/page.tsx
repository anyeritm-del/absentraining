import AdminsClient from "./AdminsClient";

export default function AdminsPage() {
  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">Kelola Admin</h1>
      <AdminsClient />
    </div>
  );
}
