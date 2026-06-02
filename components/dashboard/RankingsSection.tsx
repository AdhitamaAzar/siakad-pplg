// =============================================================================
// FILE: components/dashboard/RankingsSection.tsx
// TUJUAN: Menampilkan panel peringkat dan performa akademik.
//         - Top Performers (10 Siswa dengan Nilai Tertinggi)
//         - Bottom Performers (10 Siswa Perlu Bimbingan/Nilai Terendah)
//         - Rankings Kelas (Urutan kelas berdasarkan rata-rata nilai)
// =============================================================================

"use client";

import { useState } from "react";
import { Trophy, AlertTriangle, School, Search, ArrowUpRight, ArrowDownRight } from "lucide-react";
import type { TopSiswaRow, KelasStats } from "@/lib/queries/dashboard";

interface RankingsSectionProps {
  topSiswa: TopSiswaRow[];
  bottomSiswa: TopSiswaRow[];
  kelasStats: KelasStats[];
}

function StudentRow({ siswa, rank, type }: { siswa: TopSiswaRow; rank: number; type: "top" | "bottom" }) {
  const isTop = type === "top";

  return (
    <div className="flex items-center justify-between p-3 rounded-xl border border-slate-800/40 bg-slate-900/30 hover:bg-slate-900/60 transition-colors">
      <div className="flex items-center gap-3">
        {/* Rank Badge */}
        <span
          className={`flex h-6 w-6 items-center justify-center rounded-lg text-xs font-bold font-mono ${
            isTop
              ? rank === 1
                ? "bg-amber-500/20 text-amber-400 border border-amber-500/30"
                : rank === 2
                ? "bg-slate-300/25 text-slate-300 border border-slate-300/30"
                : rank === 3
                ? "bg-amber-700/20 text-amber-600 border border-amber-700/30"
                : "bg-slate-800/50 text-slate-400"
              : "bg-rose-500/10 text-rose-400 border border-rose-500/20"
          }`}
        >
          {isTop ? rank : siswa.rank}
        </span>

        {/* Student Info */}
        <div>
          <p className="text-xs font-semibold text-slate-200">{siswa.nama}</p>
          <p className="text-[10px] text-slate-500 font-mono mt-0.5">
            {siswa.nis} · <span className="text-slate-400">{siswa.namaKelas}</span>
          </p>
        </div>
      </div>

      {/* Grade and Trend Indicator */}
      <div className="flex items-center gap-2">
        <div className="text-right">
          <p className={`text-xs font-black tabular-nums ${isTop ? "text-emerald-400" : "text-rose-400"}`}>
            {siswa.nilaiRaport}
          </p>
          <p className="text-[9px] text-slate-500">{siswa.predikat}</p>
        </div>
        {isTop ? (
          <ArrowUpRight size={14} className="text-emerald-500 shrink-0" />
        ) : (
          <ArrowDownRight size={14} className="text-rose-500 shrink-0" />
        )}
      </div>
    </div>
  );
}

