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

// ── NAME MATCHING & NORMALIZATION ─────────────────────────────────────────────

function normalizeName(name: string): string {
  if (!name) return "";
  let n = name.toLowerCase().trim();
  
  // Normalize common prefixes/abbreviations
  n = n.replace(/\bm\b/g, "muhammad");
  n = n.replace(/\bm\./g, "muhammad");
  n = n.replace(/\bmoch\b/g, "muhammad");
  n = n.replace(/\bmochammad\b/g, "muhammad");
  n = n.replace(/\bmuchammad\b/g, "muhammad");
  
  // Phonetic/Spelling normalizations - order matters!
  n = n.replace(/sy/g, "s");
  n = n.replace(/sh/g, "s");
  n = n.replace(/ch/g, "c");
  n = n.replace(/kh/g, "k");
  n = n.replace(/ph/g, "f");
  n = n.replace(/f/g, "p"); // normalize p/f
  n = n.replace(/v/g, "p"); // normalize v/p
  n = n.replace(/z/g, "s"); // normalize z/s
  n = n.replace(/y/g, "i"); // normalize y/i
  n = n.replace(/o/g, "a"); // normalize o/a
  n = n.replace(/h/g, "");  // remove h
  
  // Remove non-alphanumeric
  n = n.replace(/[^a-z0-9]/g, "");
  
  // Collapse consecutive duplicate characters
  let prev = "";
  let collapsed = "";
  for (let i = 0; i < n.length; i++) {
    const char = n[i];
    if (char !== prev) {
      collapsed += char;
      prev = char;
    }
  }
  return collapsed;
}

function matchNames(dbName: string, excelName: string): boolean {
  const normDb = normalizeName(dbName);
  const normExcel = normalizeName(excelName);
  if (!normDb || !normExcel) return false;

  // 1. Normalized exact match
  if (normDb === normExcel) return true;

  // 2. Manual overrides
  const lowerExcel = excelName.toLowerCase().trim();
  const lowerDb = dbName.toLowerCase().trim();
  
  if (lowerExcel === "farel triaji" || lowerExcel === "fareltriaji") {
    return lowerDb.includes("triaji");
  }
  if (lowerExcel === "barbie") {
    return lowerDb.includes("barby");
  }
  if (lowerExcel === "sifa") {
    return lowerDb.includes("syifa");
  }
  if (lowerExcel === "yuan") {
    return lowerDb.includes("yuwan");
  }
  if (lowerExcel === "trio") {
    return lowerDb.startsWith("trio");
  }
  if (lowerExcel === "bima") {
    return lowerDb.includes("mochamad bima");
  }
  if (lowerExcel === "sely aljananta" || lowerExcel === "selyaljananta") {
    return lowerDb.includes("sely aljannata");
  }

  // 3. Normalized startswith / includes
  if (normDb.includes(normExcel) || normExcel.includes(normDb)) return true;

  // 4. Token matching
  const excelTokens = excelName.toLowerCase().split(/\s+/).filter(t => t.length > 1 && t !== "m" && t !== "m." && t !== "bin" && t !== "binti");
  if (excelTokens.length > 0) {
    let matchedTokens = 0;
    for (const token of excelTokens) {
      if (normDb.includes(normalizeName(token))) {
        matchedTokens++;
      }
    }
    if (matchedTokens === excelTokens.length) return true;
  }

  return false;
}

// ── AUXILIARY PARSERS ─────────────────────────────────────────────────────────

function parseAttendanceSheet(ws: XLSX.WorkSheet) {
  const aoa = XLSX.utils.sheet_to_json<any[]>(ws, { header: 1, defval: "" });
  if (aoa.length < 9) return [];

  let jumlahColIdx = -1;
  const row7 = (aoa[6] || []) as any[];
  const row8 = (aoa[7] || []) as any[];
  
  for (let j = 0; j < row7.length; j++) {
    if (String(row7[j]).toLowerCase().includes("jumlah")) {
      jumlahColIdx = j;
      break;
    }
  }
  if (jumlahColIdx === -1) {
    for (let j = 0; j < row8.length; j++) {
      if (String(row8[j]).toLowerCase().includes("jumlah") || String(row8[j]).toLowerCase().includes("tidak masuk")) {
        jumlahColIdx = j;
        break;
      }
    }
  }
  if (jumlahColIdx === -1) {
    jumlahColIdx = 29;
  }

  const results = [];
  for (let i = 8; i < aoa.length; i++) {
    const row = aoa[i] as any[];
    if (!row || !row[0] || !row[1] || String(row[1]).trim() === "" || String(row[1]).toLowerCase() === "nama") continue;

    const nama = String(row[1]).trim();
    if (nama.includes("#REF!") || nama === "?" || nama.toLowerCase().includes("jumlah") || nama.toLowerCase().includes("siswa")) continue;

    const totalTidakHadir = Number(row[jumlahColIdx]) || 0;
    const totalHadir = Number(row[jumlahColIdx + 1]) || 0;
    const persentaseHadir = Number(row[jumlahColIdx + 2]) || 0;

    results.push({
      nama,
      totalTidakHadir,
      totalHadir,
      persentaseHadir,
    });
  }
  return results;
}

