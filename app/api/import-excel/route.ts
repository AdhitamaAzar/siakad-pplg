// =============================================================================
// FILE: app/api/import-excel/route.ts
// TUJUAN: API endpoint untuk import file Excel ke database.
//         - Membaca 3 sheet nilai (xipplg1, xipplg2, xipplg3)
//         - Parsing NIS yang tidak konsisten
//         - Validasi Zod per baris
//         - Prisma upsert dalam transaction per sheet
//         - Mengembalikan laporan sukses/gagal per sheet
// =============================================================================

import { NextRequest, NextResponse } from "next/server";
import * as XLSX                     from "xlsx";
import { z }                         from "zod";
import prisma                         from "@/lib/prisma";
import { auth }                       from "@/lib/auth";
import bcrypt                         from "bcryptjs";

// ── KONSTANTA ─────────────────────────────────────────────────────────────────

/** Mapping nama sheet → nama kelas di database */
const SHEET_KELAS: Record<string, string> = {
  xipplg1: "XI PPLG 1",
  xipplg2: "XI PPLG 2",
  xipplg3: "XI PPLG 3",
};

// ── ZOD SCHEMA ────────────────────────────────────────────────────────────────


/** Nilai angka opsional 0–100 */
const NilaiOptional = z
  .union([z.number(), z.string().transform((v) => (v === "" ? null : Number(v))), z.null()])
  .nullable()
  .refine((v) => v === null || (v >= 0 && v <= 100), "Nilai harus 0–100")
  .optional()
  .nullable()
  .transform((v) => v ?? null);

const RowSchema = z.object({
  no:    z.union([z.number(), z.string()]).optional(),
  nis:   z.string().min(1, "NIS kosong"),
  nama:  z.string().min(1, "Nama kosong"),
  nilai: z.object({
    github:       NilaiOptional,
    api:          NilaiOptional,
    adminPanel:   NilaiOptional,
    landingPage:  NilaiOptional,
    kagglePython: NilaiOptional,
    kaggleSql:    NilaiOptional,
    kaggleMl:     NilaiOptional,
    ujianMl:      NilaiOptional,
    ujianSql:     NilaiOptional,
  }),
});

type ParsedRow = z.infer<typeof RowSchema>;

// ── UTILS ─────────────────────────────────────────────────────────────────────

/** Bersihkan NIS dari spasi/karakter tidak konsisten */
function cleanNis(raw: unknown): string {
  if (raw === null || raw === undefined) return "";
  return String(raw).replace(/\s+/g, "").trim();
}

/** Ambil nilai numerik dari cell Excel */
function numOrNull(v: unknown): number | null {
  if (v === null || v === undefined || v === "") return null;
  const n = Number(v);
  return isNaN(n) ? null : n;
}

/** Hitung rata-rata dari nilai yang tidak null */
function hitungRataRata(vals: (number | null)[]): number | null {
  const valid = vals.filter((v): v is number => v !== null);
  if (valid.length === 0) return null;
  return Math.round((valid.reduce((a, b) => a + b, 0) / valid.length) * 10) / 10;
}

/** Hitung nilai raport dari rata-rata (skema pembulatan) */
function hitungNilaiRaport(avg: number | null): number | null {
  if (avg === null) return null;
  return Math.round(avg);
}

/** Tentukan predikat dari nilai raport */
function hitungPredikat(nilai: number | null): string | null {
  if (nilai === null) return null;
  if (nilai >= 90) return "Sangat Baik";
  if (nilai >= 75) return "Baik";
  if (nilai >= 60) return "Cukup";
  return "Perlu Bimbingan";
}

// ── PARSE SHEET ───────────────────────────────────────────────────────────────

/**
 * Parse satu sheet Excel menjadi array baris yang sudah divalidasi.
 * Header mulai di baris 5 (index 4 dalam sheet).
 */