export default function RankingsSection({ topSiswa, bottomSiswa, kelasStats }: RankingsSectionProps) {
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState<"all" | "top" | "bottom" | "kelas">("all");

  // Filter & sort data kelas
  const rankedKelas = [...kelasStats].sort((a, b) => b.rataRataNilai - a.rataRataNilai);

  // Search filter
  const filterSiswa = (list: TopSiswaRow[]) =>
    list.filter(
      (s) =>
        s.nama.toLowerCase().includes(search.toLowerCase()) ||
        s.nis.includes(search) ||
        s.namaKelas.toLowerCase().includes(search.toLowerCase())
    );

  const filteredTop = filterSiswa(topSiswa);
  const filteredBottom = filterSiswa(bottomSiswa);

  return (
    <div className="space-y-4">
      {/* Search and Tabs */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-slate-900/40 p-3 rounded-2xl border border-slate-800/40">
        {/* Search */}
        <div className="relative flex-1 max-w-xs">
          <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            type="text"
            placeholder="Cari nama, NIS, kelas..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 bg-slate-950/60 border border-slate-800 rounded-xl text-xs text-slate-300 placeholder:text-slate-600 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/20 transition-all"
          />
        </div>

        {/* Tab switcher for mobile/tablet dashboard view */}
        <div className="flex items-center gap-1 bg-slate-950/80 p-0.5 rounded-lg border border-slate-800/30 self-end sm:self-auto">
          {[
            { id: "all", label: "Semua" },
            { id: "top", label: "Top Performer" },
            { id: "bottom", label: "Perlu Bimbingan" },
            { id: "kelas", label: "Peringkat Kelas" },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider transition-all ${
                activeTab === tab.id
                  ? "bg-indigo-500/20 text-indigo-300"
                  : "text-slate-500 hover:text-slate-300"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Grid columns */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Column 1: Top Performers */}
        {(activeTab === "all" || activeTab === "top") && (
          <div className="rounded-2xl border border-slate-800/60 bg-slate-900/60 p-5 space-y-4 backdrop-blur-sm">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800/60">
              <div className="flex items-center gap-2">
                <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-amber-500/10 border border-amber-500/20">
                  <Trophy size={14} className="text-amber-400" />
                </div>
                <div>
                  <h4 className="text-xs font-extrabold text-white uppercase tracking-wider">Top Performers</h4>
                  <p className="text-[10px] text-slate-500">Nilai tertinggi paralel</p>
                </div>
              </div>
              <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full">
                Prestasi
              </span>
            </div>

            <div className="space-y-2 max-h-[420px] overflow-y-auto pr-1">
              {filteredTop.length === 0 ? (
                <p className="text-xs text-slate-600 text-center py-6">Tidak ada data</p>
              ) : (
                filteredTop.map((siswa, idx) => (
                  <StudentRow key={siswa.id} siswa={siswa} rank={idx + 1} type="top" />
                ))
              )}
            </div>
          </div>
        )}

        {/* Column 2: Bottom Performers */}
        {(activeTab === "all" || activeTab === "bottom") && (
          <div className="rounded-2xl border border-slate-800/60 bg-slate-900/60 p-5 space-y-4 backdrop-blur-sm">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800/60">
              <div className="flex items-center gap-2">
                <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-rose-500/10 border border-rose-500/20">
                  <AlertTriangle size={14} className="text-rose-400" />
                </div>
                <div>
                  <h4 className="text-xs font-extrabold text-white uppercase tracking-wider">Perlu Bimbingan</h4>
                  <p className="text-[10px] text-slate-500">Nilai terendah untuk intervensi</p>
                </div>
              </div>
              <span className="text-[10px] font-bold text-rose-400 bg-rose-500/10 px-2 py-0.5 rounded-full">
                Prioritas
              </span>
            </div>

            <div className="space-y-2 max-h-[420px] overflow-y-auto pr-1">
              {filteredBottom.length === 0 ? (
                <p className="text-xs text-slate-600 text-center py-6">Tidak ada data</p>
              ) : (
                filteredBottom.map((siswa) => (
                  <StudentRow key={siswa.id} siswa={siswa} rank={siswa.rank} type="bottom" />
                ))
              )}
            </div>
          </div>
        )}

        {/* Column 3: Class Rankings */}
        {(activeTab === "all" || activeTab === "kelas") && (
          <div className="rounded-2xl border border-slate-800/60 bg-slate-900/60 p-5 space-y-4 backdrop-blur-sm">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800/60">
              <div className="flex items-center gap-2">
                <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-500/10 border border-indigo-500/20">
                  <School size={14} className="text-indigo-400" />
                </div>
                <div>
                  <h4 className="text-xs font-extrabold text-white uppercase tracking-wider">Peringkat Kelas</h4>
                  <p className="text-[10px] text-slate-500">Rata-rata kumulatif kelas</p>
                </div>
              </div>
              <span className="text-[10px] font-bold text-indigo-400 bg-indigo-500/10 px-2 py-0.5 rounded-full">
                Akademik
              </span>
            </div>

            <div className="space-y-3.5">
              {rankedKelas.map((kelas, idx) => {
                const color = idx === 0 ? "bg-amber-500" : idx === 1 ? "bg-indigo-500" : "bg-emerald-500";
                const border = idx === 0 ? "border-amber-500/20" : idx === 1 ? "border-indigo-500/20" : "border-emerald-500/20";
                const badge = idx === 0 ? "text-amber-400" : idx === 1 ? "text-indigo-400" : "text-emerald-400";

                return (
                  <div key={kelas.id} className={`p-3.5 rounded-2xl border ${border} bg-slate-950/40 space-y-2`}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className={`text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md ${badge} bg-white/[0.02]`}>
                          #{idx + 1}
                        </span>
                        <h5 className="text-xs font-bold text-white">{kelas.namaKelas}</h5>
                      </div>
                      <span className="text-xs font-black text-white tabular-nums">{kelas.rataRataNilai}</span>
                    </div>

                    {/* Progress Bar */}
                    <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden">
                      <div className={`h-full rounded-full ${color}`} style={{ width: `${kelas.rataRataNilai}%` }} />
                    </div>

                    <div className="flex items-center justify-between text-[10px] text-slate-500 pt-1">
                      <span>Ketuntasan: <span className="font-semibold text-slate-300">{kelas.persentaseTuntas}%</span></span>
                      <span>Siswa: <span className="font-semibold text-slate-300">{kelas.totalSiswa}</span></span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
