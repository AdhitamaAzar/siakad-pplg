// =============================================================================
// FILE: lib/excel/normalizer.ts
// TUJUAN: Fungsi-fungsi pembersih dan normalisasi data kotor dari file Excel.
//         Menangani masalah data yang umum ditemukan dalam file Excel guru:
//         - NIS dengan spasi berlebih dan format tidak konsisten
//         - Nilai "?" yang berarti data tidak tersedia
//         - Error Excel seperti #REF! dan #DIV/0!
//         - Baris kosong yang harus dilewati
//         - Teks bebas yang perlu diekstrak
// =============================================================================

import { z } from "zod";

// ─── KONSTANTA ────────────────────────────────────────────────────────────────

/**
 * Daftar string yang merepresentasikan error Excel dan harus dikonversi ke null
 */
const EXCEL_ERROR_STRINGS = [
  "#REF!",
  "#DIV/0!",
  "#VALUE!",
  "#N/A",
  "#NAME?",
  "#NULL!",
  "#NUM!",
] as const;

/**
 * Karakter yang menandakan nilai tidak diisi oleh siswa
 * Nilai "?" → simpan sebagai NULL di database
 */
const EMPTY_VALUE_MARKERS = ["?", "-", "N/A", "n/a", ""] as const;

// ─── TYPE DEFINITIONS ─────────────────────────────────────────────────────────

/** Tipe untuk nilai sel Excel yang bisa berupa berbagai tipe */
type RawCellValue = string | number | boolean | null | undefined;

/** Hasil normalisasi NIS */
interface NisNormalizationResult {
  /** NIS yang sudah dinormalisasi */
  normalized: string;
  /** NIS asli sebelum normalisasi */
  original: string;
  /** Apakah NIS berhasil divalidasi */
  isValid: boolean;
  /** Pesan error jika validasi gagal */
  error?: string;
}

/** Hasil validasi satu baris data Excel */
interface RowValidationResult {
  /** Apakah baris boleh diproses */
  shouldProcess: boolean;
  /** Alasan skip jika tidak diproses */
  skipReason?: string;
}

// ─── NIS NORMALIZATION ────────────────────────────────────────────────────────

/**
 * Menormalisasi format NIS (Nomor Induk Siswa) dari Excel.
 *
 * Data NIS di Excel memiliki format yang tidak konsisten, contoh:
 * - "14006/1667.063" (sudah benar)
 * - "14003 /1664 .063" (ada spasi berlebih)
 * - " 14006/ 1667 .063 " (spasi di awal, tengah, dan akhir)
 *
 * Fungsi ini menghapus semua spasi berlebih dan mengembalikan format bersih.
 *
 * @param rawNis - NIS mentah dari sel Excel (bisa berupa string atau number)
 * @returns Objek dengan NIS ternormalisasi dan status validasi
 *
 * @example
 * ```typescript
 * normalizeNis("14003 /1664 .063")
 * // → { normalized: "14003/1664.063", original: "14003 /1664 .063", isValid: true }
 *
 * normalizeNis("")
 * // → { normalized: "", original: "", isValid: false, error: "NIS kosong" }
 * ```
 */
export function normalizeNis(rawNis: RawCellValue): NisNormalizationResult {
  const original = String(rawNis ?? "").trim();

  // Cek apakah NIS kosong
  if (!original || original === "undefined" || original === "null") {
    return {
      normalized: "",
      original,
      isValid: false,
      error: "NIS kosong",
    };
  }

  // Hapus SEMUA whitespace (spasi, tab, newline) dari dalam string
  // Regex \s+ menggantikan satu atau lebih whitespace dengan string kosong
  const normalized = original.replace(/\s+/g, "");

  // Validasi format NIS: angka/angka.angka (contoh: 14006/1667.063)
  // Format yang valid:
  // - Hanya angka: "14006"
  // - Angka dengan slash: "14006/1667"
  // - Angka dengan slash dan titik: "14006/1667.063"
  const nisPattern = /^\d+(?:\/\d+(?:\.\d+)?)?$/;

  if (!nisPattern.test(normalized)) {
    return {
      normalized,
      original,
      isValid: false,
      error: `Format NIS tidak valid: "${normalized}" (expected: angka/angka.angka)`,
    };
  }

  return {
    normalized,
    original,
    isValid: true,
  };
}

