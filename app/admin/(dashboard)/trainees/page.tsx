import TraineesClient from "./TraineesClient";

export default function TraineesPage() {
  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
        Anak Training
      </h1>
      <TraineesClient />
    </div>
  );
}
