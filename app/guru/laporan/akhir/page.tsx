// =============================================================================
// FILE: app/guru/laporan/akhir/page.tsx
// TUJUAN: Laporan akhir semester — ringkasan statistik semua kelas.
//         Menampilkan per kelas: total siswa, avg nilaiRaport, count tuntas,
//         tidak tuntas, dan belum dinilai. Menggunakan big stat cards.
// SEMESTER: Genap 2025/2026
// =============================================================================

import type { Metadata } from "next";
import prisma from "@/lib/prisma";
import {
  BarChart3,
  Users,
  CheckCircle2,
  XCircle,
  Clock,
  GraduationCap,
  TrendingUp,
  TrendingDown,
  Award,
} from "lucide-react";

import { getActiveAcademicConfig } from "@/lib/academicConfig";

export const metadata: Metadata = { title: "Laporan Akhir Semester" };

// ─── TYPES ───────────────────────────────────────────────────────────────────

interface KelasStats {
  id:            number;
  namaKelas:     string;
  totalSiswa:    number;
  avgNilaiRaport: number | null;
  countTuntas:   number;
  countTidakTuntas: number;
  countBelumDinilai: number;
  nilaiTertinggi: number | null;
  nilaiTerendah:  number | null;
}

// ─── HELPERS ─────────────────────────────────────────────────────────────────

function getNilaiColor(nilai: number | null): string {
  if (nilai === null) return "text-slate-500";
  if (nilai >= 90)   return "text-emerald-400";
  if (nilai >= 75)   return "text-indigo-400";
  if (nilai >= 60)   return "text-amber-400";
  return "text-rose-400";
}

function getKelasAccent(idx: number): {
  border: string;
  bg: string;
  text: string;
  header: string;
} {
  const palettes = [
    {
      border: "border-indigo-500/30",
      bg:     "bg-indigo-500/5",
      text:   "text-indigo-300",
      header: "from-indigo-500/20 to-indigo-500/5",
    },
    {
      border: "border-violet-500/30",
      bg:     "bg-violet-500/5",
      text:   "text-violet-300",
      header: "from-violet-500/20 to-violet-500/5",
    },
    {
      border: "border-sky-500/30",
      bg:     "bg-sky-500/5",
      text:   "text-sky-300",
      header: "from-sky-500/20 to-sky-500/5",
    },
  ];
  return palettes[idx % palettes.length]!;
}

// ─── PAGE ─────────────────────────────────────────────────────────────────────

