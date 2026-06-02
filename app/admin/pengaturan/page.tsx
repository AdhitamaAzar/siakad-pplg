// =============================================================================
// FILE: app/admin/pengaturan/page.tsx
// TUJUAN: Halaman pengaturan sistem admin — informasi sistem & konfigurasi.
// =============================================================================

import type { Metadata } from "next";
import { Settings, Database, Shield, Info } from "lucide-react";

export const metadata: Metadata = { title: "Pengaturan Sistem — Admin" };

export default function AdminPengaturanPage() {
  return (
    <div className="space-y-6 max-w-[800px]">
      <div className="flex items-center gap-3">
        <Settings size={20} className="text-indigo-400" />
        <h1 className="text-xl font-bold text-white">Pengaturan Sistem</h1>
      </div>

      {/* Info sistem */}
      <div className="rounded-2xl border border-slate-800/60 bg-slate-900/60 divide-y divide-slate-800/60">
        <div className="px-5 py-4 flex items-center gap-3">
          <Info size={16} className="text-indigo-400 shrink-0" />
          <span className="text-sm font-semibold text-slate-300">Informasi Sistem</span>
        </div>
        {[
          { label: "Nama Sistem",     value: "SIAKAD PPLG" },
          { label: "Versi",           value: "1.0.0" },
          { label: "Tahun Ajaran",    value: "2025/2026" },
          { label: "Semester Aktif",  value: "Genap" },
          { label: "Guru Pengampu",   value: "Fandik Ariyanto, S.ST" },
          { label: "Jurusan",         value: "Pengembangan Perangkat Lunak dan Gim (PPLG)" },
          { label: "Framework",       value: "Next.js 15.3.9 + Prisma v7 + PostgreSQL" },
        ].map(({ label, value }) => (
          <div key={label} className="px-5 py-3 flex items-center justify-between">
            <span className="text-xs text-slate-500">{label}</span>
            <span className="text-xs font-medium text-slate-300">{value}</span>
          </div>
        ))}
      </div>

      {/* Database */}
      <div className="rounded-2xl border border-slate-800/60 bg-slate-900/60 divide-y divide-slate-800/60">
        <div className="px-5 py-4 flex items-center gap-3">
          <Database size={16} className="text-emerald-400 shrink-0" />
          <span className="text-sm font-semibold text-slate-300">Database</span>
        </div>
        {[
          { label: "Engine",   value: "PostgreSQL" },
          { label: "ORM",      value: "Prisma v7" },
          { label: "Host",     value: "localhost:5432" },
          { label: "Database", value: "siakad_pplg" },
        ].map(({ label, value }) => (
          <div key={label} className="px-5 py-3 flex items-center justify-between">
            <span className="text-xs text-slate-500">{label}</span>
            <span className="text-xs font-medium text-slate-300 font-mono">{value}</span>
          </div>
        ))}
      </div>

      {/* Keamanan */}
      <div className="rounded-2xl border border-amber-500/20 bg-amber-500/5 p-5 flex items-start gap-3">
        <Shield size={16} className="text-amber-400 mt-0.5 shrink-0" />
        <div>
          <p className="text-sm font-semibold text-amber-300">Catatan Keamanan</p>
          <p className="text-xs text-slate-400 mt-1">
            Pastikan <code className="text-amber-400 bg-amber-500/10 px-1 rounded">AUTH_SECRET</code> diganti
            dengan nilai random yang kuat sebelum deploy ke produksi.
            Gunakan: <code className="text-slate-300 bg-slate-800 px-1.5 py-0.5 rounded text-[11px]">openssl rand -base64 32</code>
          </p>
        </div>
      </div>
    </div>
  );
}
