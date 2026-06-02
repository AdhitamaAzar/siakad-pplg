// =============================================================================
// FILE: app/guru/dashboard/page.tsx
// TUJUAN: Dashboard guru Fandik Ariyanto — ringkasan 3 kelas XI PPLG.
//         Menampilkan: stat kelas, daftar siswa terbaru, progress nilai.
//         Server Component — data fetch langsung dari Prisma.
// =============================================================================

import type { Metadata } from "next";
import { auth } from "@/lib/auth";
import {
  Users, BookOpen, TrendingUp, CalendarCheck,
  ChevronRight, Award
} from "lucide-react";
import prisma from "@/lib/prisma";
import Link from "next/link";

export const metadata: Metadata = { title: "Dashboard Guru" };
export const revalidate = 300;

const SEMESTER     = "Genap";
const TAHUN_AJARAN = "2025/2026";

// ── WARNA PER KELAS ───────────────────────────────────────────────────────────
const KELAS_THEME = [
  { dot: "bg-indigo-400",  text: "text-indigo-400",  ring: "ring-indigo-500/30",  bg: "bg-indigo-500/10" },
  { dot: "bg-emerald-400", text: "text-emerald-400", ring: "ring-emerald-500/30", bg: "bg-emerald-500/10" },
  { dot: "bg-amber-400",   text: "text-amber-400",   ring: "ring-amber-500/30",   bg: "bg-amber-500/10" },
];

export default async function GuruDashboardPage() {
  const session = await auth();
  const namaGuru = session?.user?.nama ?? "Guru";

  // ── Fetch data paralel ──────────────────────────────────────────────────────
  const [kelas, recentGrades, totalGrades] = await Promise.all([
    prisma.class.findMany({
      where: { tahunAjaran: TAHUN_AJARAN },
      include: {
        students: {
          select: { id: true, nama: true, nis: true },
          take: 5,
          orderBy: { nama: "asc" },
        },
      },
      orderBy: { namaKelas: "asc" },
    }),

    prisma.grade.findMany({
      where: { semester: SEMESTER, tahunAjaran: TAHUN_AJARAN, nilaiRaport: { not: null } },
      orderBy: { updatedAt: "desc" },
      take: 5,
      include: {
        student: {
          select: {
            nama: true,
            kelas: { select: { namaKelas: true } },
          },
        },
      },
    }),

    prisma.grade.count({
      where: { semester: SEMESTER, tahunAjaran: TAHUN_AJARAN, nilaiRaport: { not: null } },
    }),
  ]);

  const totalSiswa = kelas.reduce((s, k) => s + k.students.length, 0);

  // Jam greeting
  const jam  = new Date().getHours();
  const sapa = jam < 11 ? "Selamat Pagi" : jam < 15 ? "Selamat Siang" : jam < 18 ? "Selamat Sore" : "Selamat Malam";

  return (
    <div className="space-y-6 max-w-[1200px]">

      {/* ── GREETING ──────────────────────────────────────────────────── */}
      <div
        className="rounded-2xl p-6 border border-indigo-500/20 relative overflow-hidden"
        style={{ background: "linear-gradient(135deg, rgba(99,102,241,0.08), rgba(79,70,229,0.04))" }}
      >
        <div className="absolute right-6 top-1/2 -translate-y-1/2 opacity-5">
          <BookOpen size={120} />
        </div>
        <p className="text-indigo-300 text-sm font-medium mb-1">{sapa},</p>
        <h1 className="text-2xl font-bold text-white">{namaGuru} 👋</h1>
        <p className="text-slate-400 text-sm mt-2">
          Semester Genap 2025/2026 · {totalSiswa} siswa · {kelas.length} kelas XI PPLG
        </p>
        <div className="mt-3 flex items-center gap-2">
          <div className="flex items-center gap-1.5 bg-indigo-500/15 border border-indigo-500/25 rounded-full px-3 py-1">
            <Award size={12} className="text-indigo-400" />
            <span className="text-xs text-indigo-300 font-medium">{totalGrades} nilai sudah diinput</span>
          </div>
        </div>
      </div>

      {/* ── STAT CARDS ────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { icon: Users,         label: "Total Siswa",  value: totalSiswa,      sub: "3 kelas aktif",            color: "text-indigo-400", bg: "bg-indigo-500/10" },
          { icon: BookOpen,      label: "Total Kelas",  value: kelas.length,    sub: "XI PPLG 1, 2, 3",          color: "text-sky-400",    bg: "bg-sky-500/10" },
          { icon: TrendingUp,    label: "Nilai Masuk",  value: totalGrades,     sub: "nilai raport diinput",     color: "text-emerald-400",bg: "bg-emerald-500/10" },
          { icon: CalendarCheck, label: "Semester",     value: "Genap",         sub: "Tahun Ajaran 2025/2026",   color: "text-amber-400",  bg: "bg-amber-500/10" },
        ].map(({ icon: Icon, label, value, sub, color, bg }) => (
          <div key={label} className="rounded-2xl border border-slate-800/60 bg-slate-900/60 p-4 hover:bg-slate-900/80 transition-colors">
            <div className={`w-9 h-9 rounded-xl ${bg} flex items-center justify-center mb-3`}>
              <Icon size={18} className={color} />
            </div>
            <p className="text-xl font-bold text-white">{value}</p>
            <p className="text-xs font-semibold text-slate-300 mt-0.5">{label}</p>
            <p className="text-xs text-slate-600 mt-0.5">{sub}</p>
          </div>
        ))}
      </div>

      {/* ── RINGKASAN KELAS ───────────────────────────────────────────── */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="w-1 h-4 rounded-full bg-indigo-500" />
            <h2 className="text-sm font-semibold text-slate-300">Kelas yang Diampu</h2>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {kelas.map((k, i) => {
            const theme = KELAS_THEME[i % KELAS_THEME.length];
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

      {/* ── NILAI TERBARU ─────────────────────────────────────────────── */}
      {recentGrades.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-3">
            <div className="w-1 h-4 rounded-full bg-amber-400" />
            <h2 className="text-sm font-semibold text-slate-300">Nilai Terbaru Diinput</h2>
          </div>

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
        </div>
      )}

      {/* ── QUICK ACTIONS ─────────────────────────────────────────────── */}
      <div>
        <div className="flex items-center gap-2 mb-3">
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

    </div>
  );
}
