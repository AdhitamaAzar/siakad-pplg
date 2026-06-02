// =============================================================================
// FILE: app/api/admin/tahun-ajaran/route.ts
// TUJUAN: API Endpoint bagi Admin & Guru untuk mengambil daftar Tahun Ajaran.
//         - GET: Mengambil semua tahun ajaran yang terdaftar di database
//         - POST: Membuat tahun ajaran baru (hanya untuk Admin)
// =============================================================================

import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { auth } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user || !["admin", "guru"].includes(session.user.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const years = await prisma.academicYear.findMany({
      orderBy: { tahunAjaran: "asc" },
    });
    return NextResponse.json({ ok: true, years });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user || session.user.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { tahunAjaran } = body;

    if (!tahunAjaran) {
      return NextResponse.json({ error: "Tahun ajaran wajib diisi." }, { status: 400 });
    }

    const regex = /^\d{4}\/\d{4}$/;
    if (!regex.test(tahunAjaran)) {
      return NextResponse.json({ error: "Format tahun ajaran harus YYYY/YYYY (contoh: 2025/2026)." }, { status: 400 });
    }

    const existing = await prisma.academicYear.findUnique({
      where: { tahunAjaran },
    });

    if (existing) {
      return NextResponse.json({ error: "Tahun ajaran sudah terdaftar." }, { status: 400 });
    }

    const newYear = await prisma.academicYear.create({
      data: { tahunAjaran, isActive: false },
    });

    return NextResponse.json({ ok: true, year: newYear });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
