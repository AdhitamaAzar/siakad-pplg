// =============================================================================
// FILE: components/dashboard/CetakButton.tsx
// TUJUAN: Client component tombol cetak menggunakan window.print().
// =============================================================================

"use client";

import { Printer } from "lucide-react";

export default function CetakButton() {
  const handlePrint = () => {
    if (typeof window !== "undefined") {
      window.print();
    }
  };

  return (
    <button
      onClick={handlePrint}
      className="
        flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold
        bg-slate-800/60 text-slate-400 border border-slate-700/40
        hover:bg-slate-700/60 hover:text-slate-200 transition-colors
        print:hidden cursor-pointer
      "
      type="button"
      aria-label="Cetak laporan"
    >
      <Printer size={14} />
      Cetak
    </button>
  );
}
