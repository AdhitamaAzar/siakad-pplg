// =============================================================================
// FILE: app/api/guru/catatan/route.ts
// TUJUAN: API Endpoint untuk CRUD Catatan Guru & Komponen Nilai Proyek.
//         - GET: Mengambil catatan berdasarkan studentId
//         - POST: Membuat catatan proyek baru beserta komponen skornya
//         - PUT: Mengubah catatan proyek yang sudah ada
//         - DELETE: Menghapus catatan proyek
// =============================================================================

import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { auth } from "@/lib/auth";

import { getActiveAcademicConfig } from "@/lib/academicConfig";

// Helper untuk menghitung nilai total rata-rata dari komponen yang diisi
function hitungTotalSkor(body: any): number | null {
  const scores = [
    body.nilaiItem,
    body.nilaiData,
    body.nilaiAlur,
    body.nilaiMetode,
    body.nilaiTambah,
    body.nilaiUrutan,
    body.nilaiTa1,
  ].filter((v) => v !== null && v !== undefined && v !== "");

  if (scores.length === 0) return null;
  const sum = scores.reduce((acc, v) => acc + Number(v), 0);
  return Math.round((sum / scores.length) * 10) / 10;
}

// Sync nilai TA1 ke tabel Grade agar terhitung di nilai raport
async function syncGradeTa1(studentId: number, nilaiTa1: number | null) {
  if (nilaiTa1 === null) return;

  const { tahunAjaran: TAHUN_AJARAN, semester: SEMESTER } = await getActiveAcademicConfig();

  const grade = await prisma.grade.findFirst({
    where: { studentId, semester: SEMESTER, tahunAjaran: TAHUN_AJARAN },
  });

  if (grade) {
    // Re-kalkulasi nilaiHasil dan nilaiRaport jika diperlukan
    const github = grade.nilaiGithub ?? 0;
    const api = grade.nilaiApi ?? 0;
    const admin = grade.nilaiAdminPanel ?? 0;
    const landing = grade.nilaiLandingPage ?? 0;
    const py = grade.nilaiKagglePython ?? 0;
    const sql = grade.nilaiKaggleSql ?? 0;
    const ml = grade.nilaiKaggleMl ?? 0;
    const uml = grade.nilaiUjianMl ?? 0;
    const usql = grade.nilaiUjianSql ?? 0;

    const listTugas = [github, api, admin, landing, py, sql, ml, uml, usql].filter((v) => v > 0);
    const avgTugas = listTugas.length ? listTugas.reduce((a, b) => a + b, 0) / listTugas.length : 0;
    
    // Gabungan tugas + TA1 + TA2
    const ta1 = nilaiTa1;
    const ta2 = grade.nilaiTa2 ?? 0;

    const listFinal = [avgTugas];
    if (ta1 > 0) listFinal.push(ta1);
    if (ta2 > 0) listFinal.push(ta2);

    const nilaiHasil = listFinal.reduce((a, b) => a + b, 0) / listFinal.length;
    const nilaiRaport = Math.round(nilaiHasil);
    const statusTuntas = nilaiRaport >= 75 ? "TUNTAS" : "BELUM";
    const predikat =
      nilaiRaport >= 90 ? "Sangat Baik" :
      nilaiRaport >= 75 ? "Baik" :
      nilaiRaport >= 60 ? "Cukup" : "Perlu Bimbingan";

    await prisma.grade.update({
      where: { id: grade.id },
      data: {
        nilaiTa1,
        nilaiHasil,
        nilaiRaport,
        statusTuntas,
        predikat,
      },
    });
  }
}

