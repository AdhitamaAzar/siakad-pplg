// =============================================================================
// FILE: app/guru/siswa/page.tsx
// TUJUAN: Halaman daftar siswa per kelas untuk guru.
//         Filter kelas via URL search param ?kelas=<id>.
//         Menampilkan tabel siswa dengan nilai raport & status tuntas.
// =============================================================================

import type { Metadata } from "next";
import { Users, Search } from "lucide-react";
import prisma from "@/lib/prisma";
import Link from "next/link";

export const metadata: Metadata = { title: "Daftar Siswa — Guru" };

const TAHUN_AJARAN = "2025/2026";
const SEMESTER     = "Genap";

interface PageProps {
  searchParams: Promise<{ kelas?: string }>;
}

function NilaiBadge({ nilai }: { nilai: number | null }) {
  if (nilai === null) return <span className="text-slate-700 text-xs">—</span>;
  const cfg =
    nilai >= 90 ? "bg-emerald-500/15 text-emerald-300 border-emerald-500/25" :
    nilai >= 75 ? "bg-indigo-500/15 text-indigo-300 border-indigo-500/25" :
    nilai >= 60 ? "bg-amber-500/15 text-amber-300 border-amber-500/25" :
                  "bg-rose-500/15 text-rose-300 border-rose-500/25";
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold border tabular-nums ${cfg}`}>
      {nilai}
    </span>
  );
}

export default async function GuruSiswaPage({ searchParams }: PageProps) {
  const sp = await searchParams;

  // Ambil semua kelas
  const kelasList = await prisma.class.findMany({
    where: { tahunAjaran: TAHUN_AJARAN },
    orderBy: { namaKelas: "asc" },
  });

  // Kelas aktif — default kelas pertama
  const activeKelasId = sp.kelas ? Number(sp.kelas) : kelasList[0]?.id;
  const activeKelas   = kelasList.find((k) => k.id === activeKelasId);

  // Ambil siswa dengan nilai
  const students = await prisma.student.findMany({
    where: { kelasId: activeKelasId },
    include: {
      grades: {
        where: { semester: SEMESTER, tahunAjaran: TAHUN_AJARAN },
        take: 1,
        select: { nilaiRaport: true, predikat: true, statusTuntas: true },
      },
    },
    orderBy: { nama: "asc" },
  });

  // Hitung ranking
  const studentsWithRank = students
    .map((s) => ({ ...s, grade: s.grades[0] ?? null }))
    .sort((a, b) => (b.grade?.nilaiRaport ?? 0) - (a.grade?.nilaiRaport ?? 0))
    .map((s, i) => ({ ...s, rank: s.grade?.nilaiRaport ? i + 1 : null }));

  return (
    <div className="space-y-6 max-w-[1100px]">

      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Users size={18} className="text-indigo-400" />
            <h1 className="text-xl font-bold text-white">Daftar Siswa</h1>
          </div>
          <p className="text-slate-500 text-sm">
            Semester {SEMESTER} {TAHUN_AJARAN} · {activeKelas?.namaKelas}
          </p>
        </div>
        <Link
          href="/guru/import"
          className="
            flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold
            bg-indigo-500/15 text-indigo-300 border border-indigo-500/25
            hover:bg-indigo-500/25 transition-colors
          "
        >
          📊 Import Excel
        </Link>
      </div>

      {/* Tab kelas */}
      <div className="flex gap-2 flex-wrap">
        {kelasList.map((k) => (
          <Link
            key={k.id}
            href={`/guru/siswa?kelas=${k.id}`}
            className={`
              px-4 py-2 rounded-xl text-sm font-semibold border transition-all duration-200
              ${k.id === activeKelasId
                ? "bg-indigo-500/20 text-indigo-300 border-indigo-500/40"
                : "bg-slate-900/60 text-slate-500 border-slate-800/60 hover:text-slate-300"}
            `}
          >
            {k.namaKelas}
          </Link>
        ))}
      </div>

      {/* Tabel */}
      <div className="rounded-2xl border border-slate-800/60 bg-slate-900/60 overflow-hidden">
        {/* Header tabel */}
        <div className="px-5 py-4 border-b border-slate-800/60 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Search size={14} className="text-slate-600" />
            <span className="text-sm text-slate-400 font-medium">
              {students.length} siswa ditemukan
            </span>
          </div>
          <span className="text-xs text-slate-600">
            {students.filter((s) => s.grades[0]?.nilaiRaport).length} nilai sudah masuk
          </span>
        </div>

        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-800/60">
              {["#", "Rank", "Nama Siswa", "NIS", "Nilai Raport", "Predikat", "Status"].map((h) => (
                <th
                  key={h}
                  className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-500"
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/40">
            {studentsWithRank.map((s, i) => (
              <tr key={s.id} className="hover:bg-white/[0.02] transition-colors">
                <td className="px-4 py-3 text-slate-600 text-xs tabular-nums">{i + 1}</td>
                <td className="px-4 py-3">
                  {s.rank ? (
                    <span className={`
                      text-xs font-bold tabular-nums
                      ${s.rank === 1 ? "text-amber-400" : s.rank <= 3 ? "text-slate-300" : "text-slate-600"}
                    `}>
                      #{s.rank}
                    </span>
                  ) : (
                    <span className="text-slate-700 text-xs">—</span>
                  )}
                </td>
                <td className="px-4 py-3 font-medium text-slate-200">{s.nama}</td>
                <td className="px-4 py-3 text-slate-500 font-mono text-xs">{s.nis}</td>
                <td className="px-4 py-3">
                  <NilaiBadge nilai={s.grade?.nilaiRaport ?? null} />
                </td>
                <td className="px-4 py-3 text-slate-500 text-xs">{s.grade?.predikat ?? "—"}</td>
                <td className="px-4 py-3">
                  {s.grade?.statusTuntas ? (
                    <span className={`
                      text-[11px] font-semibold px-2 py-0.5 rounded-full
                      ${s.grade.statusTuntas === "TUNTAS"
                        ? "bg-emerald-500/15 text-emerald-300"
                        : "bg-rose-500/15 text-rose-300"}
                    `}>
                      {s.grade.statusTuntas}
                    </span>
                  ) : (
                    <span className="text-slate-700 text-xs">Belum dinilai</span>
                  )}
                </td>
              </tr>
            ))}

            {students.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-slate-600 text-sm">
                  Belum ada siswa di kelas ini.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

    </div>
  );
}