function parseSheet(ws: XLSX.WorkSheet): { rows: ParsedRow[]; errors: string[] } {
  const rows:   ParsedRow[] = [];
  const errors: string[]    = [];

  // Konversi ke array-of-arrays mulai row 5 (header_offset=4)
  const aoa = XLSX.utils.sheet_to_json<unknown[]>(ws, { header: 1, defval: null });

  // Mulai dari baris ke-6 (index 5) — baris 5 adalah header
  for (let i = 5; i < aoa.length; i++) {
    const row = aoa[i] as unknown[];
    if (!row || !row[0]) continue; // skip baris kosong (no urut kosong)

    const raw = {
      no:   row[0],
      nis:  cleanNis(row[1]),
      nama: String(row[2] ?? "").trim(),
      nilai: {
        github:       numOrNull(row[3]),
        api:          numOrNull(row[4]),
        adminPanel:   numOrNull(row[5]),
        landingPage:  numOrNull(row[6]),
        kagglePython: numOrNull(row[7]),
        kaggleSql:    numOrNull(row[8]),
        kaggleMl:     numOrNull(row[9]),
        ujianMl:      numOrNull(row[10]),
        ujianSql:     numOrNull(row[11]),
      },
    };

    const parsed = RowSchema.safeParse(raw);
    if (!parsed.success) {
      errors.push(`Baris ${i + 1} (${raw.nama || "?"}): ${parsed.error.issues.map((e) => e.message).join(", ")}`);
      continue;
    }
    rows.push(parsed.data);
  }

  return { rows, errors };
}

