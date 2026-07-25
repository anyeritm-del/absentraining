import AbsenClient from "./AbsenClient";

export default async function AbsenPage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code } = await params;

  return (
    <div className="flex flex-1 justify-center bg-zinc-50 px-4 py-8 dark:bg-black">
      <div className="w-full max-w-md">
        <AbsenClient code={code} />
      </div>
    </div>
  );
}
