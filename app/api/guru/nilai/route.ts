// =============================================================================
// FILE: app/api/guru/nilai/route.ts
// TUJUAN: API Endpoint untuk guru input/edit nilai siswa secara manual.
//         - GET : Ambil nilai siswa beserta GradeDetail-nya (by studentId + subjectId)
//         - POST: Upsert nilai per task (GradeDetail) + auto-hitung kalkulasi akhir
// =============================================================================

import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { hitungGradeDari } from "@/lib/gradeCalc";
import { getActiveAcademicConfig } from "@/lib/academicConfig";

// ─── GET: ambil nilai 1 siswa ─────────────────────────────────────────────────
export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { tahunAjaran: TAHUN_AJARAN, semester: SEMESTER } = await getActiveAcademicConfig();

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
      include: {
        details: {
          include: {
            task: true,
          },
          orderBy: {
            task: { urutan: "asc" },
          },
        },
      },
    });

    // Ambil semua task untuk subject ini agar bisa ditampilkan meski belum ada nilai
    const tasks = await prisma.task.findMany({
      where: { subjectId: Number(subjectId) },
      orderBy: { urutan: "asc" },
    });

    return NextResponse.json({ ok: true, grade, tasks });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// ─── POST: upsert nilai siswa (per task) ─────────────────────────────────────
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user || !["guru", "admin"].includes(session.user.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { tahunAjaran: TAHUN_AJARAN, semester: SEMESTER } = await getActiveAcademicConfig();

  try {
    const body = await req.json();
    const studentId = Number(body.studentId);
    const subjectId = Number(body.subjectId);

    if (!studentId || !subjectId) {
      return NextResponse.json({ error: "studentId dan subjectId wajib diisi." }, { status: 400 });
    }

    // body.details = [{ taskId: number, nilai: number | null }, ...]
    const detailsInput: { taskId: number; nilai: number | null }[] = body.details || [];

    // Pastikan siswa dan mata pelajaran ada
    const student = await prisma.student.findUnique({ where: { id: studentId } });
    if (!student) {
      return NextResponse.json({ error: "Siswa tidak ditemukan." }, { status: 404 });
    }

    const subject = await prisma.subject.findUnique({ where: { id: subjectId } });
    if (!subject) {
      return NextResponse.json({ error: "Mata pelajaran tidak ditemukan." }, { status: 404 });
    }

    // Upsert Grade (buat jika belum ada)
    let grade = await prisma.grade.findFirst({
      where: { studentId, subjectId, semester: SEMESTER, tahunAjaran: TAHUN_AJARAN },
    });

    if (!grade) {
      grade = await prisma.grade.create({
        data: {
          studentId,
          subjectId,
          semester: SEMESTER,
          tahunAjaran: TAHUN_AJARAN,
        },
      });
    }

    // Upsert setiap GradeDetail
    for (const detail of detailsInput) {
      if (detail.taskId) {
        await prisma.gradeDetail.upsert({
          where: {
            gradeId_taskId: {
              gradeId: grade.id,
              taskId: detail.taskId,
            },
          },
          update: {
            nilai: detail.nilai !== null && detail.nilai !== undefined ? Number(detail.nilai) : null,
          },
          create: {
            gradeId: grade.id,
            taskId: detail.taskId,
            nilai: detail.nilai !== null && detail.nilai !== undefined ? Number(detail.nilai) : null,
          },
        });
      }
    }

    // Ambil semua Task untuk subject ini dan semua GradeDetail terbaru
    const allTasks = await prisma.task.findMany({
      where: { subjectId },
    });

    const allDetails = await prisma.gradeDetail.findMany({
      where: { gradeId: grade.id },
      include: { task: true },
    });

    // Hitung kalkulasi akhir
    const calc = hitungGradeDari(
      allTasks.map((task) => {
        const detail = allDetails.find((d) => d.taskId === task.id);
        return {
          taskId: task.id,
          nilai: detail?.nilai ?? null,
          bobot: task.bobot,
          isActive: task.isActive,
        };
      })
    );

    // Gabungkan dengan TA1/TA2 jika ada
    const ta1 = grade.nilaiTa1 ?? 0;
    const ta2 = grade.nilaiTa2 ?? 0;
    const listFinal: number[] = [];
    if (calc.rataRata !== null) listFinal.push(calc.rataRata);
    if (ta1 > 0) listFinal.push(ta1);
    if (ta2 > 0) listFinal.push(ta2);

    const nilaiHasil = listFinal.length > 0
      ? listFinal.reduce((a, b) => a + b, 0) / listFinal.length
      : null;
    const nilaiRaport = nilaiHasil !== null ? Math.round(nilaiHasil) : null;
    const predikat = nilaiRaport !== null
      ? nilaiRaport >= 90 ? "Sangat Baik"
        : nilaiRaport >= 75 ? "Baik"
        : nilaiRaport >= 60 ? "Cukup"
        : "Perlu Bimbingan"
      : null;
    const statusTuntas = nilaiRaport !== null
      ? nilaiRaport >= 75 ? "TUNTAS" : "BELUM"
      : null;

    // Update Grade dengan hasil kalkulasi terbaru
    const updatedGrade = await prisma.grade.update({
      where: { id: grade.id },
      data: {
        rataRata: calc.rataRata,
        nilaiHasil,
        nilaiRaport,
        predikat,
        statusTuntas,
        jumlahNilaiKosong: calc.jumlahNilaiKosong,
        persentaseMaju: calc.persentaseMaju,
      },
      include: {
        details: {
          include: { task: true },
          orderBy: { task: { urutan: "asc" } },
        },
      },
    });

    return NextResponse.json({ ok: true, grade: updatedGrade });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