// ── HANDLER ───────────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  // Auth check — hanya guru dan admin
  const session = await auth();
  if (!session?.user || !["guru", "admin"].includes(session.user.role)) {
    return NextResponse.json({ ok: false, message: "Unauthorized" }, { status: 401 });
  }

  // Parse multipart form
  let file: File;
  let semester: string;
  let tahunAjaran: string;

  try {
    const form = await req.formData();
    const f    = form.get("file");
    if (!f || typeof f === "string") {
      return NextResponse.json({ ok: false, message: "File tidak ditemukan." }, { status: 400 });
    }
    file = f as File;
    semester = (form.get("semester") as string) || "Genap";
    tahunAjaran = (form.get("tahunAjaran") as string) || "2025/2026";
  } catch {
    return NextResponse.json({ ok: false, message: "Gagal membaca form data." }, { status: 400 });
  }

  // Baca Excel
  const buffer   = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, { type: "buffer" });

  // Proses setiap sheet nilai
  const sheetResults = [];

  for (const [sheetName, namaKelas] of Object.entries(SHEET_KELAS)) {
    const ws = workbook.Sheets[sheetName];
    if (!ws) {
      sheetResults.push({ sheet: sheetName, success: 0, skipped: 0, errors: [`Sheet "${sheetName}" tidak ditemukan dalam file.`] });
      continue;
    }

    const { rows, errors: parseErrors } = parseSheet(ws);

    const match = namaKelas.match(/^(X|XI|XII)\b/i);
    let tingkat = 11;
    if (match) {
      if (match[1].toUpperCase() === "X") tingkat = 10;
      else if (match[1].toUpperCase() === "XI") tingkat = 11;
      else if (match[1].toUpperCase() === "XII") tingkat = 12;
    }

    // Pastikan kelas ada di database
    const kelas = await prisma.class.upsert({
      where:  { namaKelas_tahunAjaran: { namaKelas, tahunAjaran } },
      update: {},
      create: { namaKelas, tahunAjaran, tingkat },
    });

    let success = 0;
    let skipped = parseErrors.length;
    const rowErrors: string[] = [...parseErrors];

    // Proses setiap baris dalam transaction
    for (const row of rows) {
      try {
        await prisma.$transaction(async (tx) => {
          // Cari atau buat user berdasarkan username = NIS prefix (misal 14006 dari 14006/1667.063)
          const username = row.nis.split("/")[0]!;
          let user = await tx.user.findUnique({ where: { username } });

          if (!user) {
            // Pengamanan: Hanya Admin yang boleh memicu auto-provisioning (membuat akun pengguna baru)
            if (session.user.role !== "admin") {
              throw new Error(`Pengguna dengan NIS ${row.nis} tidak ditemukan. Silakan hubungi Administrator untuk mendaftarkan akun siswa terlebih dahulu.`);
            }

            // Dapatkan roleId untuk "siswa"
            const roleSiswa = await tx.role.findUnique({ where: { name: "siswa" } });
            if (!roleSiswa) {
              throw new Error("Role 'siswa' tidak ditemukan di database.");
            }

            // Gunakan username (NIS prefix) sebagai default password (seperti di seeder)
            const hashedPassword = await bcrypt.hash(username, 12);

            user = await tx.user.create({
              data: {
                username,
                password: hashedPassword,
                roleId: roleSiswa.id,
              },
            });
          }

          // Upsert student
          const student = await tx.student.upsert({
            where:  { nis: row.nis },
            update: { nama: row.nama, kelasId: kelas.id, userId: user.id },
            create: {
              nis:     row.nis,
              nama:    row.nama,
              kelasId: kelas.id,
              userId:  user.id,
            },
          });

          // Hitung derived values
          const vals       = Object.values(row.nilai);
          const rataRata   = hitungRataRata(vals);
          const nilaiRaport = hitungNilaiRaport(rataRata);
          const predikat   = hitungPredikat(nilaiRaport);
          const totalKosong = vals.filter((v) => v === null).length;
          const statusTuntas = nilaiRaport !== null && nilaiRaport >= 75 ? "TUNTAS" : nilaiRaport !== null ? "TIDAK TUNTAS" : null;

          // Upsert grade
          await tx.grade.upsert({
            where: {
              studentId_semester_tahunAjaran: {
                studentId:   student.id,
                semester,
                tahunAjaran,
              },
            },
            update: {
              nilaiGithub:        row.nilai.github,
              nilaiApi:           row.nilai.api,
              nilaiAdminPanel:    row.nilai.adminPanel,
              nilaiLandingPage:   row.nilai.landingPage,
              nilaiKagglePython:  row.nilai.kagglePython,
              nilaiKaggleSql:     row.nilai.kaggleSql,
              nilaiKaggleMl:      row.nilai.kaggleMl,
              nilaiUjianMl:       row.nilai.ujianMl,
              nilaiUjianSql:      row.nilai.ujianSql,
              rataRata,
              nilaiRaport,
              predikat,
              jumlahNilaiKosong: totalKosong,
              statusTuntas,
            },
            create: {
              studentId:          student.id,
              semester,
              tahunAjaran,
              nilaiGithub:        row.nilai.github,
              nilaiApi:           row.nilai.api,
              nilaiAdminPanel:    row.nilai.adminPanel,
              nilaiLandingPage:   row.nilai.landingPage,
              nilaiKagglePython:  row.nilai.kagglePython,
              nilaiKaggleSql:     row.nilai.kaggleSql,
              nilaiKaggleMl:      row.nilai.kaggleMl,
              nilaiUjianMl:       row.nilai.ujianMl,
              nilaiUjianSql:      row.nilai.ujianSql,
              rataRata,
              nilaiRaport,
              predikat,
              jumlahNilaiKosong:  totalKosong,
              statusTuntas,
            },
          });
        });

        success++;
      } catch (err) {
        rowErrors.push(`Siswa ${row.nama} (${row.nis}): ${err instanceof Error ? err.message : "Unknown error"}`);
        skipped++;
      }
    }

    sheetResults.push({ sheet: sheetName, success, skipped, errors: rowErrors });
  }

  const totalSuccess = sheetResults.reduce((s, r) => s + r.success, 0);
  const totalError   = sheetResults.reduce((s, r) => s + r.errors.length, 0);
  const totalSkipped = sheetResults.reduce((s, r) => s + r.skipped, 0);
  const ok = totalError === 0 || totalSuccess > 0;

  // Catat log audit ke database
  try {
    await prisma.importLog.create({
      data: {
        namaFile: file.name,
        status: totalError === 0 ? "SUCCESS" : totalSuccess > 0 ? "PARTIAL" : "FAILED",
        totalBerhasil: totalSuccess,
        totalDiskip: totalSkipped,
        totalGagal: totalError,
        errorDetails: totalError > 0 ? JSON.stringify(sheetResults.flatMap((r) => r.errors)) : null,
        importedById: Number(session.user.id),
      },
    });
  } catch (logErr) {
    console.error("Gagal mencatat log import:", logErr);
  }

  return NextResponse.json({
    ok,
    message: `Import selesai: ${totalSuccess} siswa berhasil diproses${totalError > 0 ? `, ${totalError} error` : ""}.`,
    sheets:  sheetResults,
  });
}
