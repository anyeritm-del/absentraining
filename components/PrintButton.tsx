"use client";

export default function PrintButton() {
  return (
    <button
      onClick={() => window.print()}
      className="rounded-md bg-brand px-4 py-2 text-sm font-medium text-white hover:bg-brand/90 dark:bg-zinc-50 dark:text-brand print:hidden"
    >
      Cetak
    </button>
  );
}
