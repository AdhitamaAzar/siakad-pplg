"use client";

// =============================================================================
// FILE: components/dashboard/GuruDashboardTabs.tsx
// TUJUAN: Komponen tab-switcher untuk dashboard guru.
//         Membagi konten yang ramai menjadi 3 tab sederhana:
//         1. Ikhtisar (Aksi cepat & daftar kelas)
//         2. Analisis & Grafik (Grafik kelas & statistik nilai)
//         3. Nilai Terbaru (Log nilai terbaru diinput)
// =============================================================================

import { useState } from "react";
import { LayoutDashboard, BarChart3, Clock, Users, BookOpen, ChevronRight, Award } from "lucide-react";
import Link from "next/link";
import GrafikPerformaGuru from "@/components/dashboard/GrafikPerformaGuru";

interface ClassStudent {
  id: number;
  nama: string;
}

interface ClassInfo {
  id: number;
  namaKelas: string;
  students: ClassStudent[];
}

interface RecentGrade {
  id: number;
  student: {
    nama: string;
    kelas?: {
      namaKelas: string;
    } | null;
  };
  nilaiRaport: number | null;
}

interface GuruDashboardTabsProps {
  totalSiswa: number;
  kelas: ClassInfo[];
  avgNilaiGlobal: number;
  pctTuntas: number;
  tuntasCount: number;
  avgKehadiranGlobal: number;
  kelasStatsForChart: any[];
  recentGrades: RecentGrade[];
}

