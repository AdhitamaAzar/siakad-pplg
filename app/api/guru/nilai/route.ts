// =============================================================================
// FILE: app/api/guru/nilai/route.ts
// TUJUAN: API Endpoint untuk guru input/edit nilai siswa secara manual.
//         - GET : Ambil nilai siswa (by studentId)
//         - POST: Upsert 9 komponen nilai + auto-hitung rata-rata & nilai raport
// =============================================================================

import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { hitungWeightedGrade, KOMPONEN_CONFIG, KomponenKey } from "@/lib/gradeCalc";

import { getActiveAcademicConfig } from "@/lib/academicConfig";

// ─── GET: ambil nilai 1 siswa ──────────────────────────────────────────────────
export async function GET(req: NextRequest) {
  const session = await auth();
  const { tahunAjaran: TAHUN_AJARAN, semester: SEMESTER } = await getActiveAcademicConfig();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const studentId = req.nextUrl.searchParams.get("studentId");
  const subjectId = req.nextUrl.searchParams.get("subjectId");
  if (!studentId || !subjectId) {
    return NextResponse.json({ error: "studentId dan subjectId wajib diisi." }, { status: 400 });
  }

  try {
    const grade = await prisma.grade.findFirst({
      where: {
        studentId: Number(studentId),
        subjectId: Number(subjectId),
        semester: SEMESTER,
        tahunAjaran: TAHUN_AJARAN,
      },
    });
    return NextResponse.json({ ok: true, grade });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// ─── POST: upsert nilai siswa ──────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  const session = await auth();
  const { tahunAjaran: TAHUN_AJARAN, semester: SEMESTER } = await getActiveAcademicConfig();
  if (!session?.user || !["guru", "admin"].includes(session.user.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const studentId = Number(body.studentId);
    const subjectId = Number(body.subjectId);

    if (!studentId || !subjectId) {
      return NextResponse.json({ error: "studentId dan subjectId wajib diisi." }, { status: 400 });
    }

    // Pastikan siswa ada
    const student = await prisma.student.findUnique({ where: { id: studentId } });
    if (!student) {
      return NextResponse.json({ error: "Siswa tidak ditemukan." }, { status: 404 });
    }

    // Pastikan mata pelajaran ada dan dapatkan konfigurasi bobot
    const subject = await prisma.subject.findUnique({ where: { id: subjectId } });
    if (!subject) {
      return NextResponse.json({ error: "Mata pelajaran tidak ditemukan." }, { status: 404 });
    }

    // Ambil nilai komponen dari body (null jika kosong)
    const kompoData: Partial<Record<KomponenKey, number | null>> = {};
    for (const comp of KOMPONEN_CONFIG) {
      const raw = body[comp.key];
      kompoData[comp.key] = raw !== "" && raw !== null && raw !== undefined ? Number(raw) : null;
    }

    // Kalkulasi nilai berbobot
    const calc = hitungWeightedGrade(kompoData, subject);

    // Upsert ke DB
    const grade = await prisma.grade.upsert({
      where: {
        studentId_subjectId_semester_tahunAjaran: {
          studentId,
          subjectId,
          semester: SEMESTER,
          tahunAjaran: TAHUN_AJARAN,
        },
      },
      update: {
        ...kompoData,
        rataRata: calc.rataRata,
        nilaiHasil: calc.nilaiHasil,
        nilaiRaport: calc.nilaiRaport,
        predikat: calc.predikat,
        statusTuntas: calc.statusTuntas,
        jumlahNilaiKosong: calc.jumlahNilaiKosong,
        persentaseMaju: calc.persentaseMaju,
      },
      create: {
        studentId,
        subjectId,
        semester: SEMESTER,
        tahunAjaran: TAHUN_AJARAN,
        ...kompoData,
        rataRata: calc.rataRata,
        nilaiHasil: calc.nilaiHasil,
        nilaiRaport: calc.nilaiRaport,
        predikat: calc.predikat,
        statusTuntas: calc.statusTuntas,
        jumlahNilaiKosong: calc.jumlahNilaiKosong,
        persentaseMaju: calc.persentaseMaju,
      },
    });

    return NextResponse.json({ ok: true, grade });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
