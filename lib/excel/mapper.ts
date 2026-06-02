// =============================================================================
// FILE: lib/excel/mapper.ts
// TUJUAN: Mengkonversi data mentah dari parser Excel ke format yang siap
//         disimpan ke database via Prisma. Setiap baris Excel di-map ke
//         struktur data yang sesuai dengan Prisma model.
//
//         Termasuk logika:
//         - Mapping kolom Excel ke field Prisma model
//         - Validasi setiap baris dengan Zod schema
//         - Perhitungan predikat dari nilai raport
//         - Ekstraksi nama siswa dari format catatan guru
//         - Logging baris yang dilewati (skip) dengan alasan
// =============================================================================

import { z } from "zod";
import {
  normalizeNis,
  normalizeStatusTuntas,
  cleanNumericValue,
  cleanTextValue,
  cleanPercentageValue,
  cleanBooleanValue,
  shouldProcessRow,
  gradeRowSchema,
  attendanceRowSchema,
  reportRowSchema,
  type GradeRowData,
  type AttendanceRowData,
  type ReportRowData,
} from "./normalizer";
import type { RawSheetData, ExcelRow, NamaKelas } from "./parser";

// ─── TYPE DEFINITIONS ─────────────────────────────────────────────────────────

/** Satu item data nilai yang siap diimport ke database */
export interface MappedGradeData {
  /** Data untuk tabel Student (identitas) */
  student: {
    nis: string;
    nama: string;
    namaKelas: NamaKelas;
  };
  /** Data untuk tabel Grade (nilai) */
  grade: GradeRowData;
}

/** Satu item data absensi yang siap diimport ke database */
export interface MappedAttendanceData {
  nama: string;
  namaKelas: NamaKelas;
  attendance: AttendanceRowData;
}

/** Satu item data catatan yang siap diimport ke database */
export interface MappedNoteData {
  nama: string;
  namaKelas: NamaKelas;
  judulProyek: string | null;
  catatan: string;
  nilaiItem: number | null;
  nilaiData: number | null;
  nilaiAlur: number | null;
  nilaiMetode: number | null;
  nilaiTambah: number | null;
  nilaiUrutan: number | null;
  nilaiTa1: number | null;
  nilaiTotal: number | null;
}

/** Satu item data laporan yang siap diimport ke database */
export interface MappedReportData {
  student: {
    nis: string | null;
    nama: string;
    namaKelas: NamaKelas;
  };
  report: ReportRowData;
}

/** Hasil mapping satu sheet — berisi data valid dan log error/skip */
export interface MappingResult<T> {
  /** Data yang berhasil di-map dan divalidasi */
  data: T[];
  /** Baris yang berhasil diproses */
  successCount: number;
  /** Baris yang dilewati (kosong, error, tidak valid) */
  skippedCount: number;
  /** Log detail baris yang dilewati */
  skippedRows: Array<{
    rowIndex: number;
    reason: string;
    rawData: ExcelRow;
  }>;
  /** Baris yang gagal validasi Zod */
  errorCount: number;
  /** Log detail error validasi */
  errors: Array<{
    rowIndex: number;
    error: string;
    rawData: ExcelRow;
  }>;
}

// ─── HELPER FUNCTIONS ─────────────────────────────────────────────────────────

/**
 * Menghitung predikat berdasarkan nilai raport
 *
 * @param nilaiRaport - Nilai raport (0-100)
 * @returns String predikat atau null
 *
 * @example
 * ```typescript
 * hitungPredikat(95) // → "Sangat Baik"
 * hitungPredikat(80) // → "Baik"
 * hitungPredikat(65) // → "Cukup"
 * hitungPredikat(50) // → "Perlu Bimbingan"
 * hitungPredikat(null) // → null
 * ```
 */
export function hitungPredikat(nilaiRaport: number | null): string | null {
  if (nilaiRaport === null) return null;
  if (nilaiRaport >= 90) return "Sangat Baik";
  if (nilaiRaport >= 75) return "Baik";
  if (nilaiRaport >= 60) return "Cukup";
  return "Perlu Bimbingan";
}