// ─── CELL VALUE CLEANERS ──────────────────────────────────────────────────────

/**
 * Memeriksa apakah nilai sel adalah error Excel yang harus dikonversi ke null
 *
 * @param value - Nilai mentah dari sel Excel
 * @returns true jika nilai adalah error Excel
 *
 * @example
 * ```typescript
 * isExcelError("#REF!")   // → true
 * isExcelError("#DIV/0!") // → true
 * isExcelError(85)        // → false
 * ```
 */
export function isExcelError(value: RawCellValue): boolean {
  if (value === null || value === undefined) return false;
  const strVal = String(value).trim().toUpperCase();
  return EXCEL_ERROR_STRINGS.some((err) => strVal === err);
}

/**
 * Memeriksa apakah nilai sel menandakan "tidak ada nilai" yang harus jadi null
 *
 * @param value - Nilai mentah dari sel Excel
 * @returns true jika nilai menandakan data kosong
 *
 * @example
 * ```typescript
 * isEmptyValue("?")  // → true
 * isEmptyValue("-")  // → true
 * isEmptyValue("")   // → true
 * isEmptyValue(0)    // → false (0 adalah nilai valid!)
 * ```
 */
export function isEmptyValue(value: RawCellValue): boolean {
  if (value === null || value === undefined) return true;
  const strVal = String(value).trim();
  return (EMPTY_VALUE_MARKERS as readonly string[]).includes(strVal);
}

/**
 * Membersihkan nilai numerik dari sel Excel.
 * Mengkonversi error Excel dan nilai "?" menjadi null.
 * Memvalidasi bahwa nilai berada dalam range yang wajar.
 *
 * @param value - Nilai mentah dari sel Excel
 * @param min - Nilai minimum yang valid (default: 0)
 * @param max - Nilai maksimum yang valid (default: 100)
 * @returns Nilai numerik yang sudah dibersihkan, atau null jika tidak valid
 *
 * @example
 * ```typescript
 * cleanNumericValue("85")     // → 85
 * cleanNumericValue(92.5)     // → 92.5
 * cleanNumericValue("?")      // → null
 * cleanNumericValue("#REF!")  // → null
 * cleanNumericValue(150)      // → null (di luar range 0-100)
 * cleanNumericValue("")       // → null
 * ```
 */
export function cleanNumericValue(
  value: RawCellValue,
  min = 0,
  max = 100
): number | null {
  // Cek error Excel
  if (isExcelError(value)) return null;

  // Cek nilai kosong / tidak ada
  if (isEmptyValue(value)) return null;

  // Konversi ke number
  const num = typeof value === "number" ? value : parseFloat(String(value));

  // Cek apakah hasil konversi valid
  if (isNaN(num) || !isFinite(num)) return null;

  // Validasi range
  if (num < min || num > max) return null;

  return num;
}

/**
 * Membersihkan nilai teks dari sel Excel.
 * Menghapus whitespace berlebih dan mengkonversi nilai khusus ke null.
 *
 * @param value - Nilai mentah dari sel Excel
 * @returns String yang sudah dibersihkan, atau null jika tidak ada nilai
 *
 * @example
 * ```typescript
 * cleanTextValue("  Halo Dunia  ") // → "Halo Dunia"
 * cleanTextValue("?")             // → null
 * cleanTextValue("")              // → null
 * cleanTextValue("#REF!")         // → null
 * ```
 */
export function cleanTextValue(value: RawCellValue): string | null {
  if (isExcelError(value)) return null;
  if (value === null || value === undefined) return null;

  const str = String(value).trim();

  if (!str || str === "?" || str === "-" || str === "N/A") return null;

  return str;
}

