// =============================================================================
// FILE: app/guru/ranking/page.tsx
// TUJUAN: Server Component wrapper untuk halaman ranking global guru.
//         Mengambil data kelas dan data siswa + grades per semester dari DB.
// =============================================================================

import type { Metadata } from "next";
import prisma from "@/lib/prisma";
import RankingClientPage from "./RankingClientPage";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";

import { getActiveAcademicConfig } from "@/lib/academicConfig";

export const metadata: Metadata = { title: "Ranking Global Siswa — Guru" };

export default async function GuruRankingPage() {
  const session = await auth();
  if (!session?.user || !["guru", "admin"].includes(session.user.role)) {
    redirect("/login");
  }

  const { tahunAjaran: TAHUN_AJARAN, semester: SEMESTER } = await getActiveAcademicConfig();

  const teacher = await prisma.teacher.findFirst({
    where: { userId: Number(session.user.id) },
  });
  const teacherId = teacher?.id;

  const tcsList = teacherId
    ? await prisma.teacherClassSubject.findMany({
        where: { teacherId },
        select: { kelasId: true },
      })
    : [];

  const assignedClassIds = Array.from(new Set(tcsList.map((t) => t.kelasId)));
  const isTeacher = session.user.role === "guru" && teacherId;

  // Fetch all classes
  const kelasList = await prisma.class.findMany({
    where: {
      tahunAjaran: TAHUN_AJARAN,
      id: isTeacher ? { in: assignedClassIds } : undefined,
    },
    orderBy: { namaKelas: "asc" },
    select: { id: true, namaKelas: true },
  });

  // Fetch all students with their grades for ranking
  const rawStudents = await prisma.student.findMany({
    where: {
      kelasId: isTeacher ? { in: assignedClassIds } : undefined,
      kelas: {
        tahunAjaran: TAHUN_AJARAN,
      },
    },
    include: {
      kelas: {
        select: { id: true, namaKelas: true },
      },
      grades: {
        where: { semester: SEMESTER, tahunAjaran: TAHUN_AJARAN },
        take: 1,
        select: {
          rataRata: true,
          nilaiRaport: true,
          predikat: true,
          statusTuntas: true,
        },
      },
    },
    orderBy: { nama: "asc" },
  });

  // Format data
  const students = rawStudents.map((s) => ({
    id: s.id,
    nama: s.nama,
    nis: s.nis,
    kelas: {
      id: s.kelas.id,
      namaKelas: s.kelas.namaKelas,
    },
    grade: s.grades[0] ?? null,
  }));

  return (
    <RankingClientPage
      kelasList={kelasList}
      students={students}
      semester={SEMESTER}
      tahunAjaran={TAHUN_AJARAN}
    />
  );
}