/**
 * Mengekstrak nama siswa dari teks catatan guru.
 *
 * Format catatan: "1. Barbie: Memprediksi siswa..."
 * atau: "Barbie - Proyek deteksi..."
 * atau: "BARBIE CRISTIANA: analisis data..."
 *
 * @param teks - Teks catatan dari sel Excel
 * @returns Nama siswa yang diekstrak, atau null jika tidak ditemukan
 *
 * @example
 * ```typescript
 * ekstrakNamaDariCatatan("1. Barbie: Memprediksi siswa dropout")
 * // → "Barbie"
 *
 * ekstrakNamaDariCatatan("Adhitama - Membuat model klasifikasi")
 * // → "Adhitama"
 * ```
 */
export function ekstrakNamaDariCatatan(teks: string): string | null {
  if (!teks.trim()) return null;

  // Pattern 1: "1. Nama: deskripsi" atau "1. Nama - deskripsi"
  const withNumberMatch = teks.match(/^\d+\.\s*([^:,\-\n]+?)(?:\s*[:,-])/);
  if (withNumberMatch?.[1]) {
    return withNumberMatch[1].trim();
  }

  // Pattern 2: "Nama: deskripsi" atau "Nama - deskripsi"
  const withSeparatorMatch = teks.match(/^([A-Za-z][A-Za-z\s]{1,49})(?:\s*[:,-])/);
  if (withSeparatorMatch?.[1]) {
    return withSeparatorMatch[1].trim();
  }

  // Pattern 3: Teks dimulai dengan nama saja (ambil 2-3 kata pertama jika huruf besar)
  const allCapsMatch = teks.match(/^([A-Z][A-Z\s]{2,40})\s/);
  if (allCapsMatch?.[1]) {
    return allCapsMatch[1].trim();
  }

  return null;
}

// ─── NILAI MAPPER ─────────────────────────────────────────────────────────────

/**
 * Mapping kolom Excel ke index (0-based)
 * Sesuai dengan struktur sheet nilai:
 * A=0 (NO), B=1 (NIS), C=2 (NAMA), D=3 (Github), ...
 */
const KOLOM_NILAI = {
  NO: 0,           // Kolom A
  NIS: 1,          // Kolom B
  NAMA: 2,         // Kolom C
  GITHUB: 3,       // Kolom D: Portfolio/Github
  API: 4,          // Kolom E: API
  ADMIN_PANEL: 5,  // Kolom F: Adm Panel
  LANDING_PAGE: 6, // Kolom G: Link LandingPage
  KAGGLE_PYTHON: 7,// Kolom H: Kaggle Python
  KAGGLE_SQL: 8,   // Kolom I: Kaggle Intro to SQL
  KAGGLE_ML: 9,    // Kolom J: Kaggle Machine Learning
  UJIAN_ML: 10,    // Kolom K: Ujian Online Machine Learning
  UJIAN_SQL: 11,   // Kolom L: Ujian Online SQL
  JML_KOSONG: 12,  // Kolom M: Jml Nilai Kosong (hitung otomatis)
  PERSEN_MAJU: 13, // Kolom N: Persentase Maju (hitung otomatis)
  KEHADIRAN: 14,   // Kolom O: Kehadiran (persentase %)
  RATA: 15,        // Kolom P: Rata-rata nilai tugas
  TA1_A: 16,       // Kolom Q: Nilai Tugas TA1 (bisa ada atau kosong)
  TA1_B: 17,       // Kolom R: Nilai Tugas TA1 lanjutan
  TA2_A: 18,       // Kolom S: Nilai Tugas TA2
  TA2_B: 19,       // Kolom T: Nilai Tugas TA2 lanjutan
  NILAI_HASIL: 20, // Kolom U: Nilai Hasil
  NILAI_RAPORT: 21,// Kolom V: Nilai Raport
  STATUS: 22,      // Kolom W: Status
} as const;

/**
 * Memetakan data mentah dari sheet nilai ke format GradeRowData.
 *
 * @param sheetData - Data mentah dari parser untuk satu sheet nilai
 * @param namaKelas - Nama kelas yang sedang diproses
 * @returns Hasil mapping dengan data valid dan log skip/error
 */
