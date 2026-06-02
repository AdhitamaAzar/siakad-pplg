// =============================================================================
// FILE: app/api/guru/nilai/route.ts
// TUJUAN: API Endpoint untuk guru input/edit nilai siswa secara manual.
//         - GET : Ambil nilai siswa (by studentId)
//         - POST: Upsert 9 komponen nilai + auto-hitung rata-rata & nilai raport
// =============================================================================

import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { auth } from "@/lib/auth";

const SEMESTER    = "Genap";
const TAHUN_AJARAN = "2025/2026";

const KOMPONEN_KEYS = [
  "nilaiGithub",
  "nilaiApi",
  "nilaiAdminPanel",
  "nilaiLandingPage",
  "nilaiKagglePython",
  "nilaiKaggleSql",
  "nilaiKaggleMl",
  "nilaiUjianMl",
  "nilaiUjianSql",
] as const;

type KomponenKey = typeof KOMPONEN_KEYS[number];

/** Hitung rata-rata hanya dari komponen yang diisi (non-null, > 0) */
function hitungRataRata(data: Partial<Record<KomponenKey, number | null>>): number | null {
  const vals = KOMPONEN_KEYS
    .map((k) => data[k])
    .filter((v): v is number => v !== null && v !== undefined && v > 0);
  if (vals.length === 0) return null;
  return Math.round((vals.reduce((a, b) => a + b, 0) / vals.length) * 10) / 10;
}

/** Tentukan predikat dari nilai raport */
function predikatDari(nilai: number): string {
  if (nilai >= 90) return "Sangat Baik";
  if (nilai >= 75) return "Baik";
  if (nilai >= 60) return "Cukup";
  return "Perlu Bimbingan";
}

// ─── GET: ambil nilai 1 siswa ──────────────────────────────────────────────────
export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const studentId = req.nextUrl.searchParams.get("studentId");
  if (!studentId) {
    return NextResponse.json({ error: "studentId wajib diisi." }, { status: 400 });
  }

  try {
    const grade = await prisma.grade.findFirst({
      where: { studentId: Number(studentId), semester: SEMESTER, tahunAjaran: TAHUN_AJARAN },
    });
    return NextResponse.json({ ok: true, grade });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// ─── POST: upsert nilai siswa ──────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user || !["guru", "admin"].includes(session.user.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const studentId = Number(body.studentId);

    if (!studentId) {
      return NextResponse.json({ error: "studentId wajib diisi." }, { status: 400 });
    }

    // Pastikan siswa ada
    const student = await prisma.student.findUnique({ where: { id: studentId } });
    if (!student) {
      return NextResponse.json({ error: "Siswa tidak ditemukan." }, { status: 404 });
    }

    // Ambil nilai komponen dari body (null jika kosong)
    const kompoData: Partial<Record<KomponenKey, number | null>> = {};
    for (const key of KOMPONEN_KEYS) {
      const raw = body[key];
      kompoData[key] = raw !== "" && raw !== null && raw !== undefined ? Number(raw) : null;
    }

    // Auto-kalkulasi
    const rataRata    = hitungRataRata(kompoData);
    const nilaiHasil  = rataRata;
    const nilaiRaport = nilaiHasil !== null ? Math.round(nilaiHasil) : null;
    const predikat    = nilaiRaport !== null ? predikatDari(nilaiRaport) : null;
    const statusTuntas = nilaiRaport !== null ? (nilaiRaport >= 75 ? "TUNTAS" : "BELUM") : null;

    const jumlahNilaiKosong = KOMPONEN_KEYS.filter((k) => !kompoData[k]).length;
    const persentaseMaju    = Math.round(((9 - jumlahNilaiKosong) / 9) * 100);

    // Upsert ke DB
    const grade = await prisma.grade.upsert({
      where: {
        studentId_semester_tahunAjaran: {
          studentId,
          semester: SEMESTER,
          tahunAjaran: TAHUN_AJARAN,
        },
      },
      update: {
        ...kompoData,
        rataRata,
        nilaiHasil,
        nilaiRaport,
        predikat,
        statusTuntas,
        jumlahNilaiKosong,
        persentaseMaju,
      },
      create: {
        studentId,
        semester: SEMESTER,
        tahunAjaran: TAHUN_AJARAN,
        ...kompoData,
        rataRata,
        nilaiHasil,
        nilaiRaport,
        predikat,
        statusTuntas,
        jumlahNilaiKosong,
        persentaseMaju,
      },
    });

    return NextResponse.json({ ok: true, grade });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
