// =============================================================================
// FILE: components/dashboard/AdminDashboardTabs.tsx
// TUJUAN: Menampung tab-switching untuk dashboard administrator.
//         Memisahkan tampilan menjadi:
//         1. Ikhtisar (Ringkasan statistik & top tabel)
//         2. Analisis Akademik (Grafik mapel & distribusi predikat)
//         3. Peringkat & Kehadiran (Top/Bottom performer & kelas rank)
//         Client Component untuk interaktivitas tab instan tanpa reload page.
// =============================================================================

"use client";

import { useState } from "react";
import { LayoutDashboard, BarChart3, Trophy, TrendingUp, CheckCircle, XCircle, Loader2 } from "lucide-react";
import type { AdminDashboardData } from "@/lib/queries/dashboard";
import StatCard from "@/components/dashboard/StatCard";
import KelasStatRow from "@/components/dashboard/KelasStatRow";
import TopSiswaTable from "@/components/dashboard/TopSiswaTable";
import dynamic from "next/dynamic";

const GrafikAnalytics = dynamic(() => import("@/components/dashboard/GrafikAnalytics"), {
  ssr: false,
  loading: () => (
    <div className="h-80 w-full flex items-center justify-center bg-slate-900/60 rounded-2xl border border-slate-800/60">
      <Loader2 className="animate-spin text-indigo-400 h-6 w-6" />
    </div>
  ),
});

const RankingsSection = dynamic(() => import("@/components/dashboard/RankingsSection"), {
  ssr: false,
  loading: () => (
    <div className="h-40 w-full flex items-center justify-center bg-slate-900/60 rounded-2xl border border-slate-800/60">
      <Loader2 className="animate-spin text-indigo-400 h-6 w-6" />
    </div>
  ),
});

interface AdminDashboardTabsProps {
  data: AdminDashboardData;
}

export default function AdminDashboardTabs({ data }: AdminDashboardTabsProps) {
  const [activeTab, setActiveTab] = useState<"overview" | "academic" | "rankings">("overview");

  return (
    <div className="space-y-6">
      {/* ─── TAB SWITCHER ─────────────────────────────────────────────────── */}
      <div className="flex border-b border-slate-800/80">
        {[
          { id: "overview", label: "Ikhtisar", icon: LayoutDashboard },
          { id: "academic", label: "Analisis Akademik", icon: BarChart3 },
          { id: "rankings", label: "Peringkat & Performa", icon: Trophy },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`
                flex items-center gap-2 px-5 py-3 text-xs font-bold uppercase tracking-wider
                border-b-2 transition-all duration-200 -mb-[2px]
                ${
                  isActive
                    ? "border-indigo-500 text-indigo-400 font-extrabold"
                    : "border-transparent text-slate-500 hover:text-slate-300 hover:border-slate-800"
                }
              `}
            >
              <Icon size={14} />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* ─── TAB CONTENT ─────────────────────────────────────────────────── */}
      <div className="transition-all duration-300">
        {activeTab === "overview" && (
          <div className="space-y-6 animate-fadeIn">
            {/* Row 2: Performa Akademik */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <StatCard
                label="Rata-rata Nilai"
                value={data.rataRataGlobal}
                icon={TrendingUp}
                variant="emerald"
                description={data.rataRataGlobal >= 75 ? "Di atas KKM 75 ✓" : "Di bawah KKM 75"}
              />
              <StatCard
                label="Jumlah Siswa Tuntas"
                value={data.totalSiswa - data.totalBelumTuntas}
                unit="siswa"
                icon={CheckCircle}
                variant="emerald"
                description={`${data.persenTuntas}% dari total siswa tuntas`}
              />
              <StatCard
                label="Jumlah Siswa Belum Tuntas"
                value={data.totalBelumTuntas}
                unit="siswa"
                icon={XCircle}
                variant="rose"
                description={`${(100 - data.persenTuntas).toFixed(1)}% siswa belum tuntas`}
              />
            </div>

            {/* Ringkasan Per Kelas */}
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <div className="w-1 h-4 rounded-full bg-indigo-500" />
                <h2 className="text-sm font-semibold text-slate-300">Ringkasan Per Kelas</h2>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {data.kelasStats.map((kelas, i) => (
                  <KelasStatRow key={kelas.id} kelas={kelas} index={i} />
                ))}
              </div>
            </div>

            {/* Top 10 Siswa Table */}
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <div className="w-1 h-4 rounded-full bg-amber-400" />
                <h2 className="text-sm font-semibold text-slate-300">Sekilas Peringkat Siswa</h2>
              </div>
              <TopSiswaTable data={data.topSiswa} />
            </div>
          </div>
        )}

        {activeTab === "academic" && (
          <div className="animate-fadeIn">
            <GrafikAnalytics
              mapelStats={data.mapelStats}
              distribusiNilai={data.distribusiNilai}
              grafikKelasData={data.grafikData}
              totalSiswa={data.totalSiswa}
              totalBelumTuntas={data.totalBelumTuntas}
            />
          </div>
        )}

        {activeTab === "rankings" && (
          <div className="animate-fadeIn">
            <RankingsSection
              topSiswa={data.topSiswa}
              bottomSiswa={data.bottomSiswa}
              kelasStats={data.kelasStats}
            />
          </div>
        )}
      </div>
    </div>
  );
}
