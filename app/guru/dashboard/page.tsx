// =============================================================================
// FILE: app/guru/dashboard/page.tsx
// TUJUAN: Dashboard guru Fandik Ariyanto — ringkasan kelas yang diampu.
//         Menampilkan: stat kelas, statistik nilai, statistik absensi,
//                      grafik performa kelas, daftar siswa terbaru, progress nilai.
//         Server Component — data fetch langsung dari Prisma.
// =============================================================================

import type { Metadata } from "next";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import {
  Users,
  BookOpen,
  TrendingUp,
  CalendarCheck,
  Award,
} from "lucide-react";
import prisma from "@/lib/prisma";
import Link from "next/link";
import GuruDashboardTabs from "@/components/dashboard/GuruDashboardTabs";

import { getActiveAcademicConfig } from "@/lib/academicConfig";

export const metadata: Metadata = { title: "Dashboard Guru" };
export const revalidate = 300;

// ── WARNA PER KELAS ───────────────────────────────────────────────────────────
const KELAS_THEME = [
  { dot: "bg-indigo-400",  text: "text-indigo-400",  ring: "ring-indigo-500/30",  bg: "bg-indigo-500/10" },
  { dot: "bg-emerald-400", text: "text-emerald-400", ring: "ring-emerald-500/30", bg: "bg-emerald-500/10" },
  { dot: "bg-amber-400",   text: "text-amber-400",   ring: "ring-amber-500/30",   bg: "bg-amber-500/10" },
];

