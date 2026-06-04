"use client";

// =============================================================================
// FILE: app/guru/ranking/RankingClientPage.tsx
// TUJUAN: Client component untuk visualisasi ranking siswa (Top 10 & Bottom 10).
//         Dilengkapi search realtime, filter kelas, export Excel, & print PDF.
// =============================================================================

import { useState, useMemo } from "react";
import Link from "next/link";
import { Trophy, Medal, Star, Users, Search, Download, Printer, ArrowDown, ArrowUp } from "lucide-react";

interface GradeData {
  rataRata: number | null;
  nilaiRaport: number | null;
  predikat: string | null;
  statusTuntas: string | null;
}

interface Student {
  id: number;
  nama: string;
  nis: string;
  kelas: {
    id: number;
    namaKelas: string;
  };
  grade: GradeData | null;
}

interface Props {
  kelasList: { id: number; namaKelas: string }[];
  students: Student[];
  semester: string;
  tahunAjaran: string;
}

function getNilaiColor(nilai: number | null): string {
  if (nilai === null) return "text-slate-600";
  if (nilai >= 90)   return "text-emerald-400";
  if (nilai >= 75)   return "text-indigo-400";
  if (nilai >= 60)   return "text-amber-400";
  return "text-rose-455";
}

function RankBadge({ rank }: { rank: number }) {
  if (rank === 1)
    return (
      <span className="inline-flex items-center gap-1 text-amber-400 font-extrabold text-xs">
        🥇 <span className="tabular-nums">1</span>
      </span>
    );
  if (rank === 2)
    return (
      <span className="inline-flex items-center gap-1 text-slate-350 font-extrabold text-xs">
        🥈 <span className="tabular-nums">2</span>
      </span>
    );
  if (rank === 3)
    return (
      <span className="inline-flex items-center gap-1 text-amber-700 font-extrabold text-xs">
        🥉 <span className="tabular-nums">3</span>
      </span>
    );
  return (
    <span className="text-slate-500 font-semibold tabular-nums text-xs">
      #{rank}
    </span>
  );
}

