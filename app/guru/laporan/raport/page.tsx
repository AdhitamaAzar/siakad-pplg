// =============================================================================
// FILE: app/guru/laporan/raport/page.tsx
// TUJUAN: Server Component wrapper untuk halaman Cetak Raport Resmi.
//         Mengambil profil siswa, nilai lengkap (GradeDetail), absensi, dan catatan.
// =============================================================================

import type { Metadata } from "next";
import prisma from "@/lib/prisma";
import RaportClientPage from "./RaportClientPage";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getActiveAcademicConfig } from "@/lib/academicConfig";

export const metadata: Metadata = { title: "Cetak Raport Resmi — Guru" };

interface PageProps {
  searchParams: Promise<{ siswa?: string }>;
}

export default async function GuruRaportPage({ searchParams }: PageProps) {
  const session = await auth();
  if (!session?.user || !["guru", "admin"].includes(session.user.role)) {
    redirect("/login");
  }

  const { tahunAjaran: TAHUN_AJARAN, semester: SEMESTER } = await getActiveAcademicConfig();
  const sp = await searchParams;
  const selectedStudentId = sp.siswa ? Number(sp.siswa) : null;

  // Fetch all classes
  const kelasList = await prisma.class.findMany({
    where: { tahunAjaran: TAHUN_AJARAN },
    orderBy: { namaKelas: "asc" },
    select: { id: true, namaKelas: true },
  });

  // Fetch student brief lists for the dropdown selector
  const rawStudentsList = await prisma.student.findMany({
    where: {
      kelas: {
        tahunAjaran: TAHUN_AJARAN,
      },
    },
    orderBy: { nama: "asc" },
    select: {
      id: true,
      nama: true,
      nis: true,
      kelasId: true,
    },
  });

  // Fetch full student report details if a student is selected
  let selectedStudentData = null;
  if (selectedStudentId) {
    const student = await prisma.student.findUnique({
      where: { id: selectedStudentId },
      include: {
        kelas: {
          select: { id: true, namaKelas: true },
        },
        grades: {
          where: { semester: SEMESTER, tahunAjaran: TAHUN_AJARAN },
          take: 1,
          include: {
            subject: {
              select: { id: true, namaMapel: true, kodeMapel: true },
            },
            details: {
              include: {
                task: {
                  select: { id: true, nama: true, bobot: true, isActive: true, urutan: true },
                },
              },
              orderBy: { task: { urutan: "asc" } },
            },
          },
        },
        attendances: {
          where: { semester: SEMESTER, tahunAjaran: TAHUN_AJARAN },
          take: 1,
          select: {
            totalHadir: true,
            totalTidakHadir: true,
            persentaseHadir: true,
          },
        },
        notes: {
          orderBy: { createdAt: "desc" },
          select: {
            id: true,
            judulProyek: true,
            catatan: true,
            nilaiTotal: true,
          },
        },
      },
    });

    if (student) {
      selectedStudentData = {
        id: student.id,
        nama: student.nama,
        nis: student.nis,
        kelas: student.kelas,
        grades: student.grades,
        attendances: student.attendances,
        notes: student.notes,
      };
    }
  }

  return (
    <RaportClientPage
      kelasList={kelasList}
      studentsList={rawStudentsList}
      selectedStudent={selectedStudentData}
      semester={SEMESTER}
      tahunAjaran={TAHUN_AJARAN}
      teacherName={session.user.nama}
    />
  );
}