export default async function GuruDashboardPage() {
  const session = await auth();
  if (!session?.user) {
    redirect("/login");
  }

  const { tahunAjaran: TAHUN_AJARAN, semester: SEMESTER } = await getActiveAcademicConfig();
  const namaGuru = session?.user?.nama ?? "Guru";

  // ── Find Teacher Record ─────────────────────────────────────────────────────
  const teacherRecord = await prisma.teacher.findFirst({
    where: { userId: Number(session.user.id) },
  });

  let teacherId = teacherRecord?.id;
  if (!teacherId && session.user.role === "admin") {
    const firstTeacher = await prisma.teacher.findFirst();
    teacherId = firstTeacher?.id;
  }

  // ── Fetch Taught Classes ───────────────────────────────────────────────────
  let kelas = await prisma.class.findMany({
    where: {
      tahunAjaran: TAHUN_AJARAN,
      classSubjects: {
        some: {
          teacherId: teacherId,
        },
      },
    },
    include: {
      students: {
        select: { id: true, nama: true, nis: true },
        orderBy: { nama: "asc" },
      },
    },
    orderBy: { namaKelas: "asc" },
  });

  // Fallback if no classes are linked to this teacher
  if (kelas.length === 0) {
    kelas = await prisma.class.findMany({
      where: { tahunAjaran: TAHUN_AJARAN },
      include: {
        students: {
          select: { id: true, nama: true, nis: true },
          orderBy: { nama: "asc" },
        },
      },
      orderBy: { namaKelas: "asc" },
    });
  }

  const totalSiswa = kelas.reduce((s, k) => s + k.students.length, 0);
  const studentIds = kelas.flatMap((k) => k.students.map((s) => s.id));

  const tcsList = teacherId
    ? await prisma.teacherClassSubject.findMany({
        where: { teacherId },
        select: { subjectId: true },
      })
    : [];
  const assignedSubjectIds = Array.from(new Set(tcsList.map((t) => t.subjectId)));

  const gradesWhere: any = {
    studentId: { in: studentIds },
    semester: SEMESTER,
    tahunAjaran: TAHUN_AJARAN,
  };
  if (session.user.role === "guru" && teacherId) {
    gradesWhere.subjectId = { in: assignedSubjectIds };
  }

  // ── Fetch Taught Student Data paralel ──────────────────────────────────────
  const [allGrades, allAttendances, recentGrades] = await Promise.all([
    prisma.grade.findMany({
      where: gradesWhere,
      select: {
        nilaiRaport: true,
        statusTuntas: true,
        studentId: true,
        student: { select: { kelasId: true } },
      },
    }),
    prisma.attendance.findMany({
      where: {
        studentId: { in: studentIds },
        semester: SEMESTER,
        tahunAjaran: TAHUN_AJARAN,
      },
      select: {
        persentaseHadir: true,
        studentId: true,
        student: { select: { kelasId: true } },
      },
    }),
    prisma.grade.findMany({
      where: {
        ...gradesWhere,
        nilaiRaport: { not: null },
      },
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
  ]);

  // ── Calculate Stats ────────────────────────────────────────────────────────
  const totalGrades = allGrades.filter((g) => g.nilaiRaport !== null).length;
  const gradeValues = allGrades.map((g) => g.nilaiRaport).filter((v): v is number => v !== null);
  const avgNilaiGlobal = gradeValues.length
    ? gradeValues.reduce((a, b) => a + b, 0) / gradeValues.length
    : 0;

  const tuntasCount = allGrades.filter((g) => g.statusTuntas === "TUNTAS").length;
  const pctTuntas = totalGrades ? Math.round((tuntasCount / totalGrades) * 100) : 0;

  const avgKehadiranGlobal = allAttendances.length
    ? allAttendances.reduce((sum, a) => sum + a.persentaseHadir, 0) / allAttendances.length
    : 0;

  // ── Build Class Stats for Chart ────────────────────────────────────────────
  const kelasStatsForChart = kelas.map((k) => {
    const classGrades = allGrades.filter((g) => g.student.kelasId === k.id && g.nilaiRaport !== null);
    const classAttendances = allAttendances.filter((a) => a.student.kelasId === k.id);

    const rataRataNilai = classGrades.length
      ? classGrades.reduce((sum, g) => sum + (g.nilaiRaport ?? 0), 0) / classGrades.length
      : 0;

    const tuntas = classGrades.filter((g) => g.statusTuntas === "TUNTAS").length;
    const persentaseTuntas = classGrades.length ? (tuntas / classGrades.length) * 100 : 0;

    const persentaseHadir = classAttendances.length
      ? classAttendances.reduce((sum, a) => sum + a.persentaseHadir, 0) / classAttendances.length
      : 0;

    return {
      id: k.id,
      namaKelas: k.namaKelas,
      totalSiswa: k.students.length,
      rataRataNilai: Math.round(rataRataNilai * 10) / 10,
      persentaseTuntas: Math.round(persentaseTuntas * 10) / 10,
      persentaseHadir: Math.round(persentaseHadir * 10) / 10,
    };
  });

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
          Semester {SEMESTER} {TAHUN_AJARAN} · Mengajar {totalSiswa} siswa di {kelas.length} kelas PPLG
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
          { icon: Users,         label: "Siswa Diajar", value: totalSiswa,          sub: `${kelas.length} kelas aktif`,   color: "text-indigo-400", bg: "bg-indigo-500/10" },
          { icon: BookOpen,      label: "Kelas Diampu", value: kelas.length,        sub: kelas.map((k) => k.namaKelas.replace("XI PPLG ", "")).join(", "), color: "text-sky-400",    bg: "bg-sky-500/10" },
          { icon: TrendingUp,    label: "Rata-rata Nilai", value: avgNilaiGlobal ? avgNilaiGlobal.toFixed(1) : "—", sub: `KKM Kelulusan 75`, color: "text-emerald-400",bg: "bg-emerald-500/10" },
          { icon: CalendarCheck, label: "Kehadiran Siswa", value: avgKehadiranGlobal ? `${avgKehadiranGlobal.toFixed(1)}%` : "—", sub: "Batas kelulusan 80%", color: "text-amber-400",  bg: "bg-amber-500/10" },
        ].map(({ icon: Icon, label, value, sub, color, bg }) => (
          <div key={label} className="rounded-2xl border border-slate-800/60 bg-slate-900/60 p-4 hover:bg-slate-900/80 transition-colors">
            <div className={`w-9 h-9 rounded-xl ${bg} flex items-center justify-center mb-3`}>
              <Icon size={18} className={color} />
            </div>
            <p className="text-xl font-bold text-white">{value}</p>
            <p className="text-xs font-semibold text-slate-300 mt-0.5">{label}</p>
            <p className="text-xs text-slate-600 mt-0.5 truncate">{sub}</p>
          </div>
        ))}
      </div>

      {/* ── TABS (OVERVIEW, ANALYSIS, RECENT) ────────────────────────────── */}
      <GuruDashboardTabs
        totalSiswa={totalSiswa}
        kelas={kelas}
        avgNilaiGlobal={avgNilaiGlobal}
        pctTuntas={pctTuntas}
        tuntasCount={tuntasCount}
        avgKehadiranGlobal={avgKehadiranGlobal}
        kelasStatsForChart={kelasStatsForChart}
        recentGrades={recentGrades}
      />

    </div>
  );
}
