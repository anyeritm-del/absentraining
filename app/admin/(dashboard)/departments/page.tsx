import { listDepartments } from "@/lib/repositories/departments";
import DepartmentsClient from "./DepartmentsClient";

export default async function DepartmentsPage() {
  const departments = await listDepartments();

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">Department</h1>
      <DepartmentsClient initialDepartments={departments} />
    </div>
  );
}