function parseCatatanSheet(ws: XLSX.WorkSheet) {
  const aoa = XLSX.utils.sheet_to_json<any[]>(ws, { header: 1, defval: "" });
  if (aoa.length < 2) return [];

  const results = [];
  const parseRegex = /^\d+\.\s*([^:]+?)\s*:\s*(.*)$/;

  for (let i = 1; i < aoa.length; i++) {
    const row = aoa[i] as any[];
    if (!row || !row[0] || String(row[0]).trim() === "") continue;

    const firstCell = String(row[0]).trim();
    const match = parseRegex.exec(firstCell);
    if (match) {
      const name = match[1].trim();
      const judulProyek = match[2].trim() || "Proyek Mandiri";
      
      const nilaiItem = row[1] !== "" ? Number(row[1]) : null;
      const nilaiData = row[3] !== "" ? Number(row[3]) : null;
      const nilaiAlur = row[4] !== "" ? Number(row[4]) : null;
      const nilaiMetode = row[5] !== "" ? Number(row[5]) : null;
      const nilaiTambah = row[6] !== "" ? Number(row[6]) : null;
      const nilaiUrutan = row[7] !== "" ? Number(row[7]) : null;
      const nilaiTa1 = row[8] !== "" ? Number(row[8]) : null;
      const catatanText = row[11] !== "" ? String(row[11]).trim() : "";

      let className = "";
      if (i >= 1 && i <= 26) className = "XI PPLG 3";
      else if (i >= 28 && i <= 53) className = "XI PPLG 2";
      else if (i >= 56 && i <= 79) className = "XI PPLG 1";

      if (className) {
        results.push({
          nama: name,
          className,
          judulProyek,
          nilaiItem,
          nilaiData,
          nilaiAlur,
          nilaiMetode,
          nilaiTambah,
          nilaiUrutan,
          nilaiTa1,
          catatan: catatanText || "Proyek Mandiri"
        });
      }
    }
  }
  return results;
}

