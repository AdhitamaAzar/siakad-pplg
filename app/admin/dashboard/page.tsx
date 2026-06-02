// =============================================================================
// FILE: app/admin/dashboard/page.tsx
// TUJUAN: Halaman dashboard administrator dengan data real dari PostgreSQL.
//         Menampilkan:
//         - 4 stat cards utama (total siswa, kelas, rata-rata nilai, ketuntasan)
//         - Ringkasan per kelas (3 kelas XI PPLG)
//         - Grafik interaktif perbandingan nilai/ketuntasan/kehadiran antar kelas
//         - Tabel top 10 siswa berdasarkan nilaiRaport
//
//         Server Component: data di-fetch langsung di server tanpa API call.
//         Semua query berjalan di server — aman, cepat, tidak expose DB ke client.
// =============================================================================

import type { Metadata } from "next";
import {
  Users,
  School,
  TrendingUp,
  CheckCircle,
  RefreshCw,
} from "lucide-react";

import { getAdminDashboardData } from "@/lib/queries/dashboard";
import StatCard         from "@/components/dashboard/StatCard";
import GrafikNilaiKelas from "@/components/dashboard/GrafikNilaiKelas";
import TopSiswaTable    from "@/components/dashboard/TopSiswaTable";
import KelasStatRow     from "@/components/dashboard/KelasStatRow";

export const metadata: Metadata = {
  title: "Dashboard Admin",
};

// Revalidate setiap 5 menit agar data selalu segar
export const revalidate = 300;

// ─── PAGE COMPONENT ───────────────────────────────────────────────────────────

/**
 * Dashboard admin — Server Component yang fetch data langsung dari Prisma.
 * Tidak ada loading state di client; data sudah tersedia saat HTML dikirim.
 */
export default async function AdminDashboardPage() {
  // Fetch semua data dashboard dalam satu panggilan (paralel query di dalam)
  const data = await getAdminDashboardData();

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
            Rekap akademik SMK PPLG — Semester Genap 2025/2026
          </p>
        </div>
        {/* Last updated indicator */}
        <div className="flex items-center gap-1.5 text-xs text-slate-500 shrink-0">
          <RefreshCw size={11} className="animate-spin" style={{ animationDuration: "8s" }} />
          <span>Diperbarui: {lastUpdatedStr}</span>
        </div>
      </div>

      {/* ── SECTION 1: STAT CARDS ─────────────────────────────────────────── */}
      <section aria-label="Ringkasan statistik utama">
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
            label="Total Kelas"
            value={data.totalKelas}
            unit="kelas"
            icon={School}
            variant="sky"
            description="XI PPLG 1, 2, dan 3"
          />
          <StatCard
            label="Rata-rata Nilai"
            value={data.rataRataGlobal}
            icon={TrendingUp}
            variant="emerald"
            description={
              data.rataRataGlobal >= 75
                ? "Di atas KKM 75 ✓"
                : "Di bawah KKM 75"
            }
          />
          <StatCard
            label="Siswa Tuntas"
            value={`${data.persenTuntas}%`}
            icon={CheckCircle}
            variant={data.persenTuntas >= 75 ? "emerald" : "amber"}
            description={`dari ${data.totalSiswa} total siswa`}
          />
        </div>
      </section>

      {/* ── SECTION 2: RINGKASAN PER KELAS ───────────────────────────────── */}
      <section aria-label="Ringkasan statistik per kelas">
        <div className="mb-3 flex items-center gap-2">
          <div className="w-1 h-4 rounded-full bg-indigo-500" />
          <h2 className="text-sm font-semibold text-slate-300">
            Ringkasan Per Kelas
          </h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {data.kelasStats.map((kelas, i) => (
            <KelasStatRow key={kelas.id} kelas={kelas} index={i} />
          ))}
        </div>
      </section>

      {/* ── SECTION 3: GRAFIK PERBANDINGAN ───────────────────────────────── */}
      <section aria-label="Grafik perbandingan statistik antar kelas">
        <div className="mb-3 flex items-center gap-2">
          <div className="w-1 h-4 rounded-full bg-indigo-500" />
          <h2 className="text-sm font-semibold text-slate-300">
            Grafik Perbandingan Kelas
          </h2>
        </div>
        <GrafikNilaiKelas data={data.grafikData} />
      </section>

      {/* ── SECTION 4: TOP 10 SISWA ───────────────────────────────────────── */}
      <section aria-label="Tabel peringkat siswa berprestasi">
        <div className="mb-3 flex items-center gap-2">
          <div className="w-1 h-4 rounded-full bg-amber-400" />
          <h2 className="text-sm font-semibold text-slate-300">
            Peringkat Siswa
          </h2>
        </div>
        <TopSiswaTable data={data.topSiswa} />
      </section>

    </div>
  );
}