export function mapNilaiSheet(
  sheetData: RawSheetData,
  namaKelas: NamaKelas
): MappingResult<MappedGradeData> {
  const result: MappingResult<MappedGradeData> = {
    data: [],
    successCount: 0,
    skippedCount: 0,
    skippedRows: [],
    errorCount: 0,
    errors: [],
  };

  for (let i = 0; i < sheetData.rows.length; i++) {
    const row = sheetData.rows[i]!;
    const rowIndex = i + KOLOM_NILAI.NO + 1; // Row number di Excel (untuk logging)

    // ── Cek apakah baris harus diproses ──────────────────────────────────
    const validation = shouldProcessRow(
      row[KOLOM_NILAI.NO],
      row[KOLOM_NILAI.NAMA]
    );

    if (!validation.shouldProcess) {
      result.skippedCount++;
      result.skippedRows.push({
        rowIndex,
        reason: validation.skipReason ?? "Tidak diketahui",
        rawData: row,
      });
      continue;
    }

    // ── Normalisasi NIS ───────────────────────────────────────────────────
    const nisResult = normalizeNis(row[KOLOM_NILAI.NIS]);
    if (!nisResult.isValid) {
      result.skippedCount++;
      result.skippedRows.push({
        rowIndex,
        reason: `NIS tidak valid: ${nisResult.error}`,
        rawData: row,
      });
      continue;
    }

    // ── Ambil nama siswa ──────────────────────────────────────────────────
    const nama = cleanTextValue(row[KOLOM_NILAI.NAMA]);
    if (!nama) {
      result.skippedCount++;
      result.skippedRows.push({
        rowIndex,
        reason: "Nama siswa kosong",
        rawData: row,
      });
      continue;
    }

    // ── Map semua komponen nilai ──────────────────────────────────────────
    const nilaiRaport = cleanNumericValue(row[KOLOM_NILAI.NILAI_RAPORT]);
    const statusTuntas = normalizeStatusTuntas(row[KOLOM_NILAI.STATUS]);

    const gradeData: GradeRowData = {
      nis: nisResult.normalized,
      nama,
      nilaiGithub: cleanNumericValue(row[KOLOM_NILAI.GITHUB]),
      nilaiApi: cleanNumericValue(row[KOLOM_NILAI.API]),
      nilaiAdminPanel: cleanNumericValue(row[KOLOM_NILAI.ADMIN_PANEL]),
      nilaiLandingPage: cleanNumericValue(row[KOLOM_NILAI.LANDING_PAGE]),
      nilaiKagglePython: cleanNumericValue(row[KOLOM_NILAI.KAGGLE_PYTHON]),
      nilaiKaggleSql: cleanNumericValue(row[KOLOM_NILAI.KAGGLE_SQL]),
      nilaiKaggleMl: cleanNumericValue(row[KOLOM_NILAI.KAGGLE_ML]),
      nilaiUjianMl: cleanNumericValue(row[KOLOM_NILAI.UJIAN_ML]),
      nilaiUjianSql: cleanNumericValue(row[KOLOM_NILAI.UJIAN_SQL]),
      persentaseHadir: cleanPercentageValue(row[KOLOM_NILAI.KEHADIRAN]),
      rataRata: cleanNumericValue(row[KOLOM_NILAI.RATA]),
      nilaiTa1: cleanNumericValue(row[KOLOM_NILAI.TA1_A]),
      nilaiTa2: cleanNumericValue(row[KOLOM_NILAI.TA2_A]),
      nilaiHasil: cleanNumericValue(row[KOLOM_NILAI.NILAI_HASIL]),
      nilaiRaport,
      statusTuntas,
    };

    // ── Validasi dengan Zod ───────────────────────────────────────────────
    const parseResult = gradeRowSchema.safeParse(gradeData);
    if (!parseResult.success) {
      result.errorCount++;
      result.errors.push({
        rowIndex,
        error: parseResult.error.issues
          .map((i) => `${i.path.join(".")}: ${i.message}`)
          .join("; "),
        rawData: row,
      });
      continue;
    }

    result.data.push({
      student: {
        nis: nisResult.normalized,
        nama,
        namaKelas,
      },
      grade: parseResult.data,
    });
    result.successCount++;
  }

  return result;
}

// ─── ABSENSI MAPPER ───────────────────────────────────────────────────────────

/**
 * Mapping kolom Excel ke index untuk sheet absensi
 * Struktur: A=NO, B=NAMA, C+ = tanggal pertemuan, terakhir: TidakMasuk, Masuk, Persentase
 */