function parseLaporanSheet(ws: XLSX.WorkSheet) {
  const aoa = XLSX.utils.sheet_to_json<any[]>(ws, { header: 1, defval: "" });
  if (aoa.length < 10) return [];

  const results = [];
  for (let i = 9; i < aoa.length; i++) {
    const row = aoa[i] as any[];
    if (!row || !row[0] || !row[1] || String(row[2]).trim() === "" || String(row[2]).toLowerCase() === "nama") continue;

    const nis = String(row[1]).replace(/\s+/g, "").trim();
    const nama = String(row[2]).trim();
    
    if (nama.includes("#REF!") || nama === "?" || nama.toLowerCase().includes("jumlah") || nama.toLowerCase().includes("siswa") || nama.toLowerCase().includes("prosentase") || nama.toLowerCase().includes("tuntas") || /^\d+$/.test(nama)) continue;

    const checklistH = row[7] === 1;
    const checklistI = row[8] === 1;
    const checklistJ = row[9] === 1;
    const checklistK = row[10] === 1;
    const skorLaporan = row[11] !== "" ? Number(row[11]) : null;

    results.push({
      nis,
      nama,
      checklistH,
      checklistI,
      checklistJ,
      checklistK,
      skorLaporan
    });
  }
  return results;
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
      const { sheetName, targetClassId, rows, attendanceRows, catatanRows, laporanRows } = sheet;
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
        // Jika NIS dan Nama kosong, lewati saja
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
            const username = cleanNisStr;
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

            // ─── 1. ATTENDANCE UPSERT ───
            let matchedAttendance = null;
            if (attendanceRows && Array.isArray(attendanceRows)) {
              matchedAttendance = attendanceRows.find((att: any) => matchNames(student.nama, att.nama));
            }
            let persentaseHadir = null;
            if (matchedAttendance) {
              persentaseHadir = matchedAttendance.persentaseHadir;
              await tx.attendance.upsert({
                where: {
                  studentId_semester_tahunAjaran: {
                    studentId: student.id,
                    semester,
                    tahunAjaran,
                  },
                },
                update: {
                  totalHadir: matchedAttendance.totalHadir,
                  totalTidakHadir: matchedAttendance.totalTidakHadir,
                  persentaseHadir: matchedAttendance.persentaseHadir,
                },
                create: {
                  studentId: student.id,
                  semester,
                  tahunAjaran,
                  totalHadir: matchedAttendance.totalHadir,
                  totalTidakHadir: matchedAttendance.totalTidakHadir,
                  persentaseHadir: matchedAttendance.persentaseHadir,
                },
              });
            }

            // ─── 2. NOTES UPSERT ───
            let matchedNote = null;
            if (catatanRows && Array.isArray(catatanRows)) {
              matchedNote = catatanRows.find((cat: any) => matchNames(student.nama, cat.nama));
            }
            let nilaiTa1 = null;
            if (matchedNote) {
              nilaiTa1 = matchedNote.nilaiTa1;
              const teacher = await tx.teacher.findFirst({
                where: { userId: Number(session.user.id) },
              });
              let teacherId = teacher?.id;
              if (!teacherId) {
                const firstTeacher = await tx.teacher.findFirst();
                teacherId = firstTeacher?.id;
              }

              if (teacherId) {
                const scores = [
                  matchedNote.nilaiItem,
                  matchedNote.nilaiData,
                  matchedNote.nilaiAlur,
                  matchedNote.nilaiMetode,
                  matchedNote.nilaiTambah,
                  matchedNote.nilaiUrutan,
                  matchedNote.nilaiTa1,
                ].filter((v) => v !== null && v !== undefined && v !== "");
                
                const sum = scores.reduce((acc, v) => acc + Number(v), 0);
                const nilaiTotal = scores.length > 0 ? Math.round((sum / scores.length) * 10) / 10 : null;

                const existingNote = await tx.note.findFirst({
                  where: { studentId: student.id },
                });

                const noteData = {
                  teacherId,
                  judulProyek: matchedNote.judulProyek || "Proyek Mandiri",
                  catatan: matchedNote.catatan || "Proyek Mandiri",
                  nilaiItem: matchedNote.nilaiItem,
                  nilaiData: matchedNote.nilaiData,
                  nilaiAlur: matchedNote.nilaiAlur,
                  nilaiMetode: matchedNote.nilaiMetode,
                  nilaiTambah: matchedNote.nilaiTambah,
                  nilaiUrutan: matchedNote.nilaiUrutan,
                  nilaiTa1: matchedNote.nilaiTa1,
                  nilaiTotal,
                };

                if (existingNote) {
                  await tx.note.update({
                    where: { id: existingNote.id },
                    data: noteData,
                  });
                } else {
                  await tx.note.create({
                    data: {
                      studentId: student.id,
                      ...noteData,
                    },
                  });
                }
              }
            }

            // ─── 3. REPORT UPSERT ───
            let matchedReport = null;
            if (laporanRows && Array.isArray(laporanRows)) {
              matchedReport = laporanRows.find((rep: any) => matchNames(student.nama, rep.nama));
            }
            if (matchedReport) {
              await tx.report.upsert({
                where: {
                  studentId_semester_tahunAjaran: {
                    studentId: student.id,
                    semester,
                    tahunAjaran,
                  },
                },
                update: {
                  checklistH: matchedReport.checklistH,
                  checklistI: matchedReport.checklistI,
                  checklistJ: matchedReport.checklistJ,
                  checklistK: matchedReport.checklistK,
                  skorLaporan: matchedReport.skorLaporan,
                },
                create: {
                  studentId: student.id,
                  semester,
                  tahunAjaran,
                  checklistH: matchedReport.checklistH,
                  checklistI: matchedReport.checklistI,
                  checklistJ: matchedReport.checklistJ,
                  checklistK: matchedReport.checklistK,
                  skorLaporan: matchedReport.skorLaporan,
                },
              });
            }

            // ─── 4. GRADE CALCULATIONS & UPSERT ───
            const existingGrade = await tx.grade.findFirst({
              where: {
                studentId: student.id,
                semester,
                tahunAjaran,
              },
            });

            const vals = Object.values(row.nilai).map((v) => (v === "" || v === undefined || v === null ? null : Number(v)));
            const rataRata = hitungRataRata(vals);

            // Re-kalkulasi nilaiHasil dan nilaiRaport dengan TA1
            const avgTugas = rataRata ?? 0;
            const ta1 = nilaiTa1 !== null ? Number(nilaiTa1) : (existingGrade?.nilaiTa1 ?? 0);
            const ta2 = existingGrade?.nilaiTa2 ?? 0;

            const listFinal = [avgTugas];
            if (ta1 > 0) listFinal.push(ta1);
            if (ta2 > 0) listFinal.push(ta2);

            const nilaiHasil = listFinal.reduce((a, b) => a + b, 0) / listFinal.length;
            const nilaiRaport = Math.round(nilaiHasil);
            const predikat = hitungPredikat(nilaiRaport);
            const totalKosong = vals.filter((v) => v === null).length;
            const statusTuntas = nilaiRaport >= 75 ? "TUNTAS" : "BELUM";

            const finalPersentaseHadir = persentaseHadir !== null ? persentaseHadir : (existingGrade?.persentaseHadir ?? null);

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
              nilaiTa1: ta1 > 0 ? ta1 : null,
              persentaseHadir: finalPersentaseHadir,
              nilaiHasil,
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

  // Load teacherId or fallback
  let teacherId: number | null = null;
  const teacher = await prisma.teacher.findFirst({
    where: { userId: Number(session.user.id) },
  });
  teacherId = teacher?.id || null;
  if (!teacherId) {
    const firstTeacher = await prisma.teacher.findFirst();
    teacherId = firstTeacher?.id || null;
  }

  for (const [sheetName, namaKelas] of Object.entries(SHEET_KELAS)) {
    const ws = workbook.Sheets[sheetName];
    if (!ws) {
      sheetResults.push({ sheet: sheetName, success: 0, skipped: 0, errors: [`Sheet "${sheetName}" tidak ditemukan dalam file.`] });
      continue;
    }

    // Parse auxiliary sheets in Form data flow too
    const attSheetName = workbook.SheetNames.find(name => {
      const clean = name.toLowerCase().replace(/\s+/g, "");
      return clean === "ab" + sheetName.toLowerCase().replace(/\s+/g, "");
    });
    const wsAtt = attSheetName ? workbook.Sheets[attSheetName] : null;
    const attendanceRows = wsAtt ? parseAttendanceSheet(wsAtt) : [];

    const repSheetName = workbook.SheetNames.find(name => {
      const clean = name.toLowerCase().replace(/\s+/g, "");
      return clean === "l" + sheetName.toLowerCase().replace(/\s+/g, "");
    });
    const wsRep = repSheetName ? workbook.Sheets[repSheetName] : null;
    const laporanRows = wsRep ? parseLaporanSheet(wsRep) : [];

    const catSheetName = workbook.SheetNames.find(name => {
      const clean = name.toLowerCase().replace(/\s+/g, "");
      return clean === "catatan";
    });
    const wsCat = catSheetName ? workbook.Sheets[catSheetName] : null;
    const allCatatanRows = wsCat ? parseCatatanSheet(wsCat) : [];
    const filteredCatatanRows = allCatatanRows.filter(r => 
      r.className.toLowerCase().replace(/\s+/g, "") === namaKelas.toLowerCase().replace(/\s+/g, "")
    );

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
          // Cari atau buat user berdasarkan username = NIS lengkap
          const cleanNisStr = String(row.nis).replace(/\s+/g, "").trim();
          const username = cleanNisStr;
          let user = await tx.user.findUnique({ where: { username } });

          if (!user) {
            if (session.user.role !== "admin") {
              throw new Error(`Pengguna dengan NIS ${row.nis} tidak ditemukan. Silakan hubungi Administrator untuk mendaftarkan akun siswa terlebih dahulu.`);
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
              data: { nama: row.nama, kelasId: kelas.id, userId: user.id },
            });
          } else {
            student = await tx.student.create({
              data: {
                nis:     cleanNisStr,
                nama:    row.nama,
                kelasId: kelas.id,
                userId:  user.id,
              },
            });
          }

          // ─── 1. ATTENDANCE UPSERT ───
          let matchedAttendance = attendanceRows.find((att: any) => matchNames(student.nama, att.nama));
          let persentaseHadir = null;
          if (matchedAttendance) {
            persentaseHadir = matchedAttendance.persentaseHadir;
            await tx.attendance.upsert({
              where: {
                studentId_semester_tahunAjaran: {
                  studentId: student.id,
                  semester,
                  tahunAjaran,
                },
              },
              update: {
                totalHadir: matchedAttendance.totalHadir,
                totalTidakHadir: matchedAttendance.totalTidakHadir,
                persentaseHadir: matchedAttendance.persentaseHadir,
              },
              create: {
                studentId: student.id,
                semester,
                tahunAjaran,
                totalHadir: matchedAttendance.totalHadir,
                totalTidakHadir: matchedAttendance.totalTidakHadir,
                persentaseHadir: matchedAttendance.persentaseHadir,
              },
            });
          }

          // ─── 2. NOTES UPSERT ───
          let matchedNote = filteredCatatanRows.find((cat: any) => matchNames(student.nama, cat.nama));
          let nilaiTa1 = null;
          if (matchedNote && teacherId) {
            nilaiTa1 = matchedNote.nilaiTa1;
            const scores = [
              matchedNote.nilaiItem,
              matchedNote.nilaiData,
              matchedNote.nilaiAlur,
              matchedNote.nilaiMetode,
              matchedNote.nilaiTambah,
              matchedNote.nilaiUrutan,
              matchedNote.nilaiTa1,
            ].filter((v) => v !== null && v !== undefined && String(v) !== "");
            
            const sum = scores.reduce((acc: number, v: any) => acc + Number(v), 0);
            const nilaiTotal = scores.length > 0 ? Math.round((sum / scores.length) * 10) / 10 : null;

            const existingNote = await tx.note.findFirst({
              where: { studentId: student.id },
            });

            const noteData = {
              teacherId,
              judulProyek: matchedNote.judulProyek || "Proyek Mandiri",
              catatan: matchedNote.catatan || "Proyek Mandiri",
              nilaiItem: matchedNote.nilaiItem,
              nilaiData: matchedNote.nilaiData,
              nilaiAlur: matchedNote.nilaiAlur,
              nilaiMetode: matchedNote.nilaiMetode,
              nilaiTambah: matchedNote.nilaiTambah,
              nilaiUrutan: matchedNote.nilaiUrutan,
              nilaiTa1: matchedNote.nilaiTa1,
              nilaiTotal,
            };

            if (existingNote) {
              await tx.note.update({
                where: { id: existingNote.id },
                data: noteData,
              });
            } else {
              await tx.note.create({
                data: {
                  studentId: student.id,
                  ...noteData,
                },
              });
            }
          }

          // ─── 3. REPORT UPSERT ───
          let matchedReport = laporanRows.find((rep: any) => matchNames(student.nama, rep.nama));
          if (matchedReport) {
            await tx.report.upsert({
              where: {
                studentId_semester_tahunAjaran: {
                  studentId: student.id,
                  semester,
                  tahunAjaran,
                },
              },
              update: {
                checklistH: matchedReport.checklistH,
                checklistI: matchedReport.checklistI,
                checklistJ: matchedReport.checklistJ,
                checklistK: matchedReport.checklistK,
                skorLaporan: matchedReport.skorLaporan,
              },
              create: {
                studentId: student.id,
                semester,
                tahunAjaran,
                checklistH: matchedReport.checklistH,
                checklistI: matchedReport.checklistI,
                checklistJ: matchedReport.checklistJ,
                checklistK: matchedReport.checklistK,
                skorLaporan: matchedReport.skorLaporan,
              },
            });
          }

          // ─── 4. GRADE CALCULATIONS & UPSERT ───
          const existingGrade = await tx.grade.findFirst({
            where: {
              studentId: student.id,
              semester,
              tahunAjaran,
            },
          });

          const vals = Object.values(row.nilai);
          const rataRata = hitungRataRata(vals);

          // Re-kalkulasi nilaiHasil dan nilaiRaport dengan TA1
          const avgTugas = rataRata ?? 0;
          const ta1 = nilaiTa1 !== null ? Number(nilaiTa1) : (existingGrade?.nilaiTa1 ?? 0);
          const ta2 = existingGrade?.nilaiTa2 ?? 0;

          const listFinal = [avgTugas];
          if (ta1 > 0) listFinal.push(ta1);
          if (ta2 > 0) listFinal.push(ta2);

          const nilaiHasil = listFinal.reduce((a, b) => a + b, 0) / listFinal.length;
          const nilaiRaport = Math.round(nilaiHasil);
          const predikat = hitungPredikat(nilaiRaport);
          const totalKosong = vals.filter((v) => v === null).length;
          const statusTuntas = nilaiRaport >= 75 ? "TUNTAS" : "BELUM";

          const finalPersentaseHadir = persentaseHadir !== null ? persentaseHadir : (existingGrade?.persentaseHadir ?? null);

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
            nilaiTa1: ta1 > 0 ? ta1 : null,
            persentaseHadir: finalPersentaseHadir,
            nilaiHasil,
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