/**
 * Membersihkan nilai persentase dari sel Excel.
 * Menangani format persentase Excel (0.85 = 85%) maupun langsung (85 = 85%).
 *
 * @param value - Nilai mentah dari sel Excel
 * @returns Nilai persentase (0-100) atau null
 *
 * @example
 * ```typescript
 * cleanPercentageValue(0.875)  // → 87.5 (format Excel: 0.875 = 87.5%)
 * cleanPercentageValue(87.5)   // → 87.5 (sudah dalam format persentase)
 * cleanPercentageValue("?")    // → null
 * ```
 */
export function cleanPercentageValue(value: RawCellValue): number | null {
  if (isExcelError(value)) return null;
  if (isEmptyValue(value)) return null;

  const num = typeof value === "number" ? value : parseFloat(String(value));

  if (isNaN(num) || !isFinite(num)) return null;

  // Jika nilai antara 0 dan 1, kemungkinan format Excel (0.85 = 85%)
  if (num >= 0 && num <= 1) {
    return Math.round(num * 1000) / 10; // Konversi ke persentase dengan 1 desimal
  }

  // Jika nilai antara 0 dan 100, sudah dalam format persentase
  if (num >= 0 && num <= 100) {
    return Math.round(num * 10) / 10;
  }

  return null;
}

/**
 * Membersihkan nilai boolean/checklist dari sel Excel.
 * Nilai 1 atau "1" = true (selesai), nilai lain = false (belum).
 *
 * @param value - Nilai mentah dari sel Excel
 * @returns true jika nilai adalah 1, false untuk semua nilai lain
 *
 * @example
 * ```typescript
 * cleanBooleanValue(1)    // → true
 * cleanBooleanValue("1")  // → true
 * cleanBooleanValue(0)    // → false
 * cleanBooleanValue("")   // → false
 * cleanBooleanValue("?")  // → false
 * ```
 */
export function cleanBooleanValue(value: RawCellValue): boolean {
  if (isExcelError(value)) return false;
  if (isEmptyValue(value)) return false;

  const num = typeof value === "number" ? value : parseFloat(String(value));
  return num === 1;
}

// ─── ROW VALIDATION ───────────────────────────────────────────────────────────

/**
 * Memeriksa apakah baris data harus diproses atau dilewati.
 *
 * Baris yang harus dilewati (skip):
 * 1. Kolom NO kosong → baris kosong / baris header tambahan
 * 2. NO bukan angka → baris total/rata-rata di bagian bawah
 * 3. NAMA kosong → baris yang tidak punya data siswa
 *
 * @param noValue - Nilai kolom NO (nomor urut)
 * @param namaValue - Nilai kolom NAMA siswa
 * @returns Objek yang menjelaskan apakah baris harus diproses
 *
 * @example
 * ```typescript
 * shouldProcessRow(1, "Adhitama Putra")
 * // → { shouldProcess: true }
 *
 * shouldProcessRow("", "")
 * // → { shouldProcess: false, skipReason: "Kolom NO kosong" }
 *
 * shouldProcessRow("JUMLAH", "")
 * // → { shouldProcess: false, skipReason: "NO bukan angka (kemungkinan baris total)" }
 * ```
 */
export function shouldProcessRow(
  noValue: RawCellValue,
  namaValue: RawCellValue
): RowValidationResult {
  // Cek apakah kolom NO ada isinya
  if (noValue === null || noValue === undefined || String(noValue).trim() === "") {
    return {
      shouldProcess: false,
      skipReason: "Kolom NO kosong → baris kosong atau baris header",
    };
  }

  // Cek apakah NO adalah angka valid
  const noNum = parseInt(String(noValue), 10);
  if (isNaN(noNum) || noNum <= 0) {
    return {
      shouldProcess: false,
      skipReason: `NO bukan angka positif (nilai: "${noValue}") → kemungkinan baris total/judul`,
    };
  }

  // Cek apakah NAMA ada isinya
  const nama = cleanTextValue(namaValue);
  if (!nama) {
    return {
      shouldProcess: false,
      skipReason: `NO=${noNum} tapi NAMA kosong → baris tidak valid`,
    };
  }

  return { shouldProcess: true };
}

// ─── STATUS NORMALIZATION ─────────────────────────────────────────────────────