export default function RankingClientPage({
  kelasList,
  students,
  semester,
  tahunAjaran,
}: Props) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedKelasId, setSelectedKelasId] = useState<string>("all");
  const [activeTab, setActiveTab] = useState<"top10" | "bottom10" | "all">("all");

  // Calculate ranks and clean list
  const rankedList = useMemo(() => {
    // 1. Filter by Class first
    const classFiltered = students.filter((s) => {
      if (selectedKelasId === "all") return true;
      return s.kelas.id === Number(selectedKelasId);
    });

    // 2. Sort by score to assign rank
    const sorted = [...classFiltered].sort((a, b) => {
      const valA = a.grade?.nilaiRaport ?? -1;
      const valB = b.grade?.nilaiRaport ?? -1;
      return valB - valA;
    });

    // 3. Assign rank
    let currentRank = 1;
    return sorted.map((s, idx) => {
      let r = null;
      if (s.grade?.nilaiRaport != null) {
        // Handle ties
        if (idx > 0 && sorted[idx - 1].grade?.nilaiRaport === s.grade.nilaiRaport) {
          r = currentRank;
        } else {
          currentRank = idx + 1;
          r = currentRank;
        }
      }
      return {
        ...s,
        rank: r,
      };
    });
  }, [students, selectedKelasId]);

  // Apply search query filter
  const searchFilteredList = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return rankedList;
    return rankedList.filter(
      (s) => s.nama.toLowerCase().includes(q) || s.nis.includes(q)
    );
  }, [rankedList, searchQuery]);

  // Split into Tabs
  const finalDisplayList = useMemo(() => {
    if (activeTab === "all") {
      return searchFilteredList;
    }
    if (activeTab === "top10") {
      return searchFilteredList.filter((s) => s.rank !== null && s.rank <= 10);
    }
    if (activeTab === "bottom10") {
      // Students with grades, sorted ascendingly (lowest first)
      const listWithGrades = searchFilteredList.filter((s) => s.grade?.nilaiRaport != null);
      return [...listWithGrades].reverse().slice(0, 10);
    }
    return searchFilteredList;
  }, [searchFilteredList, activeTab]);

  const handleExportExcel = async () => {
    const XLSX = await import("xlsx");
    const exportData = searchFilteredList.map((s) => ({
      Rank: s.rank ?? "—",
      NIS: s.nis,
      Nama: s.nama,
      Kelas: s.kelas.namaKelas,
      "Rata-rata": s.grade?.rataRata ?? "—",
      "Nilai Raport": s.grade?.nilaiRaport ?? "—",
      Predikat: s.grade?.predikat ?? "—",
      Status: s.grade?.statusTuntas ?? "—",
    }));

    const worksheet = XLSX.utils.json_to_sheet(exportData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Peringkat Siswa");

    const wscols = [
      { wch: 8 },
      { wch: 15 },
      { wch: 30 },
      { wch: 12 },
      { wch: 12 },
      { wch: 12 },
      { wch: 15 },
      { wch: 15 },
    ];
    worksheet["!cols"] = wscols;

    const classLabel = selectedKelasId === "all" ? "Semua_Kelas" : kelasList.find(k => k.id === Number(selectedKelasId))?.namaKelas.replace(/\s+/g, "_");
    const fileName = `Ranking_Siswa_${classLabel}_${semester}_${tahunAjaran.replace(/\//g, "-")}.xlsx`;
    XLSX.writeFile(workbook, fileName);
  };

  return (
    <div className="space-y-5 max-w-[1100px]">
      <style dangerouslySetInnerHTML={{ __html: `
        @media print {
          body {
            background: white !important;
            color: black !important;
          }
          nav, sidebar, header, .no-print, button, input, select {
            display: none !important;
          }
          .print-header {
            display: block !important;
          }
          table {
            width: 100% !important;
            border-collapse: collapse !important;
          }
          th, td {
            border: 1px solid #333 !important;
            padding: 6px 8px !important;
            font-size: 10px !important;
            color: black !important;
            background: white !important;
          }
          th {
            background-color: #f3f4f6 !important;
            font-weight: bold !important;
          }
        }
      `}} />

      {/* Header Print Only */}
      <div className="hidden print-header mb-6 text-center">
        <h1 className="text-xl font-bold text-black uppercase">DAFTAR RANKING SISWA PPLG</h1>
        <p className="text-xs text-slate-700 mt-1">
          Semester {semester} Tahun Ajaran {tahunAjaran}
        </p>
        <p className="text-xs font-semibold text-slate-800">
          Kelas: {selectedKelasId === "all" ? "Semua Kelas" : kelasList.find(k => k.id === Number(selectedKelasId))?.namaKelas} · Kategori: {activeTab === "all" ? "Semua Ranking" : activeTab === "top10" ? "Top 10" : "Bottom 10"}
        </p>
      </div>

      {/* Header */}
      <div className="flex items-start justify-between no-print">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Trophy size={20} className="text-amber-400 animate-pulse" />
            <h1 className="text-xl font-bold text-white">Ranking Global Siswa</h1>
          </div>
          <p className="text-slate-500 text-sm">
            Semester {semester} {tahunAjaran} · Peringkat kelas berdasarkan Nilai Raport
          </p>
        </div>
      </div>

      {/* Toolbar & Filter */}
      <div className="flex flex-col md:flex-row items-center justify-between gap-4 p-4 rounded-2xl border border-slate-800/60 bg-slate-900/40 no-print">
        <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
          {/* Search */}
          <div className="relative w-full sm:w-64">
            <input
              type="text"
              placeholder="Cari nama atau NIS..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-slate-800/60 border border-slate-700 rounded-xl text-white text-xs placeholder:text-slate-500 focus:outline-none focus:border-indigo-500 transition-all"
            />
            <div className="absolute left-3 top-2.5 text-slate-500">
              <Search size={14} />
            </div>
          </div>

          {/* Filter Kelas */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-500 font-semibold uppercase tracking-wider">Kelas:</span>
            <select
              value={selectedKelasId}
              onChange={(e) => setSelectedKelasId(e.target.value)}
              className="bg-slate-800 border border-slate-700 text-white rounded-xl px-3 py-2 text-xs font-semibold focus:outline-none"
            >
              <option value="all">Semua Kelas</option>
              {kelasList.map((k) => (
                <option key={k.id} value={k.id}>
                  {k.namaKelas}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Buttons Action */}
        <div className="flex items-center gap-2 w-full md:w-auto justify-end">
          <button
            onClick={handleExportExcel}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white border border-emerald-500/20 hover:border-emerald-500/40 shadow-lg transition-all cursor-pointer"
          >
            <Download size={14} />
            Export Excel
          </button>
          <button
            onClick={() => window.print()}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-750 text-white border border-slate-700 hover:border-slate-650 transition-all cursor-pointer"
          >
            <Printer size={14} />
            Cetak PDF
          </button>
        </div>
      </div>

      {/* Tabs Peringkat */}
      <div className="flex gap-2 border-b border-slate-800/40 pb-px no-print">
        {[
          { id: "all", label: "Semua Siswa", icon: Users },
          { id: "top10", label: "Top 10 Siswa", icon: Trophy },
          { id: "bottom10", label: "Bottom 10 Siswa", icon: Star },
        ].map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`
                flex items-center gap-1.5 px-4 py-2.5 text-xs font-semibold border-b-2 transition-all cursor-pointer
                ${activeTab === tab.id
                  ? "border-indigo-500 text-indigo-400 bg-indigo-500/5"
                  : "border-transparent text-slate-500 hover:text-slate-300 hover:border-slate-800"}
              `}
            >
              <Icon size={13} />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Tabel Ranking */}
      <div className="rounded-2xl border border-slate-800/60 bg-slate-900/60 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-800/60 text-slate-400 text-left">
              <th className="px-4 py-3 text-center text-[11px] font-semibold uppercase tracking-wider text-slate-500 w-16">Peringkat</th>
              <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-500">Nama Siswa</th>
              <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-500 w-28">Kelas</th>
              <th className="px-4 py-3 text-center text-[11px] font-semibold uppercase tracking-wider text-slate-500 w-24">Rata-rata</th>
              <th className="px-4 py-3 text-center text-[11px] font-semibold uppercase tracking-wider text-slate-550 w-24">Raport</th>
              <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-500 w-32">Predikat</th>
              <th className="px-4 py-3 text-center text-[11px] font-semibold uppercase tracking-wider text-slate-500 w-28">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/40">
            {finalDisplayList.map((s, idx) => {
              const g = s.grade;
              return (
                <tr
                  key={s.id}
                  className={`
                    hover:bg-white/[0.01] transition-colors
                    ${activeTab === "top10" && idx < 3 ? "bg-indigo-500/[0.02]" : ""}
                    ${activeTab === "bottom10" && idx < 3 ? "bg-rose-500/[0.01]" : ""}
                  `}
                >
                  <td className="px-4 py-3.5 text-center">
                    <RankBadge rank={s.rank ?? 0} />
                  </td>
                  <td className="px-4 py-3.5">
                    <div className="font-semibold text-slate-200">{s.nama}</div>
                    <div className="text-[11px] text-slate-550 mt-0.5">{s.nis}</div>
                  </td>
                  <td className="px-4 py-3.5 text-slate-400 font-medium">
                    {s.kelas.namaKelas}
                  </td>
                  <td className="px-4 py-3.5 text-center text-slate-350 font-bold tabular-nums">
                    {g?.rataRata?.toFixed(1) ?? "—"}
                  </td>
                  <td className="px-4 py-3.5 text-center">
                    <span className={`text-sm font-black tabular-nums ${getNilaiColor(g?.nilaiRaport ?? null)}`}>
                      {g?.nilaiRaport ?? "—"}
                    </span>
                  </td>
                  <td className="px-4 py-3.5">
                    <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
                      g?.predikat === "Sangat Baik" ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" :
                      g?.predikat === "Baik" ? "bg-indigo-500/10 text-indigo-400 border-indigo-500/20" :
                      g?.predikat === "Cukup" ? "bg-amber-500/10 text-amber-400 border-amber-500/20" :
                      g?.predikat ? "bg-rose-500/10 text-rose-400 border-rose-500/20" : "bg-slate-800 text-slate-600 border-slate-700/40"
                    }`}>
                      {g?.predikat ?? "—"}
                    </span>
                  </td>
                  <td className="px-4 py-3.5 text-center">
                    <span className={`text-[10px] font-black ${
                      g?.statusTuntas === "TUNTAS" ? "text-emerald-400" :
                      g?.statusTuntas === "BELUM" ? "text-rose-455" : "text-slate-550"
                    }`}>
                      {g?.statusTuntas ?? "BELUM UJIAN"}
                    </span>
                  </td>
                </tr>
              );
            })}
            {finalDisplayList.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-slate-600 text-sm">
                  Tidak ada data ranking untuk kriteria filter ini.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <p className="text-xs text-slate-700 text-center no-print">
        Siswa yang belum diisi nilainya tidak mendapatkan peringkat · Ranking dihitung secara global atau berdasarkan filter kelas yang dipilih.
      </p>
    </div>
  );
}
