// =============================================================================
// FILE: app/guru/laporan/nilai/page.tsx
// TUJUAN: Halaman rekap nilai laporan untuk guru.
//         Sama seperti guru/nilai namun dengan baris statistik tambahan di bawah:
//         rata-rata kelas, nilai tertinggi, nilai terendah, % tuntas.
//         Mendukung filter kelas via searchParams.
//         Didesain untuk dicetak / diunduh.
// SEMESTER: Genap 2025/2026
// =============================================================================

import type { Metadata } from "next";
import prisma from "@/lib/prisma";
import Link from "next/link";
import { FileText, Printer, TrendingUp, TrendingDown, BarChart3, CheckCircle2 } from "lucide-react";

import { getActiveAcademicConfig } from "@/lib/academicConfig";

export const metadata: Metadata = { title: "Rekap Nilai — Laporan" };

const KOMPONEN = [
  { key: "nilaiGithub"       as const, label: "Github" },
  { key: "nilaiApi"          as const, label: "API" },
  { key: "nilaiAdminPanel"   as const, label: "Admin" },
  { key: "nilaiLandingPage"  as const, label: "Landing" },
  { key: "nilaiKagglePython" as const, label: "Python" },
  { key: "nilaiKaggleSql"    as const, label: "SQL" },
  { key: "nilaiKaggleMl"     as const, label: "ML" },
  { key: "nilaiUjianMl"      as const, label: "U.ML" },
  { key: "nilaiUjianSql"     as const, label: "U.SQL" },
] as const;

type GradeKey = typeof KOMPONEN[number]["key"];

// ─── SUB-COMPONENTS ───────────────────────────────────────────────────────────

function Cell({ nilai }: { nilai: number | null }) {
  if (nilai === null)
    return <td className="px-2 py-2.5 text-center text-slate-700 text-xs">—</td>;
  const cls =
    nilai >= 90 ? "text-emerald-400" :
    nilai >= 75 ? "text-indigo-300" :
    nilai >= 60 ? "text-amber-400"  : "text-rose-400";
  return (
    <td className={`px-2 py-2.5 text-center text-xs font-semibold tabular-nums ${cls}`}>
      {nilai}
    </td>
  );
}

function StatCard({
  label,
  value,
  icon: Icon,
  color,
}: {
  label: string;
  value: string;
  icon: React.ElementType;
  color: string;
}) {
  return (
    <div className={`rounded-2xl border p-4 ${color}`}>
      <div className="flex items-center gap-2 mb-2">
        <Icon size={14} />
        <span className="text-[11px] font-semibold uppercase tracking-wider">
          {label}
        </span>
      </div>
      <span className="text-2xl font-black tabular-nums leading-none">{value}</span>
    </div>
  );
}

// ─── PAGE ─────────────────────────────────────────────────────────────────────

interface PageProps {
  searchParams: Promise<{ kelas?: string }>;
}