export default async function GuruLaporanAkhirPage() {
  const { tahunAjaran: TAHUN_AJARAN, semester: SEMESTER } = await getActiveAcademicConfig();

  const kelasList = await prisma.class.findMany({
    where: { tahunAjaran: TAHUN_AJARAN },
    orderBy: { namaKelas: "asc" },
  });

  // Ambil semua data siswa + nilai untuk semua kelas sekaligus
  const kelasStats: KelasStats[] = await Promise.all(
    kelasList.map(async (kelas) => {
      const students = await prisma.student.findMany({
        where: { kelasId: kelas.id },
        include: {
          grades: {
            where: { semester: SEMESTER, tahunAjaran: TAHUN_AJARAN },
            take: 1,
            select: { nilaiRaport: true, statusTuntas: true },
          },
        },
      });

      const withNilai = students.filter((s) => s.grades[0]?.nilaiRaport != null);
      const nilaiList = withNilai.map((s) => s.grades[0]!.nilaiRaport!);

      const avgNilaiRaport = nilaiList.length
        ? nilaiList.reduce((a, b) => a + b, 0) / nilaiList.length
        : null;

      const countTuntas        = students.filter((s) => s.grades[0]?.statusTuntas === "TUNTAS").length;
      const countTidakTuntas   = students.filter((s) => s.grades[0]?.statusTuntas === "BELUM").length;
      const countBelumDinilai  = students.filter((s) => !s.grades[0]?.statusTuntas).length;

      return {
        id:               kelas.id,
        namaKelas:        kelas.namaKelas,
        totalSiswa:       students.length,
        avgNilaiRaport,
        countTuntas,
        countTidakTuntas,
        countBelumDinilai,
        nilaiTertinggi: nilaiList.length ? Math.max(...nilaiList) : null,
        nilaiTerendah:  nilaiList.length ? Math.min(...nilaiList) : null,
      };
    })
  );

  // Statistik gabungan seluruh kelas
  const totalSiswaSemua = kelasStats.reduce((a, k) => a + k.totalSiswa, 0);
  const totalTuntasSemua = kelasStats.reduce((a, k) => a + k.countTuntas, 0);
  const allAvgs = kelasStats
    .filter((k) => k.avgNilaiRaport !== null)
    .map((k) => k.avgNilaiRaport!);
  const avgGlobal = allAvgs.length
    ? allAvgs.reduce((a, b) => a + b, 0) / allAvgs.length
    : null;

  return (
    <div className="space-y-6 max-w-5xl">

      {/* ── Header ─────────────────────────────────────────────────────── */}
      <div>
        <div className="flex items-center gap-2 mb-1">
          <GraduationCap size={18} className="text-indigo-400" />
          <h1 className="text-xl font-bold text-white">Laporan Akhir Semester</h1>
        </div>
        <p className="text-slate-500 text-sm">
          Semester {SEMESTER} {TAHUN_AJARAN} · Ringkasan semua kelas
        </p>
      </div>

      {/* ── Ringkasan global ─────────────────────────────────────────── */}
      <div className="rounded-2xl border border-slate-800/60 bg-slate-900/60 p-5">
        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-4">
          Total Seluruh Kelas
        </p>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="text-center">
            <span className="text-3xl font-black text-white tabular-nums">{totalSiswaSemua}</span>
            <p className="text-xs text-slate-600 mt-1">Total Siswa</p>
          </div>
          <div className="text-center">
            <span className={`text-3xl font-black tabular-nums ${getNilaiColor(avgGlobal)}`}>
              {avgGlobal?.toFixed(1) ?? "—"}
            </span>
            <p className="text-xs text-slate-600 mt-1">Rata-rata Global</p>
          </div>
          <div className="text-center">
            <span className="text-3xl font-black text-emerald-400 tabular-nums">{totalTuntasSemua}</span>
            <p className="text-xs text-slate-600 mt-1">Total Tuntas</p>
          </div>
          <div className="text-center">
            <span className="text-3xl font-black text-indigo-400 tabular-nums">
              {totalSiswaSemua
                ? Math.round((totalTuntasSemua / totalSiswaSemua) * 100)
                : 0}%
            </span>
            <p className="text-xs text-slate-600 mt-1">% Tuntas Global</p>
          </div>
        </div>
      </div>

      {/* ── Per kelas ────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {kelasStats.map((kelas, idx) => {
          const accent  = getKelasAccent(idx);
          const pctTuntas = kelas.totalSiswa
            ? Math.round((kelas.countTuntas / kelas.totalSiswa) * 100)
            : 0;

          return (
            <div
              key={kelas.id}
              className={`
                rounded-2xl border overflow-hidden
                ${accent.border}
              `}
            >
              {/* Card header */}
              <div className={`px-5 py-4 bg-gradient-to-b ${accent.header} border-b ${accent.border}`}>
                <div className="flex items-center gap-2">
                  <Award size={16} className={accent.text} />
                  <h2 className={`text-base font-bold ${accent.text}`}>{kelas.namaKelas}</h2>
                </div>
                <div className="flex items-end gap-2 mt-3">
                  <span
                    className={`text-5xl font-black tabular-nums leading-none ${getNilaiColor(kelas.avgNilaiRaport)}`}
                  >
                    {kelas.avgNilaiRaport?.toFixed(1) ?? "—"}
                  </span>
                  <span className="text-xs text-slate-500 mb-1">rata-rata raport</span>
                </div>
              </div>

              {/* Stat list */}
              <div className="bg-slate-900/60 divide-y divide-slate-800/40">

                {/* Total siswa */}
                <div className="flex items-center justify-between px-5 py-3">
                  <div className="flex items-center gap-2">
                    <Users size={13} className="text-slate-500" />
                    <span className="text-xs text-slate-500">Total Siswa</span>
                  </div>
                  <span className="text-sm font-bold text-slate-200 tabular-nums">
                    {kelas.totalSiswa}
                  </span>
                </div>

                {/* Tuntas */}
                <div className="flex items-center justify-between px-5 py-3">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 size={13} className="text-emerald-400" />
                    <span className="text-xs text-slate-500">Tuntas</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-emerald-400 tabular-nums">
                      {kelas.countTuntas}
                    </span>
                    <span className="text-xs text-slate-600">({pctTuntas}%)</span>
                  </div>
                </div>

                {/* Tidak Tuntas */}
                <div className="flex items-center justify-between px-5 py-3">
                  <div className="flex items-center gap-2">
                    <XCircle size={13} className="text-rose-400" />
                    <span className="text-xs text-slate-500">Tidak Tuntas</span>
                  </div>
                  <span className="text-sm font-bold text-rose-400 tabular-nums">
                    {kelas.countTidakTuntas}
                  </span>
                </div>

                {/* Belum Dinilai */}
                <div className="flex items-center justify-between px-5 py-3">
                  <div className="flex items-center gap-2">
                    <Clock size={13} className="text-amber-400" />
                    <span className="text-xs text-slate-500">Belum Dinilai</span>
                  </div>
                  <span className="text-sm font-bold text-amber-400 tabular-nums">
                    {kelas.countBelumDinilai}
                  </span>
                </div>

                {/* Tertinggi & Terendah */}
                <div className="flex items-center justify-between px-5 py-3">
                  <div className="flex items-center gap-2">
                    <BarChart3 size={13} className="text-slate-500" />
                    <span className="text-xs text-slate-500">Rentang Nilai</span>
                  </div>
                  <div className="flex items-center gap-1 text-xs tabular-nums">
                    <TrendingUp size={10} className="text-emerald-500" />
                    <span className="text-emerald-400 font-semibold">
                      {kelas.nilaiTertinggi ?? "—"}
                    </span>
                    <span className="text-slate-700 mx-1">·</span>
                    <TrendingDown size={10} className="text-rose-500" />
                    <span className="text-rose-400 font-semibold">
                      {kelas.nilaiTerendah ?? "—"}
                    </span>
                  </div>
                </div>

                {/* Progress bar tuntas */}
                <div className="px-5 py-4">
                  <div className="flex items-center justify-between text-[11px] text-slate-600 mb-1.5">
                    <span>Progress Ketuntasan</span>
                    <span className="font-semibold text-slate-400">{pctTuntas}%</span>
                  </div>
                  <div className="h-2 rounded-full bg-slate-800">
                    <div
                      className="h-2 rounded-full bg-emerald-500 transition-all"
                      style={{ width: `${pctTuntas}%` }}
                    />
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* ── Footer note ───────────────────────────────────────────────── */}
      <p className="text-xs text-slate-700 text-center pb-2">
        Data laporan akhir semester Genap {TAHUN_AJARAN} · Digenerate otomatis dari data nilai
      </p>
    </div>
  );
}
