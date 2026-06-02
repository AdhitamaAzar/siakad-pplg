// =============================================================================
// FILE: app/guru/absensi/page.tsx
// TUJUAN: Halaman rekap absensi siswa per kelas.
//         Menampilkan total hadir, sakit, izin, alpha, dan persentase kehadiran.
//         Server Component — data dari Prisma.
// =============================================================================

import type { Metadata } from "next";
import prisma from "@/lib/prisma";
import Link from "next/link";
import { CalendarCheck } from "lucide-react";

export const metadata: Metadata = { title: "Absensi — Guru" };

const TAHUN_AJARAN = "2025/2026";
const SEMESTER     = "Genap";

interface PageProps {
  searchParams: Promise<{ kelas?: string }>;
}

function PersenBadge({ persen }: { persen: number | null }) {
  if (persen === null) return <span className="text-slate-700 text-xs">—</span>;
  const cfg =
    persen >= 90 ? "bg-emerald-500/15 text-emerald-300" :
    persen >= 75 ? "bg-indigo-500/15 text-indigo-300" :
    persen >= 60 ? "bg-amber-500/15 text-amber-300" :
                   "bg-rose-500/15 text-rose-300";
  return (
    <span className={`px-2 py-0.5 rounded-full text-xs font-bold tabular-nums ${cfg}`}>
      {persen}%
    </span>
  );
}

export default async function GuruAbsensiPage({ searchParams }: PageProps) {
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
      attendances: {
        where: { semester: SEMESTER, tahunAjaran: TAHUN_AJARAN },
        take: 1,
        select: {
          totalHadir:      true,
          totalTidakHadir: true,
          persentaseHadir: true,
        },
      },
    },
    orderBy: { nama: "asc" },
  });

  // Hitung statistik kelas
  const withData = students.filter((s) => s.attendances[0]);
  const avgHadir = withData.length
    ? Math.round(withData.reduce((s, x) => s + (x.attendances[0]?.persentaseHadir ?? 0), 0) / withData.length)
    : null;

  return (
    <div className="space-y-5 max-w-[1100px]">

      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <CalendarCheck size={18} className="text-emerald-400" />
            <h1 className="text-xl font-bold text-white">Rekap Absensi</h1>
          </div>
          <p className="text-slate-500 text-sm">
            Semester {SEMESTER} {TAHUN_AJARAN} · {activeKelas?.namaKelas}
            {avgHadir !== null && (
              <> · Rata-rata kehadiran kelas: <span className="text-emerald-400 font-semibold">{avgHadir}%</span></>
            )}
          </p>
        </div>
      </div>

      {/* Tab kelas */}
      <div className="flex gap-2 flex-wrap">
        {kelasList.map((k) => (
          <Link
            key={k.id}
            href={`/guru/absensi?kelas=${k.id}`}
            className={`
              px-4 py-2 rounded-xl text-sm font-semibold border transition-all
              ${k.id === activeKelasId
                ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/40"
                : "bg-slate-900/60 text-slate-500 border-slate-800/60 hover:text-slate-300"}
            `}
          >
            {k.namaKelas}
          </Link>
        ))}
      </div>

      {/* Tabel absensi */}
      <div className="rounded-2xl border border-slate-800/60 bg-slate-900/60 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-800/60">
              {["#", "Nama Siswa", "Hadir", "Total Absen", "% Hadir"].map((h) => (
                <th key={h} className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/40">
            {students.map((s, i) => {
              const a = s.attendances[0];
              return (
                <tr key={s.id} className="hover:bg-white/[0.02] transition-colors">
                  <td className="px-4 py-3 text-slate-600 text-xs tabular-nums">{i + 1}</td>
                  <td className="px-4 py-3 font-medium text-slate-200">{s.nama}</td>
                  <td className="px-4 py-3 text-emerald-400 font-semibold tabular-nums text-sm">{a?.totalHadir ?? "—"}</td>
                  <td className="px-4 py-3 text-slate-500 tabular-nums text-sm">{a?.totalTidakHadir ?? "—"}</td>
                  <td className="px-4 py-3">
                    <PersenBadge persen={a?.persentaseHadir ?? null} />
                  </td>
                </tr>
              );
            })}
            {students.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-slate-600 text-sm">
                  Belum ada siswa di kelas ini.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <p className="text-xs text-slate-700 text-center">
        Data absensi diimport dari sheet absensi di file Excel · Persentase dihitung otomatis
      </p>
    </div>
  );
}
