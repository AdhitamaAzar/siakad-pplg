// =============================================================================
// FILE: app/guru/absensi/page.tsx
// TUJUAN: Halaman rekap absensi siswa per kelas.
//         Menampilkan total hadir, sakit, izin, alpha, dan persentase kehadiran.
//         Server Component — data dari Prisma.
// =============================================================================

import type { Metadata } from "next";
import prisma from "@/lib/prisma";
import AbsensiClientPage from "./AbsensiClientPage";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";

import { getActiveAcademicConfig } from "@/lib/academicConfig";

export const metadata: Metadata = { title: "Absensi — Guru" };

interface PageProps {
  searchParams: Promise<{ kelas?: string }>;
}

export default async function GuruAbsensiPage({ searchParams }: PageProps) {
  const session = await auth();
  if (!session?.user) {
    redirect("/login");
  }

  const { tahunAjaran: TAHUN_AJARAN, semester: SEMESTER } = await getActiveAcademicConfig();
  const sp = await searchParams;

  const kelasList = await prisma.class.findMany({
    where: { tahunAjaran: TAHUN_AJARAN },
    orderBy: { namaKelas: "asc" },
  });

  const activeKelasId = sp.kelas ? Number(sp.kelas) : kelasList[0]?.id;

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

  return (
    <AbsensiClientPage
      kelasList={kelasList}
      students={students}
      activeKelasId={activeKelasId}
      semester={SEMESTER}
      tahunAjaran={TAHUN_AJARAN}
    />
  );
}