export default function GuruDashboardTabs({
  totalSiswa,
  kelas,
  avgNilaiGlobal,
  pctTuntas,
  tuntasCount,
  avgKehadiranGlobal,
  kelasStatsForChart,
  recentGrades,
}: GuruDashboardTabsProps) {
  const [activeTab, setActiveTab] = useState<"overview" | "analysis" | "recent">("overview");

  const KELAS_THEME = [
    { dot: "bg-indigo-400",  text: "text-indigo-400",  ring: "ring-indigo-500/30",  bg: "bg-indigo-500/10" },
    { dot: "bg-emerald-400", text: "text-emerald-400", ring: "ring-emerald-500/30", bg: "bg-emerald-500/10" },
    { dot: "bg-amber-400",   text: "text-amber-400",   ring: "ring-amber-500/30",   bg: "bg-amber-500/10" },
  ];

  return (
    <div className="space-y-6">
      {/* ─── TAB SWITCHER ─── */}
      <div className="flex border-b border-slate-800/80">
        {[
          { id: "overview", label: "Ikhtisar", icon: LayoutDashboard },
          { id: "analysis", label: "Analisis & Grafik", icon: BarChart3 },
          { id: "recent", label: "Nilai Terbaru", icon: Clock },
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

      {/* ─── TAB CONTENT ─── */}
      <div className="transition-all duration-300">
        {activeTab === "overview" && (
          <div className="space-y-6 animate-fadeIn">
            {/* Quick Actions */}
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <div className="w-1 h-4 rounded-full bg-sky-400" />
                <h2 className="text-sm font-semibold text-slate-300">Aksi Cepat</h2>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {[
                  { label: "Import Excel",   href: "/guru/import",   emoji: "📊" },
                  { label: "Daftar Siswa",   href: "/guru/siswa",    emoji: "👥" },
                  { label: "Nilai Siswa",    href: "/guru/nilai",    emoji: "📝" },
                  { label: "Absensi",        href: "/guru/absensi",  emoji: "✅" },
                ].map(({ label, href, emoji }) => (
                  <Link
                    key={label}
                    href={href}
                    className="
                      flex items-center gap-3 p-4 rounded-xl
                      border border-slate-800/60 bg-slate-900/40
                      hover:bg-slate-800/60 hover:border-slate-700/60
                      transition-all duration-200 group
                    "
                  >
                    <span className="text-xl">{emoji}</span>
                    <span className="text-sm font-medium text-slate-300 group-hover:text-white transition-colors">
                      {label}
                    </span>
                  </Link>
                ))}
              </div>
            </div>

            {/* Kelas yang Diampu */}
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <div className="w-1 h-4 rounded-full bg-indigo-500" />
                <h2 className="text-sm font-semibold text-slate-300">Kelas yang Diampu</h2>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {kelas.map((k, i) => {
                  const theme = KELAS_THEME[i % KELAS_THEME.length] || KELAS_THEME[0]!;
                  return (
                    <div
                      key={k.id}
                      className="rounded-2xl border border-slate-800/60 bg-slate-900/60 p-5"
                    >
                      {/* Header */}
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-2">
                          <span className={`w-2.5 h-2.5 rounded-full ${theme.dot}`} />
                          <h3 className="font-bold text-white text-sm">{k.namaKelas}</h3>
                        </div>
                        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${theme.bg} ${theme.text}`}>
                          {k.students.length} siswa
                        </span>
                      </div>

                      {/* Mini daftar siswa */}
                      <div className="space-y-1.5 mb-4">
                        {k.students.slice(0, 4).map((s) => (
                          <div key={s.id} className="flex items-center gap-2">
                            <div className={`w-6 h-6 rounded-full ${theme.bg} ring-1 ${theme.ring} flex items-center justify-center shrink-0`}>
                              <span className={`text-[9px] font-bold ${theme.text}`}>
                                {s.nama.charAt(0)}
                              </span>
                            </div>
                            <span className="text-xs text-slate-400 truncate">{s.nama}</span>
                          </div>
                        ))}
                        {k.students.length > 4 && (
                          <p className="text-xs text-slate-600 pl-8">
                            +{k.students.length - 4} siswa lainnya
                          </p>
                        )}
                      </div>

                      <Link
                        href={`/guru/siswa?kelas=${k.id}`}
                        className={`
                          flex items-center justify-between w-full
                          px-3 py-2 rounded-xl text-xs font-semibold
                          ${theme.bg} ${theme.text}
                          hover:opacity-80 transition-opacity
                        `}
                      >
                        <span>Lihat semua siswa</span>
                        <ChevronRight size={14} />
                      </Link>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {activeTab === "analysis" && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-fadeIn">
            {/* Chart */}
            <div className="lg:col-span-2">
              <GrafikPerformaGuru data={kelasStatsForChart} />
            </div>

            {/* Statistik Akademik */}
            <div className="rounded-2xl border border-slate-800/60 bg-slate-900/60 p-5 flex flex-col justify-between">
              <div>
                <h3 className="text-sm font-bold text-white uppercase tracking-wider mb-4">Statistik Akademik</h3>
                <div className="space-y-3.5">
                  <div className="flex justify-between items-center pb-2.5 border-b border-slate-800/60">
                    <span className="text-xs text-slate-500">Rata-rata Nilai Tuntas</span>
                    <span className="text-sm font-semibold text-emerald-400 tabular-nums">
                      {avgNilaiGlobal ? avgNilaiGlobal.toFixed(1) : "—"}
                    </span>
                  </div>
                  <div className="flex justify-between items-center pb-2.5 border-b border-slate-800/60">
                    <span className="text-xs text-slate-500">Persentase Ketuntasan</span>
                    <span className="text-sm font-semibold text-indigo-300 tabular-nums">
                      {pctTuntas}%
                    </span>
                  </div>
                  <div className="flex justify-between items-center pb-2.5 border-b border-slate-800/60">
                    <span className="text-xs text-slate-500">Jumlah Siswa Tuntas</span>
                    <span className="text-xs font-bold text-slate-300">
                      <span className="text-emerald-400">{tuntasCount}</span> / {totalSiswa} siswa
                    </span>
                  </div>
                  <div className="flex justify-between items-center pb-2.5 border-b border-slate-800/60">
                    <span className="text-xs text-slate-500">Jumlah Siswa Belum Tuntas</span>
                    <span className="text-xs font-bold text-slate-300">
                      <span className="text-rose-400">{totalSiswa - tuntasCount}</span> siswa
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-slate-500">Rata-rata Kehadiran</span>
                    <span className="text-sm font-semibold text-amber-400 tabular-nums">
                      {avgKehadiranGlobal ? `${avgKehadiranGlobal.toFixed(1)}%` : "—"}
                    </span>
                  </div>
                </div>
              </div>

              <div className="mt-6 pt-4 border-t border-slate-800/60">
                <div className="flex items-center justify-between text-[11px] text-slate-600 mb-2">
                  <span>Kehadiran Kumulatif</span>
                  <span className="font-semibold text-slate-400">{avgKehadiranGlobal.toFixed(1)}%</span>
                </div>
                <div className="h-2 rounded-full bg-slate-800">
                  <div
                    className="h-2 rounded-full bg-amber-400"
                    style={{ width: `${avgKehadiranGlobal}%` }}
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === "recent" && (
          <div className="space-y-3 animate-fadeIn">
            {recentGrades.length === 0 ? (
              <div className="rounded-2xl border border-slate-800/60 bg-slate-900/60 p-8 text-center">
                <p className="text-slate-500 text-sm">Belum ada rekap nilai terbaru yang diinput.</p>
              </div>
            ) : (
              <div className="rounded-2xl border border-slate-800/60 bg-slate-900/60 overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-800/60">
                      {["Siswa", "Kelas", "Nilai Raport"].map((h) => (
                        <th key={h} className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/40">
                    {recentGrades.map((g) => (
                      <tr key={g.id} className="hover:bg-white/[0.02] transition-colors">
                        <td className="px-4 py-3 text-slate-200 font-medium text-sm">
                          {g.student.nama}
                        </td>
                        <td className="px-4 py-3 text-slate-500 text-xs">
                          {g.student.kelas?.namaKelas ?? "-"}
                        </td>
                        <td className="px-4 py-3">
                          <span className={`
                            text-sm font-bold tabular-nums
                            ${(g.nilaiRaport ?? 0) >= 90 ? "text-emerald-400" :
                              (g.nilaiRaport ?? 0) >= 75 ? "text-indigo-400" :
                              "text-amber-400"}
                          `}>
                            {g.nilaiRaport}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
