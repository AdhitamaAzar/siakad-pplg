// =============================================================================
// FILE: app/guru/nilai/page.tsx
// TUJUAN: Server Component wrapper untuk halaman rekap nilai guru.
//         Mengambil data dari DB (Prisma), lalu render NilaiClientPage
//         yang menangani interaksi input/edit nilai.
// =============================================================================

import type { Metadata } from "next";
import prisma from "@/lib/prisma";
import NilaiClientPage from "./NilaiClientPage";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";

export const metadata: Metadata = { title: "Rekap Nilai — Guru" };

const TAHUN_AJARAN = "2025/2026";
const SEMESTER     = "Genap";

interface PageProps {
  searchParams: Promise<{ kelas?: string; mapel?: string }>;
}

export default async function GuruNilaiPage({ searchParams }: PageProps) {
  const session = await auth();
  if (!session?.user) {
    redirect("/login");
  }

  const sp = await searchParams;

  const kelasList = await prisma.class.findMany({
    where: { tahunAjaran: TAHUN_AJARAN },
    orderBy: { namaKelas: "asc" },
    select: { id: true, namaKelas: true },
  });

  const activeKelasId = sp.kelas ? Number(sp.kelas) : kelasList[0]?.id;

  const subjectsList = await prisma.subject.findMany({
    orderBy: { namaMapel: "asc" },
    select: { id: true, namaMapel: true, kodeMapel: true },
  });

  const activeSubjectId = sp.mapel ? Number(sp.mapel) : subjectsList[0]?.id;

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
          nilaiGithub: true,
          nilaiApi: true,
          nilaiAdminPanel: true,
          nilaiLandingPage: true,
          nilaiKagglePython: true,
          nilaiKaggleSql: true,
          nilaiKaggleMl: true,
          nilaiUjianMl: true,
          nilaiUjianSql: true,
          rataRata: true,
          nilaiRaport: true,
          predikat: true,
          subjectId: true,
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
