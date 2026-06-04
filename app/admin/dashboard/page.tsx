// =============================================================================
// FILE: app/admin/dashboard/page.tsx
// TUJUAN: Halaman dashboard administrator dengan data real dari PostgreSQL.
//         Menampilkan:
//         - 4 stat cards utama (total siswa, guru, kelas, mapel)
//         - Tab Navigasi: Ikhtisar, Analisis Akademik, Peringkat & Kehadiran
//
//         Server Component: data di-fetch langsung di server tanpa API call.
// =============================================================================

import type { Metadata } from "next";
import { Users, School, RefreshCw, GraduationCap, BookOpen } from "lucide-react";
import { getAdminDashboardData } from "@/lib/queries/dashboard";
import StatCard from "@/components/dashboard/StatCard";
import AdminDashboardTabs from "@/components/dashboard/AdminDashboardTabs";
import { getActiveAcademicConfig } from "@/lib/academicConfig";

export const metadata: Metadata = {
  title: "Dashboard Admin",
};

// Revalidate setiap 5 menit agar data selalu segar
export const revalidate = 300;

// ─── PAGE COMPONENT ───────────────────────────────────────────────────────────

export default async function AdminDashboardPage() {
  // Fetch semua data dashboard dalam satu panggilan (paralel query di dalam)
  const data = await getAdminDashboardData();
  const { tahunAjaran, semester } = await getActiveAcademicConfig();

  // Format waktu terakhir update
  const lastUpdatedStr = data.lastUpdated.toLocaleString("id-ID", {
    dateStyle: "medium",
    timeStyle: "short",
  });

  return (
    <div className="space-y-6 max-w-[1400px]">

      {/* ── PAGE HEADER ──────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">
            Dashboard Administrator
          </h1>
          <p className="text-slate-400 text-sm mt-1">
            Rekap akademik SMK PPLG — Semester {semester} {tahunAjaran}
          </p>
        </div>
        {/* Last updated indicator */}
        <div className="flex items-center gap-1.5 text-xs text-slate-500 shrink-0">
          <RefreshCw size={11} className="animate-spin" style={{ animationDuration: "8s" }} />
          <span>Diperbarui: {lastUpdatedStr}</span>
        </div>
      </div>

      {/* ── SECTION 1: STAT CARDS (STATIC DEMOGRAPHICS) ───────────────────── */}
      <section aria-label="Demografi utama">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            label="Total Siswa"
            value={data.totalSiswa}
            unit="siswa"
            icon={Users}
            variant="indigo"
            description="3 kelas XI PPLG aktif"
          />
          <StatCard
            label="Total Guru"
            value={data.totalGuru}
            unit="guru"
            icon={GraduationCap}
            variant="sky"
            description="Tenaga pengajar PPLG"
          />
          <StatCard
            label="Total Kelas"
            value={data.totalKelas}
            unit="kelas"
            icon={School}
            variant="indigo"
            description="XI PPLG 1, 2, dan 3"
          />
          <StatCard
            label="Total Mapel"
            value={data.totalMapel}
            unit="mapel"
            icon={BookOpen}
            variant="sky"
            description="Kurikulum kompetensi"
          />
        </div>
      </section>

      {/* ── SECTION 2: INTERACTIVE TABS (PERFORMANCE & ANALYTICS) ─────────── */}
      <AdminDashboardTabs data={data} />

    </div>
  );
}
