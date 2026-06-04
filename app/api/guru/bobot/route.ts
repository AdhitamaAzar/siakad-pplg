// =============================================================================
// FILE: app/api/guru/bobot/route.ts
// TUJUAN: API Endpoint untuk mengelola bobot penilaian dan status aktif kolom
//         per mata pelajaran (Subject).
//         - GET : Ambil bobot & status kolom berdasarkan subjectId
//         - POST: Simpan bobot baru & re-kalkulasi semua nilai terkait di DB
// =============================================================================

import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { hitungWeightedGrade, KOMPONEN_CONFIG } from "@/lib/gradeCalc";

// GET: Ambil data bobot dan kolom aktif untuk suatu mata pelajaran
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
    });

    if (!subject) {
      return NextResponse.json({ error: "Mata pelajaran tidak ditemukan." }, { status: 404 });
    }

    return NextResponse.json({ ok: true, subject });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// POST: Perbarui bobot dan kolom aktif, lalu re-kalkulasi semua Grade
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

    // Ambil data bobot dan active status dari request body
    const updateData: any = {};
    let totalWeight = 0;

    for (const comp of KOMPONEN_CONFIG) {
      const activeVal = body[comp.activeKey];
      const weightVal = Number(body[comp.weightKey]);

      updateData[comp.activeKey] = activeVal === true || activeVal === "true";
      updateData[comp.weightKey] = isNaN(weightVal) ? 0 : weightVal;

      // Hitung total bobot dari kolom yang diaktifkan
      if (updateData[comp.activeKey]) {
        totalWeight += updateData[comp.weightKey];
      }
    }

    // Validasi total bobot kolom aktif harus 100%
    if (totalWeight !== 100) {
      return NextResponse.json(
        { error: `Total bobot kolom aktif harus 100%. Total saat ini: ${totalWeight}%` },
        { status: 400 }
      );
    }

    // Update model Subject di DB
    const updatedSubject = await prisma.subject.update({
      where: { id: subjectId },
      data: updateData,
    });

    // Cari seluruh Grade yang berasosiasi dengan mata pelajaran ini
    const grades = await prisma.grade.findMany({
      where: { subjectId },
    });

    // Re-kalkulasi seluruh nilai siswa yang ada berdasarkan bobot baru
    const updatePromises = grades.map(async (grade) => {
      const gradeInput = {
        nilaiGithub: grade.nilaiGithub,
        nilaiApi: grade.nilaiApi,
        nilaiAdminPanel: grade.nilaiAdminPanel,
        nilaiLandingPage: grade.nilaiLandingPage,
        nilaiKagglePython: grade.nilaiKagglePython,
        nilaiKaggleSql: grade.nilaiKaggleSql,
        nilaiKaggleMl: grade.nilaiKaggleMl,
        nilaiUjianMl: grade.nilaiUjianMl,
        nilaiUjianSql: grade.nilaiUjianSql,
      };

      const calc = hitungWeightedGrade(gradeInput, updatedSubject);

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
      subject: updatedSubject,
      recalculatedCount: grades.length,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
