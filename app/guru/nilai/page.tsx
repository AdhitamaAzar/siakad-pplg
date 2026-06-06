// =============================================================================
// FILE: app/guru/nilai/page.tsx
// TUJUAN: Server Component wrapper untuk halaman rekap nilai guru.
//         Mengambil data dari DB (Prisma), lalu render NilaiClientPage.
//         Menggunakan sistem dinamis Task + GradeDetail.
// =============================================================================

import type { Metadata } from "next";
import prisma from "@/lib/prisma";
import NilaiClientPage from "./NilaiClientPage";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getActiveAcademicConfig } from "@/lib/academicConfig";

export const metadata: Metadata = { title: "Rekap Nilai — Guru" };

interface PageProps {
  searchParams: Promise<{ kelas?: string; mapel?: string }>;
}

export default async function GuruNilaiPage({ searchParams }: PageProps) {
  const session = await auth();
  if (!session?.user) {
    redirect("/login");
  }

  const { tahunAjaran: TAHUN_AJARAN, semester: SEMESTER } = await getActiveAcademicConfig();
  const sp = await searchParams;

  const kelasList = await prisma.class.findMany({
    where: { tahunAjaran: TAHUN_AJARAN },
    orderBy: { namaKelas: "asc" },
    select: { id: true, namaKelas: true },
  });

  const activeKelasId = sp.kelas ? Number(sp.kelas) : kelasList[0]?.id;

  // Ambil subject beserta tasks-nya (sistem dinamis)
  const subjectsList = await prisma.subject.findMany({
    orderBy: { namaMapel: "asc" },
    select: {
      id: true,
      namaMapel: true,
      kodeMapel: true,
      tingkat: true,
      tasks: {
        orderBy: { urutan: "asc" },
        select: {
          id: true,
          nama: true,
          bobot: true,
          isActive: true,
          urutan: true,
        },
      },
    },
  });

  const activeSubjectId = sp.mapel ? Number(sp.mapel) : subjectsList[0]?.id;

  // Ambil siswa + grade + grade details (sistem dinamis)
  const students = await prisma.student.findMany({
    where: { kelasId: activeKelasId },
    orderBy: { nama: "asc" },
    select: {
      id: true,
      nama: true,
      nis: true,
      grades: {
        where: {
          semester: SEMESTER,
          tahunAjaran: TAHUN_AJARAN,
          subjectId: activeSubjectId,
        },
        take: 1,
        select: {
          id: true,
          rataRata: true,
          nilaiRaport: true,
          predikat: true,
          statusTuntas: true,
          jumlahNilaiKosong: true,
          persentaseMaju: true,
          subjectId: true,
          details: {
            select: {
              taskId: true,
              nilai: true,
            },
          },
        },
      },
    },
  });

  return (
    <NilaiClientPage
      key={`${activeKelasId}-${activeSubjectId}`}
      kelasList={kelasList}
      subjectsList={subjectsList}
      students={students}
      activeKelasId={activeKelasId}
      activeSubjectId={activeSubjectId}
      semester={SEMESTER}
      tahunAjaran={TAHUN_AJARAN}
    />
  );
}
