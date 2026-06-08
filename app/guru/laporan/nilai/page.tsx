// =============================================================================
// FILE: app/guru/laporan/nilai/page.tsx
// TUJUAN: Halaman rekap nilai laporan untuk guru.
//         Menampilkan nilai per task (dinamis) + statistik kelas.
//         Mendukung filter kelas via searchParams.
// =============================================================================

import type { Metadata } from "next";
import prisma from "@/lib/prisma";
import Link from "next/link";
import { FileText, Printer, TrendingUp, TrendingDown, BarChart3, CheckCircle2 } from "lucide-react";
import { getActiveAcademicConfig } from "@/lib/academicConfig";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";

export const metadata: Metadata = { title: "Rekap Nilai — Laporan" };

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
  searchParams: Promise<{ kelas?: string; mapel?: string }>;
}

export default async function GuruLaporanNilaiPage({ searchParams }: PageProps) {
  const session = await auth();
  if (!session?.user) {
    redirect("/login");
  }

  const sp = await searchParams;
  const { tahunAjaran: TAHUN_AJARAN, semester: SEMESTER } = await getActiveAcademicConfig();

  const teacher = await prisma.teacher.findFirst({
    where: { userId: Number(session.user.id) },
  });
  const teacherId = teacher?.id;

  const tcsList = teacherId
    ? await prisma.teacherClassSubject.findMany({
        where: { teacherId },
        select: { kelasId: true, subjectId: true },
      })
    : [];

  const assignedClassIds = Array.from(new Set(tcsList.map((t) => t.kelasId)));
  const assignedSubjectIds = Array.from(new Set(tcsList.map((t) => t.subjectId)));

  const isTeacher = session.user.role === "guru" && teacherId;

  const kelasList = await prisma.class.findMany({
    where: {
      tahunAjaran: TAHUN_AJARAN,
      id: isTeacher ? { in: assignedClassIds } : undefined,
    },
    orderBy: { namaKelas: "asc" },
  });

  const activeKelasId = sp.kelas ? Number(sp.kelas) : kelasList[0]?.id;
  const activeKelas   = kelasList.find((k) => k.id === activeKelasId);

  // Ambil semua subject + tasks
  const subjectsList = await prisma.subject.findMany({
    where: {
      id: isTeacher ? { in: assignedSubjectIds } : undefined,
    },
    orderBy: { namaMapel: "asc" },
    select: { id: true, namaMapel: true, kodeMapel: true },
  });
  const activeSubjectId = sp.mapel ? Number(sp.mapel) : subjectsList[0]?.id;

  // Ambil tasks untuk subject aktif (untuk header kolom dinamis)
  const activeTasks = activeSubjectId
    ? await prisma.task.findMany({
        where: { 
          subjectId: activeSubjectId, 
          isActive: true,
          teacherId: teacherId || undefined,
        },
        orderBy: { urutan: "asc" },
      })
    : [];

  // Ambil siswa + grade + grade details
  const students = await prisma.student.findMany({
    where: { kelasId: activeKelasId },
    include: {
      grades: {
        where: { semester: SEMESTER, tahunAjaran: TAHUN_AJARAN, subjectId: activeSubjectId },
        take: 1,
        include: {
          details: {
            include: { task: true },
          },
        },
      },
    },
    orderBy: { nama: "asc" },
  });

  // ─── Kalkulasi statistik ──────────────────────────────────────────────────
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

      {/* ── Filter kelas & mapel ─────────────────────────────────────── */}
      <div className="flex flex-wrap gap-4 print:hidden">
        <div className="flex gap-2 flex-wrap">
          {kelasList.map((k) => (
            <Link
              key={k.id}
              href={`/guru/laporan/nilai?kelas=${k.id}${activeSubjectId ? `&mapel=${activeSubjectId}` : ""}`}
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
        <div className="flex gap-2 flex-wrap">
          {subjectsList.map((s) => (
            <Link
              key={s.id}
              href={`/guru/laporan/nilai?kelas=${activeKelasId}&mapel=${s.id}`}
              className={`
                px-4 py-2 rounded-xl text-sm font-semibold border transition-all
                ${s.id === activeSubjectId
                  ? "bg-purple-500/20 text-purple-300 border-purple-500/40"
                  : "bg-slate-900/60 text-slate-500 border-slate-800/60 hover:text-slate-300"}
              `}
            >
              {s.namaMapel}
            </Link>
          ))}
        </div>
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
              {/* Kolom dinamis berdasarkan tasks */}
              {activeTasks.map((t) => (
                <th
                  key={t.id}
                  className="px-2 py-3 text-center text-[11px] font-semibold uppercase tracking-wider text-slate-500"
                >
                  {t.nama}
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
                  {/* Nilai per task (dinamis) */}
                  {activeTasks.map((t) => {
                    const detail = g?.details?.find((d) => d.taskId === t.id);
                    return <Cell key={t.id} nilai={detail?.nilai ?? null} />;
                  })}
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
                {/* Rata-rata per task */}
                {activeTasks.map((t) => {
                  const vals = students
                    .map((s) => {
                      const g = s.grades[0];
                      const detail = g?.details?.find((d) => d.taskId === t.id);
                      return detail?.nilai ?? null;
                    })
                    .filter((v): v is number => v !== null);
                  const avg = vals.length
                    ? (vals.reduce((a, b) => a + b, 0) / vals.length).toFixed(0)
                    : "—";
                  return (
                    <td
                      key={t.id}
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
                  colSpan={activeTasks.length + 6}
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
