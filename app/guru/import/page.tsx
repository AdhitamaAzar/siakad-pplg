// =============================================================================
// FILE: app/guru/import/page.tsx
// TUJUAN: Halaman import data Excel (NilaiGenap2526.xlsx).
//         - Upload file Excel via drag & drop atau file picker
//         - Preview data sebelum disimpan ke database
//         - Progress bar import per sheet
//         - Laporan sukses/gagal per baris
// =============================================================================

import type { Metadata } from "next";
import { FileSpreadsheet } from "lucide-react";
import ImportForm from "./ImportForm";

export const metadata: Metadata = { title: "Import Excel — Guru" };

export default function GuruImportPage() {
  return (
    <div className="space-y-6 max-w-[900px]">

      {/* Header */}
      <div>
        <div className="flex items-center gap-2 mb-1">
          <span className="text-2xl">📊</span>
          <h1 className="text-xl font-bold text-white">Import Data Excel</h1>
        </div>
        <p className="text-slate-500 text-sm">
          Upload file <code className="text-indigo-400 bg-indigo-500/10 px-1.5 py-0.5 rounded text-xs">NilaiGenap2526.xlsx</code> untuk
          memperbarui data nilai semua siswa ke database.
        </p>
      </div>

      {/* Info cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[
          { emoji: "📋", title: "3 Sheet Nilai", desc: "xipplg1, xipplg2, xipplg3 — 9 komponen nilai per siswa" },
          { emoji: "📅", title: "9 Sheet Absensi", desc: "Kehadiran per bulan (Juli–Maret) + rekap semester" },
          { emoji: "🔄", title: "Upsert Otomatis", desc: "Data yang sudah ada akan diperbarui, siswa baru ditambahkan" },
        ].map(({ emoji, title, desc }) => (
          <div key={title} className="rounded-xl border border-slate-800/60 bg-slate-900/40 p-4">
            <span className="text-xl">{emoji}</span>
            <p className="text-sm font-semibold text-slate-200 mt-2">{title}</p>
            <p className="text-xs text-slate-500 mt-0.5">{desc}</p>
          </div>
        ))}
      </div>

      {/* Download template bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-2xl border border-slate-800/60 bg-slate-900/40">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/10 border border-emerald-500/20 shrink-0">
            <FileSpreadsheet className="h-5 w-5 text-emerald-400" />
          </div>
          <div>
            <h3 className="text-xs font-bold text-white uppercase tracking-wider">Template Resmi Excel</h3>
            <p className="text-xs text-slate-500 mt-0.5">Unduh template format import untuk memudahkan pemetaan kolom data.</p>
          </div>
        </div>
        <a
          href="/template_import_nilai.xlsx"
          download
          className="flex items-center justify-center gap-1.5 px-4 py-2 bg-slate-800 hover:bg-slate-750 text-slate-200 hover:text-white rounded-xl text-xs font-semibold border border-slate-700/60 transition-colors shrink-0 cursor-pointer"
        >
          <span>Unduh Template</span>
          <span>&darr;</span>
        </a>
      </div>

      {/* Form import — client component */}
      <ImportForm />

    </div>
  );
}
