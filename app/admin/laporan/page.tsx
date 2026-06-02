/**
 * @file app/admin/laporan/page.tsx
 * @description Admin academic report overview page.
 *              Fetches all classes with students and their grades for the
 *              current semester/academic year, then renders a summary table
 *              with average score, pass rate, and fail rate per class.
 * @module SIAKAD PPLG — Admin Laporan Akademik
 */

import type { Metadata } from 'next';
import prisma from '@/lib/prisma';
import {
  BarChart3,
  GraduationCap,
  TrendingUp,
  TrendingDown,
  Users,
  CheckCircle2,
  XCircle,
  Award,
} from 'lucide-react';

export const metadata: Metadata = {
  title: 'Laporan Akademik — SIAKAD PPLG',
};

const SEMESTER     = 'Genap';
const TAHUN_AJARAN = '2025/2026';
const PASSING_SCORE = 75; // KKM

// ─── Types ────────────────────────────────────────────────────────────────────
type ClassReport = {
  id: number;
  namaKelas: string;
  jumlahSiswa: number;
  jumlahDinilai: number;
  rataRata: number | null;
  tuntas: number;
  tidakTuntas: number;
  pctTuntas: number;
  pctTidakTuntas: number;
  nilaiterTinggi: number | null;
  nilaiTerendah: number | null;
};

// ─── Mini progress bar ────────────────────────────────────────────────────────
function MiniBar({ pct, color }: { pct: number; color: string }) {
  return (
    <div className="flex items-center gap-2">
      <div className="h-1.5 w-24 overflow-hidden rounded-full bg-slate-800">
        <div
          className={`h-1.5 rounded-full transition-all ${color}`}
          style={{ width: `${Math.max(pct, 0)}%` }}
        />
      </div>
      <span className="w-9 text-right text-xs tabular-nums text-slate-400">
        {pct.toFixed(0)}%
      </span>
    </div>
  );
}

