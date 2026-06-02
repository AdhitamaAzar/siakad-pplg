// =============================================================================
// FILE: app/api/admin/mapel/route.ts
// TUJUAN: API Endpoint bagi Admin untuk mengelola data Mata Pelajaran (Subject CRUD).
//         - GET: Mengambil semua mata pelajaran
//         - POST: Membuat mata pelajaran baru
//         - PUT: Mengubah mata pelajaran
//         - DELETE: Menghapus mata pelajaran
// =============================================================================

import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { auth } from "@/lib/auth";

// ─── GET: AMBIL SEMUA MAPEL ───────────────────────────────────────────────────
export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user || !["admin", "guru"].includes(session.user.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const subjects = await prisma.subject.findMany({
      orderBy: { namaMapel: "asc" },
    });
    return NextResponse.json({ ok: true, subjects });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// ─── POST: BUAT MAPEL BARU ────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user || session.user.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { namaMapel, kodeMapel, tingkat } = body;

    if (!namaMapel || !kodeMapel || !tingkat) {
      return NextResponse.json({ error: "Semua kolom wajib diisi." }, { status: 400 });
    }

    const t = Number(tingkat);
    if (isNaN(t) || t < 10 || t > 12) {
      return NextResponse.json({ error: "Tingkat kelas harus berupa angka antara 10 - 12." }, { status: 400 });
    }

    // Cek duplikasi kode mapel
    const existing = await prisma.subject.findUnique({
      where: { kodeMapel: kodeMapel.trim().toUpperCase() },
    });

    if (existing) {
      return NextResponse.json({ error: `Kode Mapel '${kodeMapel}' sudah terdaftar.` }, { status: 400 });
    }

    const subject = await prisma.subject.create({
      data: {
        namaMapel: namaMapel.trim(),
        kodeMapel: kodeMapel.trim().toUpperCase(),
        tingkat: t,
      },
    });

    return NextResponse.json({ ok: true, subject });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// ─── PUT: EDIT MAPEL ─────────────────────────────────────────────────────────
export async function PUT(req: NextRequest) {
  const session = await auth();
  if (!session?.user || session.user.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { id, namaMapel, kodeMapel, tingkat } = body;

    if (!id || !namaMapel || !kodeMapel || !tingkat) {
      return NextResponse.json({ error: "Semua kolom wajib diisi." }, { status: 400 });
    }

    const t = Number(tingkat);
    if (isNaN(t) || t < 10 || t > 12) {
      return NextResponse.json({ error: "Tingkat kelas harus berupa angka antara 10 - 12." }, { status: 400 });
    }

    // Cek duplikasi kode mapel (selain mapel yang diedit)
    const existing = await prisma.subject.findFirst({
      where: {
        kodeMapel: kodeMapel.trim().toUpperCase(),
        NOT: { id: Number(id) },
      },
    });

    if (existing) {
      return NextResponse.json({ error: `Kode Mapel '${kodeMapel}' sudah digunakan oleh mapel lain.` }, { status: 400 });
    }

    const subject = await prisma.subject.update({
      where: { id: Number(id) },
      data: {
        namaMapel: namaMapel.trim(),
        kodeMapel: kodeMapel.trim().toUpperCase(),
        tingkat: t,
      },
    });

    return NextResponse.json({ ok: true, subject });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// ─── DELETE: HAPUS MAPEL ──────────────────────────────────────────────────────
export async function DELETE(req: NextRequest) {
  const session = await auth();
  if (!session?.user || session.user.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");

  if (!id) {
    return NextResponse.json({ error: "ID mapel wajib diisi." }, { status: 400 });
  }

  const subjectId = Number(id);

  try {
    await prisma.subject.delete({
      where: { id: subjectId },
    });

    return NextResponse.json({ ok: true, message: "Mata pelajaran berhasil dihapus." });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
