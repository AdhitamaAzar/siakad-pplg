// =============================================================================
// FILE: app/api/admin/guru/assign/route.ts
// TUJUAN: API Endpoint bagi Admin untuk menugaskan Guru ke Kelas & Mapel (TeacherClassSubject).
//         - POST: Menambahkan penugasan baru
//         - DELETE: Menghapus penugasan yang ada
// =============================================================================

import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { auth } from "@/lib/auth";

// ─── POST: BUAT PENUGASAN BARU ───────────────────────────────────────────────
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user || session.user.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { teacherId, kelasId, subjectId } = body;

    if (!teacherId || !kelasId || !subjectId) {
      return NextResponse.json({ error: "Semua parameter wajib diisi." }, { status: 400 });
    }

    // Cek duplikasi penugasan
    const existing = await prisma.teacherClassSubject.findUnique({
      where: {
        teacherId_kelasId_subjectId: {
          teacherId: Number(teacherId),
          kelasId: Number(kelasId),
          subjectId: Number(subjectId),
        },
      },
    });

    if (existing) {
      return NextResponse.json({ error: "Penugasan ini sudah terdaftar." }, { status: 400 });
    }

    const assignment = await prisma.teacherClassSubject.create({
      data: {
        teacherId: Number(teacherId),
        kelasId: Number(kelasId),
        subjectId: Number(subjectId),
      },
    });

    return NextResponse.json({ ok: true, assignment });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// ─── DELETE: HAPUS PENUGASAN ──────────────────────────────────────────────────
export async function DELETE(req: NextRequest) {
  const session = await auth();
  if (!session?.user || session.user.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");

  if (!id) {
    return NextResponse.json({ error: "ID penugasan wajib diisi." }, { status: 400 });
  }

  try {
    await prisma.teacherClassSubject.delete({
      where: { id: Number(id) },
    });

    return NextResponse.json({ ok: true, message: "Penugasan berhasil dihapus." });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