// ─── Stat summary card ────────────────────────────────────────────────────────
function SummaryCard({
  label,
  value,
  sub,
  icon,
  accent,
}: {
  label: string;
  value: string | number;
  sub?: string;
  icon: React.ReactNode;
  accent: string;
}) {
  return (
    <div className="flex items-center gap-4 rounded-2xl border border-slate-800/60 bg-slate-900/60 px-6 py-5 backdrop-blur-sm">
      <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${accent}`}>
        {icon}
      </div>
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">{label}</p>
        <p className="mt-0.5 text-2xl font-bold text-white">{value}</p>
        {sub && <p className="text-[11px] text-slate-600">{sub}</p>}
      </div>
    </div>
  );
}

// ─── Rata-rata display ────────────────────────────────────────────────────────
function NilaiRataRata({ nilai }: { nilai: number | null }) {
  if (nilai === null) return <span className="text-slate-700 text-xs">Belum ada data</span>;
  const color =
    nilai >= 90 ? 'text-emerald-400' :
    nilai >= 75 ? 'text-sky-400'     :
    nilai >= 60 ? 'text-amber-400'   :
                  'text-rose-400';
  return <span className={`text-sm font-semibold tabular-nums ${color}`}>{nilai.toFixed(1)}</span>;
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default async function LaporanPage() {
  const classes = await prisma.class.findMany({
    where: { tahunAjaran: TAHUN_AJARAN },
    include: {
      students: {
        include: {
          grades: {
            where: { semester: SEMESTER, tahunAjaran: TAHUN_AJARAN },
            take: 1,
          },
        },
      },
    },
    orderBy: { namaKelas: 'asc' },
  });

  // ── Build per-class report ──
  const reports: ClassReport[] = classes.map((kelas) => {
    const jumlahSiswa = kelas.students.length;

    // Students that have a grade entry
    const dinilai = kelas.students.filter(
      (s) => s.grades[0]?.nilaiRaport !== null && s.grades[0]?.nilaiRaport !== undefined,
    );
    const jumlahDinilai = dinilai.length;

    const values = dinilai
      .map((s) => s.grades[0]?.nilaiRaport as number)
      .filter((v) => typeof v === 'number');

    const rataRata =
      values.length > 0
        ? values.reduce((a, b) => a + b, 0) / values.length
        : null;

    const tuntas      = values.filter((v) => v >= PASSING_SCORE).length;
    const tidakTuntas = values.filter((v) => v < PASSING_SCORE).length;

    const pctTuntas      = jumlahDinilai > 0 ? (tuntas / jumlahDinilai) * 100 : 0;
    const pctTidakTuntas = jumlahDinilai > 0 ? (tidakTuntas / jumlahDinilai) * 100 : 0;

    const nilaiterTinggi = values.length > 0 ? Math.max(...values) : null;
    const nilaiTerendah  = values.length > 0 ? Math.min(...values) : null;

    return {
      id: kelas.id,
      namaKelas: kelas.namaKelas,
      jumlahSiswa,
      jumlahDinilai,
      rataRata,
      tuntas,
      tidakTuntas,
      pctTuntas,
      pctTidakTuntas,
      nilaiterTinggi,
      nilaiTerendah,
    };
  });

  // ── Aggregate totals ──
  const totalSiswa    = reports.reduce((s, r) => s + r.jumlahSiswa, 0);
  const totalDinilai  = reports.reduce((s, r) => s + r.jumlahDinilai, 0);
  const totalTuntas   = reports.reduce((s, r) => s + r.tuntas, 0);
  const totalTidakTuntas = reports.reduce((s, r) => s + r.tidakTuntas, 0);
  const overallPctTuntas = totalDinilai > 0 ? (totalTuntas / totalDinilai) * 100 : 0;

  const allValues = reports.flatMap((r) => {
    // Reconstruct from averages is not reliable; we use the reports data
    return [];
  });

  return (
    <div className="min-h-screen bg-slate-950 px-6 py-10">
      {/* ── Page header ── */}
      <div className="mb-8 flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-500/20">
          <BarChart3 className="h-5 w-5 text-indigo-400" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-white">Laporan Akademik</h1>
          <p className="text-sm text-slate-500">
            Semester {SEMESTER} • Tahun Ajaran {TAHUN_AJARAN} • KKM {PASSING_SCORE}
          </p>
        </div>
      </div>

      {/* ── Summary cards ── */}
      <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <SummaryCard
          label="Total Siswa"
          value={totalSiswa}
          sub={`${classes.length} kelas`}
          icon={<Users className="h-5 w-5 text-slate-300" />}
          accent="bg-slate-700/50"
        />
        <SummaryCard
          label="Sudah Dinilai"
          value={totalDinilai}
          sub={`dari ${totalSiswa} siswa`}
          icon={<Award className="h-5 w-5 text-indigo-400" />}
          accent="bg-indigo-500/20"
        />
        <SummaryCard
          label="Siswa Tuntas"
          value={totalTuntas}
          sub={`${overallPctTuntas.toFixed(1)}% dari yang dinilai`}
          icon={<CheckCircle2 className="h-5 w-5 text-emerald-400" />}
          accent="bg-emerald-500/20"
        />
        <SummaryCard
          label="Belum Tuntas"
          value={totalTidakTuntas}
          sub={`${(100 - overallPctTuntas).toFixed(1)}% dari yang dinilai`}
          icon={<XCircle className="h-5 w-5 text-rose-400" />}
          accent="bg-rose-500/20"
        />
      </div>

      {/* ── Main report table ── */}
      <div className="rounded-2xl border border-slate-800/60 bg-slate-900/60 overflow-hidden backdrop-blur-sm">
        {/* Table header */}
        <div className="border-b border-slate-800/60 px-6 py-4">
          <div className="flex items-center gap-2">
            <GraduationCap className="h-4 w-4 text-indigo-400" />
            <h2 className="text-sm font-semibold text-white">Ringkasan Per Kelas</h2>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-800/60 bg-slate-900/40">
                {[
                  'Kelas',
                  'Jml Siswa',
                  'Sudah Dinilai',
                  'Rata-rata Nilai',
                  'Nilai Tertinggi',
                  'Nilai Terendah',
                  '% Tuntas',
                  '% Tidak Tuntas',
                ].map((h) => (
                  <th
                    key={h}
                    className="px-5 py-4 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-500 whitespace-nowrap"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/40">
              {reports.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-5 py-16 text-center">
                    <div className="flex flex-col items-center gap-3">
                      <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-slate-800/60">
                        <BarChart3 className="h-6 w-6 text-slate-600" />
                      </div>
                      <p className="text-sm text-slate-500">
                        Belum ada data kelas untuk Tahun Ajaran {TAHUN_AJARAN}.
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                reports.map((report) => (
                  <tr key={report.id} className="hover:bg-white/[0.02] transition-colors">
                    {/* Kelas */}
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-2">
                        <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-500/15">
                          <GraduationCap className="h-3.5 w-3.5 text-indigo-400" />
                        </div>
                        <span className="font-semibold text-white">{report.namaKelas}</span>
                      </div>
                    </td>

                    {/* Jumlah siswa */}
                    <td className="px-5 py-4 text-sm text-slate-300 tabular-nums">
                      {report.jumlahSiswa}
                    </td>

                    {/* Sudah dinilai */}
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-1.5">
                        <span className="text-sm tabular-nums text-slate-300">
                          {report.jumlahDinilai}
                        </span>
                        <span className="text-xs text-slate-600">
                          / {report.jumlahSiswa}
                        </span>
                        {report.jumlahDinilai === report.jumlahSiswa && report.jumlahSiswa > 0 && (
                          <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                        )}
                      </div>
                    </td>

                    {/* Rata-rata */}
                    <td className="px-5 py-4">
                      <NilaiRataRata nilai={report.rataRata} />
                    </td>

                    {/* Tertinggi */}
                    <td className="px-5 py-4">
                      {report.nilaiterTinggi !== null ? (
                        <div className="flex items-center gap-1">
                          <TrendingUp className="h-3.5 w-3.5 text-emerald-500" />
                          <span className="text-sm font-semibold text-emerald-400 tabular-nums">
                            {report.nilaiterTinggi}
                          </span>
                        </div>
                      ) : (
                        <span className="text-slate-700 text-xs">—</span>
                      )}
                    </td>

                    {/* Terendah */}
                    <td className="px-5 py-4">
                      {report.nilaiTerendah !== null ? (
                        <div className="flex items-center gap-1">
                          <TrendingDown className="h-3.5 w-3.5 text-rose-500" />
                          <span className="text-sm font-semibold text-rose-400 tabular-nums">
                            {report.nilaiTerendah}
                          </span>
                        </div>
                      ) : (
                        <span className="text-slate-700 text-xs">—</span>
                      )}
                    </td>

                    {/* % Tuntas */}
                    <td className="px-5 py-4">
                      <MiniBar pct={report.pctTuntas} color="bg-emerald-500" />
                    </td>

                    {/* % Tidak tuntas */}
                    <td className="px-5 py-4">
                      <MiniBar pct={report.pctTidakTuntas} color="bg-rose-500" />
                    </td>
                  </tr>
                ))
              )}
            </tbody>

            {/* ── Totals row ── */}
            {reports.length > 0 && (
              <tfoot>
                <tr className="border-t-2 border-slate-700/60 bg-slate-900/80">
                  <td className="px-5 py-4 text-xs font-bold uppercase tracking-wider text-slate-400">
                    Total / Rata-rata
                  </td>
                  <td className="px-5 py-4 text-sm font-bold text-white tabular-nums">
                    {totalSiswa}
                  </td>
                  <td className="px-5 py-4 text-sm font-bold text-white tabular-nums">
                    {totalDinilai}
                  </td>
                  <td className="px-5 py-4 text-sm font-bold text-white">
                    {/* Overall average */}
                    {reports.some((r) => r.rataRata !== null)
                      ? (() => {
                          const valid = reports.filter((r) => r.rataRata !== null);
                          const avg = valid.reduce((s, r) => s + (r.rataRata as number), 0) / valid.length;
                          return <NilaiRataRata nilai={avg} />;
                        })()
                      : <span className="text-slate-700 text-xs">—</span>
                    }
                  </td>
                  <td className="px-5 py-4" />
                  <td className="px-5 py-4" />
                  <td className="px-5 py-4">
                    <MiniBar pct={overallPctTuntas} color="bg-emerald-500" />
                  </td>
                  <td className="px-5 py-4">
                    <MiniBar pct={100 - overallPctTuntas} color="bg-rose-500" />
                  </td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>

        {/* Footer note */}
        <div className="border-t border-slate-800/60 px-6 py-3">
          <p className="text-xs text-slate-600">
            Data laporan diambil dari nilai raport siswa • Semester {SEMESTER} • Tahun Ajaran {TAHUN_AJARAN} •
            Kriteria Ketuntasan Minimal (KKM): <span className="text-slate-500">{PASSING_SCORE}</span>
          </p>
        </div>
      </div>
    </div>
  );
}
