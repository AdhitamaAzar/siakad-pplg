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

  // ── JSON PAYLOAD HANDLER (Client-side parsed & validated) ──────────────────
  if (req.headers.get("content-type")?.includes("application/json")) {
    let body;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ ok: false, message: "Gagal membaca data JSON." }, { status: 400 });
    }

    const { semester, tahunAjaran, subjectId, sheets } = body;
    if (!semester || !tahunAjaran || !sheets || !Array.isArray(sheets)) {
      return NextResponse.json({ ok: false, message: "Parameter tidak lengkap." }, { status: 400 });
    }

    const sheetResults = [];

    // Tentukan mapel target
    let targetSubjectId = Number(subjectId);
    if (isNaN(targetSubjectId)) {
      const defaultSubject = await prisma.subject.upsert({
        where:  { kodeMapel: "PPLG-IMPORT" },
        update: {},
        create: {
          namaMapel: "Rekayasa Perangkat Lunak",
          kodeMapel: "PPLG-IMPORT",
          tingkat:   11,
        },
      });
      targetSubjectId = defaultSubject.id;
    }

    for (const sheet of sheets) {
      const { sheetName, targetClassId, rows } = sheet;
      const classId = Number(targetClassId);

      if (isNaN(classId) || !rows || !Array.isArray(rows)) {
        sheetResults.push({
          sheet: sheetName || "Unknown",
          success: 0,
          skipped: rows?.length || 0,
          errors: ["Target kelas tidak valid atau data kosong."],
        });
        continue;
      }

      let success = 0;
      let skipped = 0;
      const rowErrors: string[] = [];

      for (const row of rows) {
        // Jika NIS dan Nama kosong, lewati saja (biarkan)
        if (!row.nis && !row.nama) {
          continue;
        }
        // Jika salah satu kosong, lewati juga agar tidak merusak database
        if (!row.nis || !row.nama) {
          continue;
        }

        try {
          await prisma.$transaction(async (tx) => {
            const cleanNisStr = String(row.nis).replace(/\s+/g, "").trim();
            const username = cleanNisStr.split("/")[0]!;
            let user = await tx.user.findUnique({ where: { username } });

            if (!user) {
              if (session.user.role !== "admin") {
                throw new Error(`Siswa dengan NIS ${cleanNisStr} belum terdaftar. Silakan hubungi Admin.`);
              }

              const roleSiswa = await tx.role.findUnique({ where: { name: "siswa" } });
              if (!roleSiswa) {
                throw new Error("Role 'siswa' tidak ditemukan di database.");
              }

              const hashedPassword = await bcrypt.hash(username, 12);
              user = await tx.user.create({
                data: {
                  username,
                  password: hashedPassword,
                  roleId: roleSiswa.id,
                },
              });
            }

            // Manual Upsert Student
            let student = await tx.student.findUnique({
              where: { nis: cleanNisStr },
            });

            if (student) {
              student = await tx.student.update({
                where: { id: student.id },
                data: { nama: row.nama, kelasId: classId, userId: user.id },
              });
            } else {
              student = await tx.student.create({
                data: {
                  nis:     cleanNisStr,
                  nama:    row.nama,
                  kelasId: classId,
                  userId:  user.id,
                },
              });
            }

            // Hitung derived values (pastikan nilai null/kosong tidak berubah menjadi 0)
            const vals = Object.values(row.nilai).map((v) => (v === "" || v === undefined || v === null ? null : Number(v)));
            const rataRata = hitungRataRata(vals);
            const nilaiRaport = hitungNilaiRaport(rataRata);
            const predikat = hitungPredikat(nilaiRaport);
            const totalKosong = vals.filter((v) => v === null).length;
            const statusTuntas = nilaiRaport !== null && nilaiRaport >= 75 ? "TUNTAS" : nilaiRaport !== null ? "TIDAK TUNTAS" : null;

            // Manual Upsert Grade
            const existingGrade = await tx.grade.findFirst({
              where: {
                studentId: student.id,
                semester,
                tahunAjaran,
              },
            });

            const gradeData = {
              nilaiGithub:        row.nilai.github !== undefined ? numOrNull(row.nilai.github) : undefined,
              nilaiApi:           row.nilai.api !== undefined ? numOrNull(row.nilai.api) : undefined,
              nilaiAdminPanel:    row.nilai.adminPanel !== undefined ? numOrNull(row.nilai.adminPanel) : undefined,
              nilaiLandingPage:   row.nilai.landingPage !== undefined ? numOrNull(row.nilai.landingPage) : undefined,
              nilaiKagglePython:  row.nilai.kagglePython !== undefined ? numOrNull(row.nilai.kagglePython) : undefined,
              nilaiKaggleSql:     row.nilai.kaggleSql !== undefined ? numOrNull(row.nilai.kaggleSql) : undefined,
              nilaiKaggleMl:      row.nilai.kaggleMl !== undefined ? numOrNull(row.nilai.kaggleMl) : undefined,
              nilaiUjianMl:       row.nilai.ujianMl !== undefined ? numOrNull(row.nilai.ujianMl) : undefined,
              nilaiUjianSql:      row.nilai.ujianSql !== undefined ? numOrNull(row.nilai.ujianSql) : undefined,
              rataRata,
              nilaiRaport,
              predikat,
              jumlahNilaiKosong:  totalKosong,
              statusTuntas,
            };

            if (existingGrade) {
              await tx.grade.update({
                where: { id: existingGrade.id },
                data: gradeData,
              });
            } else {
              await tx.grade.create({
                data: {
                  studentId:          student.id,
                  subjectId:          targetSubjectId,
                  semester,
                  tahunAjaran,
                  ...gradeData,
                },
              });
            }
          });

          success++;
        } catch (err: any) {
          rowErrors.push(`Siswa ${row.nama} (${row.nis}): ${err.message}`);
          skipped++;
        }
      }

      sheetResults.push({ sheet: sheetName, success, skipped, errors: rowErrors });
    }

    const totalSuccess = sheetResults.reduce((s, r) => s + r.success, 0);
    const totalError   = sheetResults.reduce((s, r) => s + r.errors.length, 0);
    const totalSkipped = sheetResults.reduce((s, r) => s + r.skipped, 0);
    const ok = totalError === 0 || totalSuccess > 0;

    try {
      await prisma.importLog.create({
        data: {
          namaFile: `JSON_IMPORT_${new Date().toISOString().slice(0, 10)}.json`,
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

  // ── FORMDATA FALLBACK HANDLER (Original flow) ──────────────────────────────
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

  // Pastikan subject default untuk import Excel ada di database
  const defaultSubject = await prisma.subject.upsert({
    where:  { kodeMapel: "PPLG-IMPORT" },
    update: {},
    create: {
      namaMapel: "Rekayasa Perangkat Lunak",
      kodeMapel: "PPLG-IMPORT",
      tingkat:   11,
    },
  });

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

          // Manual Upsert Student
          let student = await tx.student.findUnique({
            where: { nis: row.nis },
          });

          if (student) {
            student = await tx.student.update({
              where: { id: student.id },
              data: { nama: row.nama, kelasId: kelas.id, userId: user.id },
            });
          } else {
            student = await tx.student.create({
              data: {
                nis:     row.nis,
                nama:    row.nama,
                kelasId: kelas.id,
                userId:  user.id,
              },
            });
          }

          // Hitung derived values
          const vals       = Object.values(row.nilai);
          const rataRata   = hitungRataRata(vals);
          const nilaiRaport = hitungNilaiRaport(rataRata);
          const predikat   = hitungPredikat(nilaiRaport);
          const totalKosong = vals.filter((v) => v === null).length;
          const statusTuntas = nilaiRaport !== null && nilaiRaport >= 75 ? "TUNTAS" : nilaiRaport !== null ? "TIDAK TUNTAS" : null;

          // Manual Upsert Grade
          const existingGrade = await tx.grade.findFirst({
            where: {
              studentId: student.id,
              semester,
              tahunAjaran,
            },
          });

          const gradeData = {
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
          };

          if (existingGrade) {
            await tx.grade.update({
              where: { id: existingGrade.id },
              data: gradeData,
            });
          } else {
            await tx.grade.create({
              data: {
                studentId:          student.id,
                subjectId:          defaultSubject.id,
                semester,
                tahunAjaran,
                ...gradeData,
              },
            });
          }
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