/**
 * Menormalisasi nilai status ketuntasan belajar.
 * Menangani variasi penulisan dari guru.
 *
 * @param value - Nilai status mentah dari Excel
 * @returns Status yang sudah dinormalisasi atau null
 *
 * @example
 * ```typescript
 * normalizeStatusTuntas("TUNTAS")              // → "TUNTAS"
 * normalizeStatusTuntas("tuntas")              // → "TUNTAS"
 * normalizeStatusTuntas("TUNTAS DENGAN CATATAN") // → "TUNTAS DENGAN CATATAN"
 * normalizeStatusTuntas("BELUM")               // → "BELUM"
 * normalizeStatusTuntas("?")                   // → null
 * ```
 */
export function normalizeStatusTuntas(value: RawCellValue): "TUNTAS" | "BELUM" | "TUNTAS DENGAN CATATAN" | null {
  const str = cleanTextValue(value);
  if (!str) return null;

  const upper = str.toUpperCase().trim();

  if (upper === "TUNTAS") return "TUNTAS";
  if (upper === "BELUM" || upper === "BELUM TUNTAS") return "BELUM";
  if (upper.includes("TUNTAS") && upper.includes("CATATAN")) {
    return "TUNTAS DENGAN CATATAN";
  }

  return null;
}

// ─── ZOD SCHEMA FOR ROW VALIDATION ───────────────────────────────────────────

/**
 * Schema Zod untuk validasi data satu baris nilai siswa sebelum disimpan ke database.
 * Semua field nilai bersifat opsional (nullable) karena data bisa tidak lengkap.
 */
export const gradeRowSchema = z.object({
  nis: z.string().min(1, "NIS tidak boleh kosong"),
  nama: z.string().min(1, "Nama tidak boleh kosong").max(100),
  nilaiGithub: z.number().min(0).max(100).nullable(),
  nilaiApi: z.number().min(0).max(100).nullable(),
  nilaiAdminPanel: z.number().min(0).max(100).nullable(),
  nilaiLandingPage: z.number().min(0).max(100).nullable(),
  nilaiKagglePython: z.number().min(0).max(100).nullable(),
  nilaiKaggleSql: z.number().min(0).max(100).nullable(),
  nilaiKaggleMl: z.number().min(0).max(100).nullable(),
  nilaiUjianMl: z.number().min(0).max(100).nullable(),
  nilaiUjianSql: z.number().min(0).max(100).nullable(),
  persentaseHadir: z.number().min(0).max(100).nullable(),
  rataRata: z.number().min(0).max(100).nullable(),
  nilaiTa1: z.number().min(0).max(100).nullable(),
  nilaiTa2: z.number().min(0).max(100).nullable(),
  nilaiHasil: z.number().min(0).max(100).nullable(),
  nilaiRaport: z.number().min(0).max(100).nullable(),
  statusTuntas: z.enum(["TUNTAS", "BELUM", "TUNTAS DENGAN CATATAN"]).nullable(),
});

/** Tipe TypeScript yang di-infer dari gradeRowSchema */
export type GradeRowData = z.infer<typeof gradeRowSchema>;

/**
 * Schema Zod untuk validasi data absensi siswa
 */
export const attendanceRowSchema = z.object({
  nama: z.string().min(1, "Nama tidak boleh kosong"),
  totalHadir: z.number().int().min(0),
  totalTidakHadir: z.number().int().min(0),
  persentaseHadir: z.number().min(0).max(100),
});

/** Tipe TypeScript yang di-infer dari attendanceRowSchema */
export type AttendanceRowData = z.infer<typeof attendanceRowSchema>;

/**
 * Schema Zod untuk validasi data laporan siswa
 */
export const reportRowSchema = z.object({
  nis: z.string().nullable(),
  nama: z.string().min(1, "Nama tidak boleh kosong"),
  asalSmp: z.string().nullable(),
  checklistH: z.boolean(),
  checklistI: z.boolean(),
  checklistJ: z.boolean(),
  checklistK: z.boolean(),
  skorLaporan: z.number().min(0).nullable(),
});

/** Tipe TypeScript yang di-infer dari reportRowSchema */
export type ReportRowData = z.infer<typeof reportRowSchema>;
