// =============================================================================
// FILE: app/api/guru/bobot/route.ts
// TUJUAN: API Endpoint untuk mengelola bobot dan status aktif Task per Subject.
//         - GET : Ambil tasks (beserta bobot & isActive) berdasarkan subjectId
//         - POST: Simpan bobot baru per Task, lalu re-kalkulasi semua Grade terkait
// =============================================================================

import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { hitungGradeDari } from "@/lib/gradeCalc";

// GET: Ambil tasks beserta bobot dan status aktif untuk suatu mata pelajaran
export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user || !["guru", "admin"].includes(session.user.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const subjectIdStr = req.nextUrl.searchParams.get("subjectId");
  if (!subjectIdStr) {
    return NextResponse.json({ error: "subjectId wajib diisi." }, { status: 400 });
  }

  const subjectId = Number(subjectIdStr);
  try {
    const subject = await prisma.subject.findUnique({
      where: { id: subjectId },
      include: {
        tasks: {
          orderBy: { urutan: "asc" },
        },
      },
    });

    if (!subject) {
      return NextResponse.json({ error: "Mata pelajaran tidak ditemukan." }, { status: 404 });
    }

    return NextResponse.json({ ok: true, subject, tasks: subject.tasks });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// POST: Perbarui bobot dan status aktif tasks, lalu re-kalkulasi semua Grade
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user || !["guru", "admin"].includes(session.user.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const subjectId = Number(body.subjectId);

    if (!subjectId) {
      return NextResponse.json({ error: "subjectId wajib diisi." }, { status: 400 });
    }

    // body.tasks = [{ id: number, bobot: number, isActive: boolean }, ...]
    const tasksUpdate: { id: number; bobot: number; isActive: boolean }[] =
      body.tasks || [];

    if (tasksUpdate.length === 0) {
      return NextResponse.json({ error: "Data tasks wajib diisi." }, { status: 400 });
    }

    // Validasi total bobot dari task yang aktif harus 100
    const totalBobot = tasksUpdate
      .filter((t) => t.isActive)
      .reduce((sum, t) => sum + Number(t.bobot), 0);

    if (Math.round(totalBobot) !== 100) {
      return NextResponse.json(
        { error: `Total bobot task aktif harus 100%. Total saat ini: ${totalBobot}%` },
        { status: 400 }
      );
    }

    // Update bobot dan isActive setiap task
    await Promise.all(
      tasksUpdate.map((t) =>
        prisma.task.update({
          where: { id: t.id },
          data: {
            bobot: Number(t.bobot),
            isActive: Boolean(t.isActive),
          },
        })
      )
    );

    // Ambil semua Task yang sudah diupdate
    const updatedTasks = await prisma.task.findMany({
      where: { subjectId },
    });

    // Ambil semua Grade yang berkaitan dengan subject ini beserta GradeDetail-nya
    const grades = await prisma.grade.findMany({
      where: { subjectId },
      include: {
        details: true,
      },
    });

    // Re-kalkulasi nilai setiap siswa berdasarkan bobot baru
    const updatePromises = grades.map(async (grade) => {
      const detailInputs = updatedTasks.map((task) => {
        const detail = grade.details.find((d) => d.taskId === task.id);
        return {
          taskId: task.id,
          nilai: detail?.nilai ?? null,
          bobot: task.bobot,
          isActive: task.isActive,
        };
      });

      const calc = hitungGradeDari(detailInputs);

      return prisma.grade.update({
        where: { id: grade.id },
        data: {
          rataRata: calc.rataRata,
          nilaiHasil: calc.nilaiHasil,
          nilaiRaport: calc.nilaiRaport,
          predikat: calc.predikat,
          statusTuntas: calc.statusTuntas,
          jumlahNilaiKosong: calc.jumlahNilaiKosong,
          persentaseMaju: calc.persentaseMaju,
        },
      });
    });

    await Promise.all(updatePromises);

    return NextResponse.json({
      ok: true,
      tasks: updatedTasks,
      recalculatedCount: grades.length,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
