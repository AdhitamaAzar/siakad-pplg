/**
 * @file app/admin/import/page.tsx
 * @description Admin import page for uploading student grade data via Excel.
 *              Reuses the ImportForm component from the guru import flow and
 *              adds admin-specific context and instructions.
 * @module SIAKAD PPLG — Admin Import Data Excel
 */

import type { Metadata } from 'next';
import { Upload, FileSpreadsheet, Info, ShieldCheck, AlertTriangle } from 'lucide-react';
import ImportForm from '@/app/guru/import/ImportForm';

export const metadata: Metadata = {
  title: 'Import Data Excel — Admin — SIAKAD PPLG',
};

// ─── Info card ────────────────────────────────────────────────────────────────
function InfoCard({
  icon,
  title,
  description,
  accent,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  accent: string;
}) {
  return (
    <div className={`flex gap-4 rounded-xl border p-4 ${accent}`}>
      <div className="mt-0.5 shrink-0">{icon}</div>
      <div>
        <p className="text-sm font-semibold text-white">{title}</p>
        <p className="mt-0.5 text-xs leading-relaxed text-slate-400">{description}</p>
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function ImportAdminPage() {
  return (
    <div className="min-h-screen bg-slate-950 px-6 py-10">
      {/* ── Page header ── */}
      <div className="mb-8 flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-500/20">
          <Upload className="h-5 w-5 text-indigo-400" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-white">Import Data Excel — Admin</h1>
          <p className="text-sm text-slate-500">
            Upload file Excel untuk mengimpor nilai raport siswa secara massal
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
        {/* ── Left: Info panel ── */}
        <div className="space-y-5 lg:col-span-1">
          {/* Admin badge */}
          <div className="flex items-center gap-2 rounded-xl border border-rose-500/20 bg-rose-500/10 px-4 py-3">
            <ShieldCheck className="h-4 w-4 text-rose-400 shrink-0" />
            <p className="text-sm font-semibold text-rose-300">Akses Admin</p>
          </div>

          {/* Section title */}
          <div>
            <h2 className="text-base font-semibold text-white">Panduan Import</h2>
            <p className="mt-1 text-xs text-slate-500">
              Perhatikan format file sebelum mengupload untuk menghindari kesalahan data.
            </p>
          </div>

          <div className="space-y-3">
            <InfoCard
              icon={<FileSpreadsheet className="h-4 w-4 text-emerald-400" />}
              title="Format File Excel (.xlsx)"
              description="File harus berformat .xlsx dengan header: NIS, Nama, Nilai, Predikat, Semester, Tahun Ajaran."
              accent="border-emerald-500/20 bg-emerald-500/10"
            />
            <InfoCard
              icon={<Info className="h-4 w-4 text-sky-400" />}
              title="Kolom Wajib"
              description="Pastikan kolom NIS dan Nilai terisi. NIS harus cocok dengan data siswa yang sudah ada di sistem."
              accent="border-sky-500/20 bg-sky-500/10"
            />
            <InfoCard
              icon={<AlertTriangle className="h-4 w-4 text-amber-400" />}
              title="Perhatian Admin"
              description="Sebagai admin, import Anda akan mempengaruhi seluruh data sistem. Pastikan file telah divalidasi sebelum diupload."
              accent="border-amber-500/20 bg-amber-500/10"
            />
          </div>

          {/* Download template */}
          <div className="rounded-xl border border-slate-800/60 bg-slate-900/60 p-4">
            <p className="text-xs font-semibold text-slate-400 mb-3">Template Excel</p>
            <p className="text-xs text-slate-500 mb-3">
              Gunakan template resmi SIAKAD untuk memastikan format import yang benar.
            </p>
            <div className="flex items-center gap-2 rounded-lg bg-slate-800/60 px-3 py-2">
              <FileSpreadsheet className="h-4 w-4 text-emerald-400" />
              <span className="text-xs text-slate-300 flex-1">template_import_nilai.xlsx</span>
              <span className="text-[10px] text-slate-600">— tersedia dari guru</span>
            </div>
          </div>
        </div>

        {/* ── Right: Import form ── */}
        <div className="lg:col-span-2">
          <div className="rounded-2xl border border-slate-800/60 bg-slate-900/60 overflow-hidden backdrop-blur-sm">
            {/* Form header */}
            <div className="border-b border-slate-800/60 px-6 py-4">
              <div className="flex items-center gap-2">
                <Upload className="h-4 w-4 text-indigo-400" />
                <h3 className="text-sm font-semibold text-white">Upload File Excel</h3>
              </div>
              <p className="mt-1 text-xs text-slate-500">
                Form ini sama dengan form yang digunakan oleh guru. Admin dapat mengimport data untuk semua kelas.
              </p>
            </div>

            {/* Reused ImportForm component */}
            <div className="p-6">
              <ImportForm />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
