// =============================================================================
// FILE: app/api/admin/kelas/route.ts
// TUJUAN: API Endpoint bagi Admin untuk mengelola data Kelas (Class CRUD).
//         - POST: Membuat kelas baru untuk tahun ajaran aktif
//         - DELETE: Menghapus kelas (dengan pengamanan cegah hapus jika ada siswa)
// =============================================================================

import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { auth } from "@/lib/auth";

const TAHUN_AJARAN = "2025/2026";

// ─── POST: BUAT KELAS BARU ───────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user || session.user.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { namaKelas, tingkat } = body;

    if (!namaKelas || !tingkat) {
      return NextResponse.json({ error: "Nama kelas dan tingkat wajib diisi." }, { status: 400 });
    }

    const t = Number(tingkat);
    if (isNaN(t) || t < 10 || t > 12) {
      return NextResponse.json({ error: "Tingkat kelas harus berupa angka antara 10 - 12." }, { status: 400 });
    }

    // Cek duplikasi kelas di tahun ajaran aktif
    const existingClass = await prisma.class.findUnique({
      where: {
        namaKelas_tahunAjaran: {
          namaKelas: namaKelas.trim(),
          tahunAjaran: TAHUN_AJARAN,
        },
      },
    });

    if (existingClass) {
      return NextResponse.json({ error: `Kelas '${namaKelas}' sudah terdaftar untuk Tahun Ajaran ${TAHUN_AJARAN}.` }, { status: 400 });
    }

    const newClass = await prisma.class.create({
      data: {
        namaKelas: namaKelas.trim(),
        tingkat: t,
        tahunAjaran: TAHUN_AJARAN,
      },
    });

    return NextResponse.json({ ok: true, class: newClass });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// ─── DELETE: HAPUS KELAS ──────────────────────────────────────────────────────
export async function DELETE(req: NextRequest) {
  const session = await auth();
  if (!session?.user || session.user.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");

  if (!id) {
    return NextResponse.json({ error: "ID kelas wajib diisi." }, { status: 400 });
  }

  const classId = Number(id);

  try {
    // Pengamanan: Cek apakah masih ada siswa terdaftar di kelas ini
    const studentCount = await prisma.student.count({
      where: { kelasId: classId },
    });

    if (studentCount > 0) {
      return NextResponse.json({
        error: `Kelas tidak dapat dihapus karena masih memiliki ${studentCount} siswa terdaftar. Pindahkan siswa terlebih dahulu.`,
      }, { status: 400 });
    }

    await prisma.class.delete({
      where: { id: classId },
    });

    return NextResponse.json({ ok: true, message: "Kelas berhasil dihapus." });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// ─── GET: AMBIL SEMUA KELAS ──────────────────────────────────────────────────
export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user || !["admin", "guru"].includes(session.user.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const classes = await prisma.class.findMany({
      where: { tahunAjaran: TAHUN_AJARAN },
      orderBy: { namaKelas: "asc" },
    });
    return NextResponse.json({ ok: true, classes });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