// ─── GET: AMBIL CATATAN SISWA ──────────────────────────────────────────────────
export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const studentId = searchParams.get("studentId");

  if (!studentId) {
    return NextResponse.json({ error: "studentId is required" }, { status: 400 });
  }

  try {
    const notes = await prisma.note.findMany({
      where: { studentId: Number(studentId) },
      include: {
        teacher: {
          select: { nama: true },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ ok: true, notes });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// ─── POST: BUAT CATATAN BARU ───────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user || !["guru", "admin"].includes(session.user.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const studentId = Number(body.studentId);
    
    if (!studentId || !body.catatan) {
      return NextResponse.json({ error: "studentId dan catatan wajib diisi." }, { status: 400 });
    }

    // Dapatkan data teacher pengunggah
    const teacher = await prisma.teacher.findFirst({
      where: { userId: Number(session.user.id) },
    });

    if (!teacher && session.user.role === "guru") {
      return NextResponse.json({ error: "Profil Guru pengunggah tidak ditemukan." }, { status: 404 });
    }

    // Jika admin, default to first teacher
    let teacherId = teacher?.id;
    if (!teacherId && session.user.role === "admin") {
      const firstTeacher = await prisma.teacher.findFirst();
      teacherId = firstTeacher?.id;
    }

    if (!teacherId) {
      return NextResponse.json({ error: "Guru penanggung jawab tidak ditemukan." }, { status: 400 });
    }

    let nilaiTotal = body.nilaiTotal !== null && body.nilaiTotal !== undefined && body.nilaiTotal !== "" ? Number(body.nilaiTotal) : null;
    if (nilaiTotal === null) {
      nilaiTotal = hitungTotalSkor(body);
    }

    const note = await prisma.note.create({
      data: {
        studentId,
        teacherId,
        judulProyek: body.judulProyek || "Proyek Mandiri",
        catatan: body.catatan,
        nilaiItem: body.nilaiItem !== null && body.nilaiItem !== "" ? Number(body.nilaiItem) : null,
        nilaiData: body.nilaiData !== null && body.nilaiData !== "" ? Number(body.nilaiData) : null,
        nilaiAlur: body.nilaiAlur !== null && body.nilaiAlur !== "" ? Number(body.nilaiAlur) : null,
        nilaiMetode: body.nilaiMetode !== null && body.nilaiMetode !== "" ? Number(body.nilaiMetode) : null,
        nilaiTambah: body.nilaiTambah !== null && body.nilaiTambah !== "" ? Number(body.nilaiTambah) : null,
        nilaiUrutan: body.nilaiUrutan !== null && body.nilaiUrutan !== "" ? Number(body.nilaiUrutan) : null,
        nilaiTa1: body.nilaiTa1 !== null && body.nilaiTa1 !== "" ? Number(body.nilaiTa1) : null,
        nilaiTotal,
      },
    });

    // Sync TA1 ke Grade jika diinput
    if (body.nilaiTa1 !== null && body.nilaiTa1 !== "") {
      await syncGradeTa1(studentId, Number(body.nilaiTa1));
    }

    return NextResponse.json({ ok: true, note });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// ─── PUT: EDIT CATATAN ─────────────────────────────────────────────────────────
export async function PUT(req: NextRequest) {
  const session = await auth();
  if (!session?.user || !["guru", "admin"].includes(session.user.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const id = Number(body.id);

    if (!id || !body.catatan) {
      return NextResponse.json({ error: "ID dan catatan wajib diisi." }, { status: 400 });
    }

    let nilaiTotal = body.nilaiTotal !== null && body.nilaiTotal !== undefined && body.nilaiTotal !== "" ? Number(body.nilaiTotal) : null;
    if (nilaiTotal === null) {
      nilaiTotal = hitungTotalSkor(body);
    }

    const note = await prisma.note.update({
      where: { id },
      data: {
        judulProyek: body.judulProyek || "Proyek Mandiri",
        catatan: body.catatan,
        nilaiItem: body.nilaiItem !== null && body.nilaiItem !== "" ? Number(body.nilaiItem) : null,
        nilaiData: body.nilaiData !== null && body.nilaiData !== "" ? Number(body.nilaiData) : null,
        nilaiAlur: body.nilaiAlur !== null && body.nilaiAlur !== "" ? Number(body.nilaiAlur) : null,
        nilaiMetode: body.nilaiMetode !== null && body.nilaiMetode !== "" ? Number(body.nilaiMetode) : null,
        nilaiTambah: body.nilaiTambah !== null && body.nilaiTambah !== "" ? Number(body.nilaiTambah) : null,
        nilaiUrutan: body.nilaiUrutan !== null && body.nilaiUrutan !== "" ? Number(body.nilaiUrutan) : null,
        nilaiTa1: body.nilaiTa1 !== null && body.nilaiTa1 !== "" ? Number(body.nilaiTa1) : null,
        nilaiTotal,
      },
    });

    // Sync TA1 ke Grade jika diinput
    if (body.nilaiTa1 !== null && body.nilaiTa1 !== "") {
      await syncGradeTa1(note.studentId, Number(body.nilaiTa1));
    }

    return NextResponse.json({ ok: true, note });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// ─── DELETE: HAPUS CATATAN ──────────────────────────────────────────────────────
export async function DELETE(req: NextRequest) {
  const session = await auth();
  if (!session?.user || !["guru", "admin"].includes(session.user.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");

  if (!id) {
    return NextResponse.json({ error: "ID wajib diisi." }, { status: 400 });
  }

  const { tahunAjaran: TAHUN_AJARAN, semester: SEMESTER } = await getActiveAcademicConfig();

  try {
    const note = await prisma.note.delete({
      where: { id: Number(id) },
    });

    // Sync ulang grade (reset TA1 ke null atau 0 jika tidak ada catatan lain)
    const otherNotes = await prisma.note.findFirst({
      where: { studentId: note.studentId, nilaiTa1: { not: null } },
    });
    
    // Jika tidak ada catatan lain dengan TA1, kosongkan TA1 di Grade
    if (!otherNotes) {
      const grade = await prisma.grade.findFirst({
        where: { studentId: note.studentId, semester: SEMESTER, tahunAjaran: TAHUN_AJARAN },
      });
      if (grade) {
        await prisma.grade.update({
          where: { id: grade.id },
          data: {
            nilaiTa1: null,
            nilaiHasil: grade.rataRata, // fallback ke rataRata saja
            nilaiRaport: grade.rataRata ? Math.round(grade.rataRata) : null,
          },
        });
      }
    }

    return NextResponse.json({ ok: true, message: "Catatan berhasil dihapus." });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
