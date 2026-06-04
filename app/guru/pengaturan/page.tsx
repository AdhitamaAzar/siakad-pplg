// =============================================================================
// FILE: app/guru/pengaturan/page.tsx
// TUJUAN: Halaman pengaturan guru — info konfigurasi semester aktif.
// =============================================================================

import type { Metadata } from "next";
import { Settings } from "lucide-react";

import prisma            from "@/lib/prisma";
import { getActiveAcademicConfig } from "@/lib/academicConfig";

export const metadata: Metadata = { title: "Pengaturan — Guru" };

export default async function GuruPengaturanPage() {
  const { tahunAjaran, semester } = await getActiveAcademicConfig();

  return (
    <div className="space-y-6 max-w-[600px]">
      <div className="flex items-center gap-3">
        <Settings size={20} className="text-indigo-400" />
        <h1 className="text-xl font-bold text-white">Pengaturan</h1>
      </div>

      <div className="rounded-2xl border border-slate-800/60 bg-slate-900/60 divide-y divide-slate-800/60">
        <div className="px-5 py-4">
          <p className="text-sm font-semibold text-slate-300">Konfigurasi Aktif</p>
        </div>
        {[
          { label: "Semester Aktif",  value: semester },
          { label: "Tahun Ajaran",    value: tahunAjaran },
          { label: "Jurusan",         value: "PPLG (Pengembangan Perangkat Lunak dan Gim)" },
          { label: "Kelas Aktif",     value: "XI PPLG 1, XI PPLG 2, XI PPLG 3" },
          { label: "KKM",             value: "75" },
          { label: "Format File Import", value: `Nilai${semester}${tahunAjaran.replace("/", "").substring(2)}.xlsx` },
        ].map(({ label, value }) => (
          <div key={label} className="px-5 py-3.5 flex items-center justify-between">
            <span className="text-xs text-slate-500">{label}</span>
            <span className="text-xs font-medium text-slate-300">{value}</span>
          </div>
        ))}
      </div>

      <div className="rounded-xl border border-indigo-500/20 bg-indigo-500/5 p-4">
        <p className="text-xs text-slate-400">
          Pengaturan sistem dikelola oleh <span className="text-indigo-300 font-medium">Administrator</span>.
          Hubungi admin untuk mengubah konfigurasi semester atau tahun ajaran.
        </p>
      </div>
    </div>
  );
}