const KOLOM_ABSENSI = {
  NO: 0,   // Kolom A
  NAMA: 1, // Kolom B
  // Kolom C dst: tanggal pertemuan (nilai 1/0)
  // Kolom dari kanan:
  TIDAK_MASUK_OFFSET: 2, // Kolom kedua dari kanan
  MASUK_OFFSET: 1,       // Kolom kedua dari kanan
  PERSENTASE_OFFSET: 0,  // Kolom terakhir (paling kanan)
} as const;

/**
 * Memetakan data mentah dari sheet absensi ke format AttendanceRowData.
 *
 * Sheet absensi memiliki struktur khusus: kolom terakhir adalah summary
 * (Tidak Masuk, Masuk, Persentase), kolom di tengah adalah per-tanggal.
 *
 * @param sheetData - Data mentah dari parser untuk satu sheet absensi
 * @param namaKelas - Nama kelas yang sedang diproses
 * @returns Hasil mapping dengan data valid dan log skip/error
 */
export function mapAbsensiSheet(
  sheetData: RawSheetData,
  namaKelas: NamaKelas
): MappingResult<MappedAttendanceData> {
  const result: MappingResult<MappedAttendanceData> = {
    data: [],
    successCount: 0,
    skippedCount: 0,
    skippedRows: [],
    errorCount: 0,
    errors: [],
  };

  for (let i = 0; i < sheetData.rows.length; i++) {
    const row = sheetData.rows[i]!;
    const rowIndex = i + 1;

    // Skip baris yang tidak ada nama-nya
    const validation = shouldProcessRow(row[KOLOM_ABSENSI.NO], row[KOLOM_ABSENSI.NAMA]);
    if (!validation.shouldProcess) {
      result.skippedCount++;
      result.skippedRows.push({
        rowIndex,
        reason: validation.skipReason ?? "Baris tidak valid",
        rawData: row,
      });
      continue;
    }

    const nama = cleanTextValue(row[KOLOM_ABSENSI.NAMA]);
    if (!nama) continue;

    // Kolom terakhir, kedua, dan ketiga dari belakang adalah summary
    const lastCol = row.length - 1;
    const persentaseRaw = row[lastCol];
    const masukRaw = row[lastCol - 1];
    const tidakMasukRaw = row[lastCol - 2];

    const persentaseHadir = cleanPercentageValue(persentaseRaw) ?? 0;
    const totalHadir = Math.round(cleanNumericValue(masukRaw, 0, 999) ?? 0);
    const totalTidakHadir = Math.round(cleanNumericValue(tidakMasukRaw, 0, 999) ?? 0);

    const attendanceData: AttendanceRowData = {
      nama,
      totalHadir,
      totalTidakHadir,
      persentaseHadir,
    };

    const parseResult = attendanceRowSchema.safeParse(attendanceData);
    if (!parseResult.success) {
      result.errorCount++;
      result.errors.push({
        rowIndex,
        error: parseResult.error.issues.map((i) => i.message).join("; "),
        rawData: row,
      });
      continue;
    }

    result.data.push({
      nama,
      namaKelas,
      attendance: parseResult.data,
    });
    result.successCount++;
  }

  return result;
}

// ─── CATATAN MAPPER ───────────────────────────────────────────────────────────

/**
 * Mapping kolom sheet catatan ke index
 * Format: bebas, tapi skor ada di kolom tertentu
 */
const KOLOM_CATATAN = {
  TEKS: 0,        // Kolom A: Teks catatan (dengan nama siswa di awal)
  ITEM: 1,        // Kolom B: skor item
  SKOR: 2,        // Kolom C: skor total
  DATA: 3,        // Kolom D: skor data
  ALUR: 4,        // Kolom E: skor alur
  METODE: 5,      // Kolom F: skor metode
  NILAI_TAMBAH: 6,// Kolom G: nilai tambah
  URUTAN: 7,      // Kolom H: skor urutan
  NILAI_TA1: 8,   // Kolom I: nilai TA1
} as const;

/**
 * Memetakan data mentah dari sheet catatan ke format MappedNoteData.
 *
 * @param sheetData - Data mentah dari parser untuk satu sheet catatan
 * @param namaKelas - Nama kelas yang sedang diproses
 * @returns Hasil mapping dengan data catatan valid
 */
