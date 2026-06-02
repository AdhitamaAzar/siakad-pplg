// =============================================================================
// FILE: app/guru/nilai/page.tsx
// TUJUAN: Halaman rekap nilai lengkap semua siswa per kelas.
//         Menampilkan 9 komponen nilai + nilai raport + predikat.
//         Filter per kelas, export-ready.
// =============================================================================

import type { Metadata } from "next";
import prisma from "@/lib/prisma";
import Link from "next/link";

export const metadata: Metadata = { title: "Rekap Nilai — Guru" };

const TAHUN_AJARAN = "2025/2026";
const SEMESTER     = "Genap";

const KOMPONEN = [
  { key: "nilaiGithub",     label: "Github" },
  { key: "nilaiApi",        label: "API" },
  { key: "nilaiAdminPanel", label: "Admin" },
  { key: "nilaiLandingPage",label: "Landing" },
  { key: "nilaiKagglePython",label: "Py" },
  { key: "nilaiKaggleSql",  label: "SQL" },
  { key: "nilaiKaggleMl",   label: "ML" },
  { key: "nilaiUjianMl",    label: "U.ML" },
  { key: "nilaiUjianSql",   label: "U.SQL" },
] as const;

type GradeKey = typeof KOMPONEN[number]["key"];

function Cell({ nilai }: { nilai: number | null }) {
  if (nilai === null) return <td className="px-2 py-2.5 text-center text-slate-700 text-xs">—</td>;
  const cls =
    nilai >= 90 ? "text-emerald-400" :
    nilai >= 75 ? "text-indigo-300" :
    nilai >= 60 ? "text-amber-400" : "text-rose-400";
  return (
    <td className={`px-2 py-2.5 text-center text-xs font-semibold tabular-nums ${cls}`}>
      {nilai}
    </td>
  );
}

interface PageProps {
  searchParams: Promise<{ kelas?: string }>;
}

export default async function GuruNilaiPage({ searchParams }: PageProps) {
  const sp = await searchParams;

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

  return (
    <div className="space-y-5 max-w-[1300px]">

      {/* Header */}
      <div>
        <h1 className="text-xl font-bold text-white">Rekap Nilai</h1>
        <p className="text-slate-500 text-sm mt-1">Semester {SEMESTER} {TAHUN_AJARAN} · {activeKelas?.namaKelas}</p>
      </div>

      {/* Tab kelas */}
      <div className="flex gap-2 flex-wrap">
        {kelasList.map((k) => (
          <Link
            key={k.id}
            href={`/guru/nilai?kelas=${k.id}`}
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

      {/* Tabel nilai komponen — scrollable horizontal */}
      <div className="rounded-2xl border border-slate-800/60 bg-slate-900/60 overflow-auto">
        <table className="w-full text-sm whitespace-nowrap">
          <thead>
            <tr className="border-b border-slate-800/60">
              <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-500 sticky left-0 bg-slate-900/60">#</th>
              <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-500 sticky left-8 bg-slate-900/60 min-w-[180px]">Nama Siswa</th>
              {KOMPONEN.map((k) => (
                <th key={k.key} className="px-2 py-3 text-center text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                  {k.label}
                </th>
              ))}
              <th className="px-3 py-3 text-center text-[11px] font-semibold uppercase tracking-wider text-slate-400">Avg</th>
              <th className="px-3 py-3 text-center text-[11px] font-semibold uppercase tracking-wider text-indigo-400">Raport</th>
              <th className="px-3 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-500">Predikat</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/40">
            {students.map((s, i) => {
              const g = s.grades[0] ?? null;
              return (
                <tr key={s.id} className="hover:bg-white/[0.02]">
                  <td className="px-4 py-2.5 text-slate-600 text-xs sticky left-0 bg-inherit">{i + 1}</td>
                  <td className="px-4 py-2.5 text-slate-200 font-medium sticky left-8 bg-inherit min-w-[180px]">{s.nama}</td>
                  {KOMPONEN.map((k) => (
                    <Cell key={k.key} nilai={g ? (g[k.key as GradeKey] as number | null) : null} />
                  ))}
                  <td className="px-3 py-2.5 text-center text-xs font-semibold text-slate-400 tabular-nums">
                    {g?.rataRata?.toFixed(1) ?? "—"}
                  </td>
                  <td className="px-3 py-2.5 text-center">
                    <span className={`text-sm font-bold tabular-nums ${
                      !g?.nilaiRaport ? "text-slate-700" :
                      g.nilaiRaport >= 90 ? "text-emerald-400" :
                      g.nilaiRaport >= 75 ? "text-indigo-300" :
                      "text-amber-400"
                    }`}>
                      {g?.nilaiRaport ?? "—"}
                    </span>
                  </td>
                  <td className="px-3 py-2.5 text-slate-500 text-xs">{g?.predikat ?? "—"}</td>
                </tr>
              );
            })}
            {students.length === 0 && (
              <tr>
                <td colSpan={14} className="px-4 py-8 text-center text-slate-600 text-sm">
                  Belum ada data siswa.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <p className="text-xs text-slate-700 text-center">
        Data otomatis terupdate setiap 5 menit · Klik Import Excel untuk memperbarui data
      </p>
    </div>
  );
}
