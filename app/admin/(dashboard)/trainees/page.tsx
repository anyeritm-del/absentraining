import { listTrainees } from "@/lib/repositories/trainees";
import { listDepartments } from "@/lib/repositories/departments";
import TraineesClient from "./TraineesClient";

export default async function TraineesPage() {
  const [trainees, departments] = await Promise.all([
    listTrainees(),
    listDepartments(),
  ]);

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
        Anak Training
      </h1>
      <TraineesClient initialTrainees={trainees} departments={departments} />
    </div>
  );
}