export function mapCatatanSheet(
  sheetData: RawSheetData,
  namaKelas: NamaKelas
): MappingResult<MappedNoteData> {
  const result: MappingResult<MappedNoteData> = {
    data: [],
    successCount: 0,
    skippedCount: 0,
    skippedRows: [],
    errorCount: 0,
    errors: [],
  };

  for (let i = 0; i < sheetData.rows.length; i++) {
    const row = sheetData.rows[i]!;
    const rowIndex = i + 1;

    const teksRaw = row[KOLOM_CATATAN.TEKS];
    const teks = cleanTextValue(teksRaw);

    if (!teks) {
      result.skippedCount++;
      result.skippedRows.push({
        rowIndex,
        reason: "Baris catatan kosong",
        rawData: row,
      });
      continue;
    }

    // Ekstrak nama dari teks catatan
    const nama = ekstrakNamaDariCatatan(teks);
    if (!nama) {
      result.skippedCount++;
      result.skippedRows.push({
        rowIndex,
        reason: `Tidak dapat mengekstrak nama dari teks: "${teks.substring(0, 50)}..."`,
        rawData: row,
      });
      continue;
    }

    const noteData: MappedNoteData = {
      nama,
      namaKelas,
      judulProyek: teks.length > 3 ? teks : null,
      catatan: teks,
      nilaiItem: cleanNumericValue(row[KOLOM_CATATAN.ITEM], 0, 999),
      nilaiData: cleanNumericValue(row[KOLOM_CATATAN.DATA], 0, 999),
      nilaiAlur: cleanNumericValue(row[KOLOM_CATATAN.ALUR], 0, 999),
      nilaiMetode: cleanNumericValue(row[KOLOM_CATATAN.METODE], 0, 999),
      nilaiTambah: cleanNumericValue(row[KOLOM_CATATAN.NILAI_TAMBAH], 0, 999),
      nilaiUrutan: cleanNumericValue(row[KOLOM_CATATAN.URUTAN], 0, 999),
      nilaiTa1: cleanNumericValue(row[KOLOM_CATATAN.NILAI_TA1], 0, 100),
      nilaiTotal: cleanNumericValue(row[KOLOM_CATATAN.SKOR], 0, 999),
    };

    result.data.push(noteData);
    result.successCount++;
  }

  return result;
}

// ─── LAPORAN MAPPER ───────────────────────────────────────────────────────────

/**
 * Mapping kolom sheet laporan ke index
 */
const KOLOM_LAPORAN = {
  NO: 0,       // Kolom A
  NIS: 1,      // Kolom B
  NAMA: 2,     // Kolom C
  ASAL_SMP: 3, // Kolom D: Asal SMP / Hobi
  // Kolom E, F, G: tidak digunakan
  CHECK_H: 7,  // Kolom H: Checklist 1
  CHECK_I: 8,  // Kolom I: Checklist 2
  CHECK_J: 9,  // Kolom J: Checklist 3
  CHECK_K: 10, // Kolom K: Checklist 4
  SKOR: 11,    // Kolom L: Total Skor Laporan
} as const;

/**
 * Memetakan data mentah dari sheet laporan ke format MappedReportData.
 *
 * @param sheetData - Data mentah dari parser untuk satu sheet laporan
 * @param namaKelas - Nama kelas yang sedang diproses
 * @returns Hasil mapping dengan data laporan valid
 */
export function mapLaporanSheet(
  sheetData: RawSheetData,
  namaKelas: NamaKelas
): MappingResult<MappedReportData> {
  const result: MappingResult<MappedReportData> = {
    data: [],
    successCount: 0,
    skippedCount: 0,
    skippedRows: [],
    errorCount: 0,
    errors: [],
  };

  for (let i = 0; i < sheetData.rows.length; i++) {
    const row = sheetData.rows[i]!;
    const rowIndex = i + 1;

    const validation = shouldProcessRow(row[KOLOM_LAPORAN.NO], row[KOLOM_LAPORAN.NAMA]);
    if (!validation.shouldProcess) {
      result.skippedCount++;
      result.skippedRows.push({
        rowIndex,
        reason: validation.skipReason ?? "Baris tidak valid",
        rawData: row,
      });
      continue;
    }

    const nama = cleanTextValue(row[KOLOM_LAPORAN.NAMA]);
    if (!nama) continue;

    const nisResult = normalizeNis(row[KOLOM_LAPORAN.NIS]);

    const reportData: ReportRowData = {
      nis: nisResult.isValid ? nisResult.normalized : null,
      nama,
      asalSmp: cleanTextValue(row[KOLOM_LAPORAN.ASAL_SMP]),
      checklistH: cleanBooleanValue(row[KOLOM_LAPORAN.CHECK_H]),
      checklistI: cleanBooleanValue(row[KOLOM_LAPORAN.CHECK_I]),
      checklistJ: cleanBooleanValue(row[KOLOM_LAPORAN.CHECK_J]),
      checklistK: cleanBooleanValue(row[KOLOM_LAPORAN.CHECK_K]),
      skorLaporan: cleanNumericValue(row[KOLOM_LAPORAN.SKOR], 0, 999),
    };

    const parseResult = reportRowSchema.safeParse(reportData);
    if (!parseResult.success) {
      result.errorCount++;
      result.errors.push({
        rowIndex,
        error: parseResult.error.issues.map((i) => i.message).join("; "),
        rawData: row,
      });
      continue;
    }

    result.data.push({
      student: {
        nis: reportData.nis,
        nama,
        namaKelas,
      },
      report: parseResult.data,
    });
    result.successCount++;
  }

  return result;
}

