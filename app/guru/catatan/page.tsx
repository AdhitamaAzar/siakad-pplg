// =============================================================================
// FILE: app/guru/catatan/page.tsx
// TUJUAN: Halaman rekap catatan guru dan penilaian proyek per kelas.
//         Server Component: mengambil kelas & siswa + catatan lalu diteruskan
//         ke CatatanClientPage untuk pengolahan interaktif.
// =============================================================================

import type { Metadata } from "next";
import prisma from "@/lib/prisma";
import CatatanClientPage from "./CatatanClientPage";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";

import { getActiveAcademicConfig } from "@/lib/academicConfig";

export const metadata: Metadata = { title: "Catatan Guru — Panel Guru" };

interface PageProps {
  searchParams: Promise<{ kelas?: string }>;
}

export default async function CatatanGuruPage({ searchParams }: PageProps) {
  const session = await auth();
  if (!session?.user) {
    redirect("/login");
  }

  const { tahunAjaran: TAHUN_AJARAN, semester: SEMESTER } = await getActiveAcademicConfig();
  const sp = await searchParams;

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

  // Ambil daftar kelas aktif
  const kelasList = await prisma.class.findMany({
    where: {
      tahunAjaran: TAHUN_AJARAN,
      id: isTeacher ? { in: assignedClassIds } : undefined,
    },
    orderBy: { namaKelas: "asc" },
  });

  const activeKelasId = sp.kelas ? Number(sp.kelas) : kelasList[0]?.id;

  // Ambil daftar siswa beserta catatan mereka
  const studentsRaw = await prisma.student.findMany({
    where: { kelasId: activeKelasId },
    include: {
      notes: {
        where: {
          teacherId: isTeacher ? teacherId : undefined,
        },
        include: {
          teacher: {
            select: { nama: true },
          },
        },
        orderBy: { createdAt: "desc" },
      },
    },
    orderBy: { nama: "asc" },
  });

  // Konversi tipe data agar kompatibel dengan CatatanClientPage (karena Prisma Date harus dikonversi ke ISOString)
  const students = studentsRaw.map((student) => ({
    id: student.id,
    nama: student.nama,
    nis: student.nis,
    notes: student.notes.map((note) => ({
      id: note.id,
      judulProyek: note.judulProyek,
      catatan: note.catatan,
      nilaiItem: note.nilaiItem,
      nilaiData: note.nilaiData,
      nilaiAlur: note.nilaiAlur,
      nilaiMetode: note.nilaiMetode,
      nilaiTambah: note.nilaiTambah,
      nilaiUrutan: note.nilaiUrutan,
      nilaiTa1: note.nilaiTa1,
      nilaiTotal: note.nilaiTotal,
      createdAt: note.createdAt.toISOString(),
      teacher: {
        nama: note.teacher.nama,
      },
    })),
  }));

  return (
    <CatatanClientPage
      students={students}
      kelasList={kelasList.map((k) => ({ id: k.id, namaKelas: k.namaKelas }))}
      activeKelasId={activeKelasId}
    />
  );
}