export default async function GuruLaporanNilaiPage({ searchParams }: PageProps) {
  const sp = await searchParams;
  const { tahunAjaran: TAHUN_AJARAN, semester: SEMESTER } = await getActiveAcademicConfig();

  const kelasList = await prisma.class.findMany({
    where: { tahunAjaran: TAHUN_AJARAN },
    orderBy: { namaKelas: "asc" },
  });

  const activeKelasId = sp.kelas ? Number(sp.kelas) : kelasList[0]?.id;
  const activeKelas   = kelasList.find((k) => k.id === activeKelasId);

  const students = await prisma.student.findMany({
    where: { kelasId: activeKelasId },
    include: {
      grades: {
        where: { semester: SEMESTER, tahunAjaran: TAHUN_AJARAN },
        take: 1,
      },
    },
    orderBy: { nama: "asc" },
  });

  // ─── Kalkulasi statistik ─────────────────────────────────────────────────
  const withNilai = students.filter((s) => s.grades[0]?.nilaiRaport != null);
  const nilaiList = withNilai.map((s) => s.grades[0]!.nilaiRaport!);

  const rataRata = nilaiList.length
    ? (nilaiList.reduce((a, b) => a + b, 0) / nilaiList.length).toFixed(1)
    : "—";
  const tertinggi = nilaiList.length ? Math.max(...nilaiList).toString() : "—";
  const terendah  = nilaiList.length ? Math.min(...nilaiList).toString() : "—";
  const tuntas    = students.filter((s) => s.grades[0]?.statusTuntas === "TUNTAS").length;
  const pctTuntas = students.length
    ? Math.round((tuntas / students.length) * 100) + "%"
    : "—";

  return (
    <div className="space-y-5 max-w-[1300px]">

      {/* ── Header ─────────────────────────────────────────────────────── */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <FileText size={18} className="text-indigo-400" />
            <h1 className="text-xl font-bold text-white">Rekap Nilai — Laporan</h1>
          </div>
          <p className="text-slate-500 text-sm">
            Semester {SEMESTER} {TAHUN_AJARAN} · {activeKelas?.namaKelas ?? "Semua Kelas"}
          </p>
        </div>
        <button
          onClick={undefined}
          className="
            flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold
            bg-slate-800/60 text-slate-400 border border-slate-700/40
            hover:bg-slate-700/60 hover:text-slate-200 transition-colors
            print:hidden
          "
          type="button"
          aria-label="Cetak laporan"
        >
          <Printer size={14} />
          Cetak
        </button>
      </div>

      {/* ── Statistik kelas ──────────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard
          label="Rata-rata Kelas"
          value={rataRata}
          icon={BarChart3}
          color="border-indigo-500/25 bg-indigo-500/5 text-indigo-300"
        />
        <StatCard
          label="Nilai Tertinggi"
          value={tertinggi}
          icon={TrendingUp}
          color="border-emerald-500/25 bg-emerald-500/5 text-emerald-300"
        />
        <StatCard
          label="Nilai Terendah"
          value={terendah}
          icon={TrendingDown}
          color="border-rose-500/25 bg-rose-500/5 text-rose-300"
        />
        <StatCard
          label="% Tuntas"
          value={pctTuntas}
          icon={CheckCircle2}
          color="border-amber-500/25 bg-amber-500/5 text-amber-300"
        />
      </div>

      {/* ── Tab kelas ────────────────────────────────────────────────── */}
      <div className="flex gap-2 flex-wrap print:hidden">
        {kelasList.map((k) => (
          <Link
            key={k.id}
            href={`/guru/laporan/nilai?kelas=${k.id}`}
            className={`
              px-4 py-2 rounded-xl text-sm font-semibold border transition-all
              ${k.id === activeKelasId
                ? "bg-indigo-500/20 text-indigo-300 border-indigo-500/40"
                : "bg-slate-900/60 text-slate-500 border-slate-800/60 hover:text-slate-300"}
            `}
          >
            {k.namaKelas}
          </Link>
        ))}
      </div>

      {/* ── Tabel nilai ──────────────────────────────────────────────── */}
      <div className="rounded-2xl border border-slate-800/60 bg-slate-900/60 overflow-auto">
        <table className="w-full text-sm whitespace-nowrap">
          <thead>
            <tr className="border-b border-slate-800/60">
              <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-500 sticky left-0 bg-slate-900/60 w-8">
                #
              </th>
              <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-500 sticky left-8 bg-slate-900/60 min-w-[180px]">
                Nama Siswa
              </th>
              {KOMPONEN.map((k) => (
                <th
                  key={k.key}
                  className="px-2 py-3 text-center text-[11px] font-semibold uppercase tracking-wider text-slate-500"
                >
                  {k.label}
                </th>
              ))}
              <th className="px-3 py-3 text-center text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                Avg
              </th>
              <th className="px-3 py-3 text-center text-[11px] font-semibold uppercase tracking-wider text-indigo-400">
                Raport
              </th>
              <th className="px-3 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                Predikat
              </th>
              <th className="px-3 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                Status
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/40">
            {students.map((s, i) => {
              const g = s.grades[0] ?? null;
              return (
                <tr key={s.id} className="hover:bg-white/[0.02]">
                  <td className="px-4 py-2.5 text-slate-600 text-xs sticky left-0 bg-inherit tabular-nums">
                    {i + 1}
                  </td>
                  <td className="px-4 py-2.5 text-slate-200 font-medium sticky left-8 bg-inherit min-w-[180px]">
                    {s.nama}
                  </td>
                  {KOMPONEN.map((k) => (
                    <Cell
                      key={k.key}
                      nilai={g ? (g[k.key as GradeKey] as number | null) : null}
                    />
                  ))}
                  {/* Avg */}
                  <td className="px-3 py-2.5 text-center text-xs font-semibold text-slate-400 tabular-nums">
                    {g?.rataRata?.toFixed(1) ?? "—"}
                  </td>
                  {/* Raport */}
                  <td className="px-3 py-2.5 text-center">
                    <span
                      className={`text-sm font-bold tabular-nums ${
                        !g?.nilaiRaport   ? "text-slate-700" :
                        g.nilaiRaport >= 90 ? "text-emerald-400" :
                        g.nilaiRaport >= 75 ? "text-indigo-300" :
                        g.nilaiRaport >= 60 ? "text-amber-400"  : "text-rose-400"
                      }`}
                    >
                      {g?.nilaiRaport ?? "—"}
                    </span>
                  </td>
                  {/* Predikat */}
                  <td className="px-3 py-2.5 text-slate-500 text-xs">{g?.predikat ?? "—"}</td>
                  {/* Status */}
                  <td className="px-3 py-2.5">
                    {g?.statusTuntas ? (
                      <span
                        className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${
                          g.statusTuntas === "TUNTAS"
                            ? "bg-emerald-500/15 text-emerald-300"
                            : "bg-rose-500/15 text-rose-300"
                        }`}
                      >
                        {g.statusTuntas}
                      </span>
                    ) : (
                      <span className="text-slate-700 text-xs">—</span>
                    )}
                  </td>
                </tr>
              );
            })}

            {/* ─── Baris statistik ringkasan ──────────────────────────── */}
            {students.length > 0 && (
              <tr className="border-t-2 border-slate-700/60 bg-slate-800/20">
                <td className="px-4 py-3 text-xs text-slate-500 sticky left-0 bg-slate-800/20" />
                <td className="px-4 py-3 text-xs font-bold text-slate-400 sticky left-8 bg-slate-800/20">
                  STATISTIK KELAS
                </td>
                {/* Rata-rata per komponen */}
                {KOMPONEN.map((k) => {
                  const vals = students
                    .map((s) => s.grades[0]?.[k.key as GradeKey] as number | null)
                    .filter((v): v is number => v !== null);
                  const avg = vals.length
                    ? (vals.reduce((a, b) => a + b, 0) / vals.length).toFixed(0)
                    : "—";
                  return (
                    <td
                      key={k.key}
                      className="px-2 py-3 text-center text-xs font-bold text-slate-400 tabular-nums"
                    >
                      {avg}
                    </td>
                  );
                })}
                {/* Avg rata-rata */}
                <td className="px-3 py-3 text-center text-xs font-bold text-slate-400 tabular-nums">
                  {rataRata}
                </td>
                {/* Avg raport */}
                <td className="px-3 py-3 text-center">
                  <span className="text-sm font-black text-indigo-300 tabular-nums">
                    {rataRata}
                  </span>
                </td>
                {/* Tertinggi – Terendah */}
                <td className="px-3 py-3 text-xs text-slate-500">
                  ↑{tertinggi} ↓{terendah}
                </td>
                {/* Tuntas */}
                <td className="px-3 py-3">
                  <span className="text-xs font-bold text-emerald-400">
                    {tuntas}/{students.length} ({pctTuntas})
                  </span>
                </td>
              </tr>
            )}

            {students.length === 0 && (
              <tr>
                <td
                  colSpan={15}
                  className="px-4 py-8 text-center text-slate-600 text-sm"
                >
                  Belum ada data siswa.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <p className="text-xs text-slate-700 text-center print:hidden">
        Data diperbarui setiap import Excel · Gunakan Ctrl+P untuk mencetak laporan
      </p>
    </div>
  );
}