// ─── AGGREGATE MAPPER ─────────────────────────────────────────────────────────

/** Hasil mapping lengkap semua sheet dari satu file Excel */
export interface FullMappingResult {
  nilai: Record<NamaKelas, MappingResult<MappedGradeData>>;
  absensi: Record<NamaKelas, MappingResult<MappedAttendanceData>>;
  catatan: Record<NamaKelas, MappingResult<MappedNoteData>>;
  laporan: Record<NamaKelas, MappingResult<MappedReportData>>;
  /** Total data yang berhasil di-map */
  totalSuccess: number;
  /** Total data yang dilewati */
  totalSkipped: number;
  /** Total data yang error */
  totalError: number;
}

/**
 * Memetakan seluruh data dari ParsedExcelData ke format yang siap diimport.
 * Memproses semua 12 sheet sekaligus dan mengagregasi hasilnya.
 *
 * @param parsedData - Hasil parsing dari parseExcelFile()
 * @returns Hasil mapping lengkap dengan statistik import
 *
 * @example
 * ```typescript
 * const parsed = await parseExcelFile(buffer, "NilaiGenap2526.xlsx");
 * const mapped = mapAllSheets(parsed);
 * console.log(`Berhasil: ${mapped.totalSuccess}, Skip: ${mapped.totalSkipped}`);
 * ```
 */
export function mapAllSheets(parsedData: {
  nilai: Record<NamaKelas, RawSheetData>;
  absensi: Record<NamaKelas, RawSheetData>;
  catatan: Record<NamaKelas, RawSheetData>;
  laporan: Record<NamaKelas, RawSheetData>;
}): FullMappingResult {
  const kelasNames: NamaKelas[] = ["XI PPLG 1", "XI PPLG 2", "XI PPLG 3"];

  const nilaiResults = {} as Record<NamaKelas, MappingResult<MappedGradeData>>;
  const absensiResults = {} as Record<NamaKelas, MappingResult<MappedAttendanceData>>;
  const catatanResults = {} as Record<NamaKelas, MappingResult<MappedNoteData>>;
  const laporanResults = {} as Record<NamaKelas, MappingResult<MappedReportData>>;

  let totalSuccess = 0;
  let totalSkipped = 0;
  let totalError = 0;

  for (const kelas of kelasNames) {
    nilaiResults[kelas] = mapNilaiSheet(parsedData.nilai[kelas], kelas);
    absensiResults[kelas] = mapAbsensiSheet(parsedData.absensi[kelas], kelas);
    catatanResults[kelas] = mapCatatanSheet(parsedData.catatan[kelas], kelas);
    laporanResults[kelas] = mapLaporanSheet(parsedData.laporan[kelas], kelas);

    // Agregasi statistik dari semua sheet kelas ini
    for (const res of [
      nilaiResults[kelas],
      absensiResults[kelas],
      catatanResults[kelas],
      laporanResults[kelas],
    ]) {
      totalSuccess += res.successCount;
      totalSkipped += res.skippedCount;
      totalError += res.errorCount;
    }
  }

  return {
    nilai: nilaiResults,
    absensi: absensiResults,
    catatan: catatanResults,
    laporan: laporanResults,
    totalSuccess,
    totalSkipped,
    totalError,
  };
}
