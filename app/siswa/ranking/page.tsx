// =============================================================================
// FILE: app/siswa/ranking/page.tsx
// TUJUAN: Halaman ranking kelas untuk siswa yang sedang login.
//         Menampilkan daftar siswa sekelas diurutkan berdasarkan nilaiRaport,
//         dengan highlight baris siswa yang sedang login.
// SEMESTER: Genap 2025/2026
// =============================================================================

import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { Trophy, Medal, Star, Users } from "lucide-react";

export const metadata: Metadata = { title: "Ranking Kelas" };

const SEMESTER     = "Genap";
const TAHUN_AJARAN = "2025/2026";

// ─── HELPERS ─────────────────────────────────────────────────────────────────

function getNilaiColor(nilai: number | null): string {
  if (nilai === null) return "text-slate-600";
  if (nilai >= 90)   return "text-emerald-400";
  if (nilai >= 75)   return "text-indigo-400";
  if (nilai >= 60)   return "text-amber-400";
  return "text-rose-400";
}

function getPredikatStyle(predikat: string | null | undefined): string {
  switch (predikat) {
    case "Sangat Baik":     return "bg-emerald-500/15 text-emerald-300 border-emerald-500/25";
    case "Baik":            return "bg-indigo-500/15 text-indigo-300 border-indigo-500/25";
    case "Cukup":           return "bg-amber-500/15 text-amber-300 border-amber-500/25";
    case "Perlu Bimbingan": return "bg-rose-500/15 text-rose-300 border-rose-500/25";
    default:                return "bg-slate-800/40 text-slate-600 border-slate-700/30";
  }
}

function RankBadge({ rank }: { rank: number }) {
  if (rank === 1)
    return (
      <span className="inline-flex items-center gap-1 text-amber-400 font-black text-sm">
        🥇 <span className="tabular-nums">1</span>
      </span>
    );
  if (rank === 2)
    return (
      <span className="inline-flex items-center gap-1 text-slate-300 font-black text-sm">
        🥈 <span className="tabular-nums">2</span>
      </span>
    );
  if (rank === 3)
    return (
      <span className="inline-flex items-center gap-1 text-amber-700 font-black text-sm">
        🥉 <span className="tabular-nums">3</span>
      </span>
    );
  return (
    <span className="text-slate-600 font-semibold tabular-nums text-sm">
      #{rank}
    </span>
  );
}

// ─── PAGE ─────────────────────────────────────────────────────────────────────

export default async function SiswaRankingPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  // Ambil data siswa yang login beserta kelas
  const currentStudent = await prisma.student.findUnique({
    where: { userId: Number(session.user.id) },
    include: { kelas: true },
  });

  if (!currentStudent) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-slate-500">Data siswa tidak ditemukan.</p>
      </div>
    );
  }

  // Ambil semua siswa satu kelas beserta nilai
  const allStudents = await prisma.student.findMany({
    where: { kelasId: currentStudent.kelasId },
    include: {
      grades: {
        where: { semester: SEMESTER, tahunAjaran: TAHUN_AJARAN },
        take: 1,
        select: {
          nilaiRaport: true,
          predikat:    true,
          statusTuntas: true,
          rataRata:    true,
        },
      },
    },
    orderBy: { nama: "asc" },
  });

  // Sortir berdasarkan nilaiRaport desc, null paling bawah
  const ranked = allStudents
    .map((s) => ({ ...s, grade: s.grades[0] ?? null }))
    .sort((a, b) => {
      const av = a.grade?.nilaiRaport ?? -1;
      const bv = b.grade?.nilaiRaport ?? -1;
      return bv - av;
    })
    .map((s, idx) => ({
      ...s,
      rank: s.grade?.nilaiRaport != null ? idx + 1 : null,
    }));

  // Temukan posisi siswa yang login
  const myEntry = ranked.find((s) => s.id === currentStudent.id);
  const myRank  = myEntry?.rank ?? null;

  // Hitung statistik kelas
  const withNilai = ranked.filter((s) => s.grade?.nilaiRaport != null);
  const avgKelas  = withNilai.length
    ? withNilai.reduce((acc, s) => acc + (s.grade?.nilaiRaport ?? 0), 0) / withNilai.length
    : null;
  const tuntas    = withNilai.filter((s) => s.grade?.statusTuntas === "TUNTAS").length;

  return (
    <div className="space-y-6 max-w-3xl">

      {/* ── Header ─────────────────────────────────────────────────────── */}
      <div>
        <h1 className="text-xl font-bold text-white flex items-center gap-2">
          <Trophy size={18} className="text-amber-400" />
          Ranking Kelas
        </h1>
        <p className="text-slate-500 text-sm mt-1">
          {currentStudent.kelas.namaKelas} · Semester {SEMESTER} {TAHUN_AJARAN}
        </p>
      </div>

      {/* ── Posisi saya (highlight card) ─────────────────────────────── */}
      {myRank && (
        <div className="rounded-2xl border border-indigo-500/30 bg-indigo-500/5 p-5">
          <div className="flex items-center gap-2 mb-1">
            <Medal size={16} className="text-indigo-400" />
            <span className="text-xs font-semibold text-indigo-400 uppercase tracking-wider">
              Posisi Kamu
            </span>
          </div>
          <div className="flex items-center gap-4 mt-2">
            <span className="text-5xl font-black text-indigo-300 tabular-nums leading-none">
              #{myRank}
            </span>
            <div className="w-px h-12 bg-slate-700/40" />
            <div className="flex flex-col gap-1">
              <span className="text-slate-200 font-semibold">{currentStudent.nama}</span>
              <span className="text-xs text-slate-500">
                dari {allStudents.length} siswa ·{" "}
                <span className={getNilaiColor(myEntry?.grade?.nilaiRaport ?? null)}>
                  Nilai {myEntry?.grade?.nilaiRaport ?? "—"}
                </span>
              </span>
            </div>
          </div>
        </div>
      )}

      {/* ── Statistik kelas ──────────────────────────────────────────── */}
      <div className="grid grid-cols-3 gap-3">
        <div className="rounded-2xl border border-slate-800/60 bg-slate-900/40 p-4 text-center">
          <Users size={16} className="text-slate-500 mx-auto mb-2" />
          <span className="text-2xl font-black text-slate-200 tabular-nums">
            {allStudents.length}
          </span>
          <p className="text-xs text-slate-600 mt-0.5">Total Siswa</p>
        </div>
        <div className="rounded-2xl border border-emerald-500/25 bg-emerald-500/5 p-4 text-center">
          <Star size={16} className="text-emerald-400 mx-auto mb-2" />
          <span className="text-2xl font-black text-emerald-400 tabular-nums">
            {avgKelas?.toFixed(1) ?? "—"}
          </span>
          <p className="text-xs text-slate-600 mt-0.5">Rata-rata Kelas</p>
        </div>
        <div className="rounded-2xl border border-indigo-500/25 bg-indigo-500/5 p-4 text-center">
          <Trophy size={16} className="text-indigo-400 mx-auto mb-2" />
          <span className="text-2xl font-black text-indigo-400 tabular-nums">
            {tuntas}
          </span>
          <p className="text-xs text-slate-600 mt-0.5">Tuntas</p>
        </div>
      </div>

      {/* ── Tabel ranking ────────────────────────────────────────────── */}
      <div className="rounded-2xl border border-slate-800/60 bg-slate-900/60 overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-800/60">
          <h2 className="text-sm font-semibold text-slate-300">
            Daftar Ranking — {currentStudent.kelas.namaKelas}
          </h2>
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-800/60">
              <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-500 w-16">
                Rank
              </th>
              <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                Nama Siswa
              </th>
              <th className="px-4 py-3 text-center text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                Nilai Raport
              </th>
              <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                Predikat
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/40">
            {ranked.map((s) => {
              const isMe = s.id === currentStudent.id;
              return (
                <tr
                  key={s.id}
                  className={`
                    transition-colors
                    ${isMe
                      ? "bg-indigo-500/10 border-l-2 border-l-indigo-500"
                      : "hover:bg-white/[0.02]"}
                  `}
                >
                  {/* Rank */}
                  <td className="px-4 py-3">
                    {s.rank ? (
                      <RankBadge rank={s.rank} />
                    ) : (
                      <span className="text-slate-700 text-xs">—</span>
                    )}
                  </td>

                  {/* Nama */}
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <span
                        className={`font-medium ${isMe ? "text-indigo-200" : "text-slate-200"}`}
                      >
                        {s.nama}
                      </span>
                      {isMe && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-indigo-500/20 text-indigo-400 font-semibold border border-indigo-500/30">
                          Kamu
                        </span>
                      )}
                    </div>
                  </td>

                  {/* Nilai Raport */}
                  <td className="px-4 py-3 text-center">
                    <span
                      className={`text-lg font-black tabular-nums ${getNilaiColor(s.grade?.nilaiRaport ?? null)}`}
                    >
                      {s.grade?.nilaiRaport ?? "—"}
                    </span>
                  </td>

                  {/* Predikat */}
                  <td className="px-4 py-3">
                    {s.grade?.predikat ? (
                      <span
                        className={`inline-flex px-2 py-0.5 rounded-full text-[11px] font-semibold border ${getPredikatStyle(s.grade.predikat)}`}
                      >
                        {s.grade.predikat}
                      </span>
                    ) : (
                      <span className="text-slate-700 text-xs">Belum dinilai</span>
                    )}
                  </td>
                </tr>
              );
            })}

            {ranked.length === 0 && (
              <tr>
                <td colSpan={4} className="px-4 py-10 text-center text-slate-600 text-sm">
                  Belum ada data siswa di kelas ini.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <p className="text-xs text-slate-700 text-center pb-2">
        Ranking dihitung berdasarkan nilai raport yang sudah diinput guru
      </p>
    </div>
  );
}
