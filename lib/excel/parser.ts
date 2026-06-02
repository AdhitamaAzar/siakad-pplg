// =============================================================================
// FILE: lib/excel/parser.ts
// TUJUAN: Parser utama untuk membaca file Excel "NilaiGenap2526.xlsx" menggunakan
//         library SheetJS (xlsx). Membaca semua 12 sheet dan mengkonversi ke
//         format array yang siap diproses oleh mapper.
//
//         Sheet yang dibaca:
//         NILAI   : xipplg1, xipplg2, xipplg3
//         ABSENSI : ab xipplg1, ab xipplg2, ab xipplg3
//         CATATAN : catatan, catatan 2, catatan 3
//         LAPORAN : Lxipplg1, Lxipplg2, Lxipplg3
// =============================================================================

import * as XLSX from "xlsx";
import type { WorkBook, WorkSheet } from "xlsx";

// ─── KONSTANTA ────────────────────────────────────────────────────────────────

/**
 * Nama-nama sheet dalam file Excel sesuai dengan urutan kelas
 */
export const SHEET_NAMES = {
  nilai: {
    "XI PPLG 1": "xipplg1",
    "XI PPLG 2": "xipplg2",
    "XI PPLG 3": "xipplg3",
  },
  absensi: {
    "XI PPLG 1": "ab xipplg1",
    "XI PPLG 2": "ab xipplg2",
    "XI PPLG 3": "ab xipplg3",
  },
  catatan: {
    "XI PPLG 1": "catatan",
    "XI PPLG 2": "catatan 2",
    "XI PPLG 3": "catatan 3",
  },
  laporan: {
    "XI PPLG 1": "Lxipplg1",
    "XI PPLG 2": "Lxipplg2",
    "XI PPLG 3": "Lxipplg3",
  },
} as const;

export type NamaKelas = keyof typeof SHEET_NAMES.nilai;

/**
 * Baris header di masing-masing tipe sheet (1-indexed)
 * SheetJS menggunakan 0-indexed, jadi kita kurangi 1 saat dipakai
 */
const HEADER_ROWS = {
  nilai: 5,   // Header di baris 5 Excel
  absensi: 6, // Header di baris 6 Excel
  catatan: 1, // Header di baris 1 (format bebas)
  laporan: 5, // Header di baris 5 Excel
} as const;

// ─── TYPE DEFINITIONS ─────────────────────────────────────────────────────────

/** Tipe untuk satu sel nilai dari Excel (bisa berbagai tipe) */
export type CellValue = string | number | boolean | null | undefined;

/** Satu baris data Excel direpresentasikan sebagai array */
export type ExcelRow = CellValue[];

/** Data mentah dari satu sheet */
export interface RawSheetData {
  /** Nama sheet */
  sheetName: string;
  /** Nama kelas yang direpresentasikan */
  namaKelas: NamaKelas;
  /** Array baris data (setiap baris adalah array nilai sel) */
  rows: ExcelRow[];
  /** Jumlah total baris yang dibaca */
  totalRows: number;
}

/** Hasil parsing semua sheet dari satu file Excel */
export interface ParsedExcelData {
  /** Nama file yang diparse */
  fileName: string;
  /** Data sheet nilai (3 kelas) */
  nilai: Record<NamaKelas, RawSheetData>;
  /** Data sheet absensi (3 kelas) */
  absensi: Record<NamaKelas, RawSheetData>;
  /** Data sheet catatan (3 kelas) */
  catatan: Record<NamaKelas, RawSheetData>;
  /** Data sheet laporan (3 kelas) */
  laporan: Record<NamaKelas, RawSheetData>;
  /** Timestamp saat file diparse */
  parsedAt: Date;
  /** Daftar warning yang terjadi saat parsing */
  warnings: string[];
}

// ─── HELPER FUNCTIONS ─────────────────────────────────────────────────────────

/**
 * Mendapatkan nilai sel dari WorkSheet berdasarkan koordinat kolom dan baris.
 * Menggunakan format address Excel (A1, B2, dst).
 *
 * @param ws - WorkSheet SheetJS
 * @param col - Indeks kolom (0 = A, 1 = B, dst)
 * @param row - Indeks baris (0 = baris pertama)
 * @returns Nilai sel atau null jika sel tidak ada
 */
function getCellValue(ws: WorkSheet, col: number, row: number): CellValue {
  const cellAddress = XLSX.utils.encode_cell({ c: col, r: row });
  const cell = ws[cellAddress];

  if (!cell) return null;

  // Kembalikan nilai yang sudah di-parse SheetJS
  // - cell.v = nilai raw (number, string, boolean)
  // - cell.w = nilai formatted (string dengan format Excel)
  // - cell.t = tipe sel ('n'=number, 's'=string, 'b'=boolean, 'e'=error)

  // Jika sel adalah error Excel, kembalikan string error-nya
  if (cell.t === "e") {
    return cell.w ?? "#ERROR";
  }

  return cell.v ?? null;
}

/**
 * Mengkonversi sheet ke array of arrays, dimulai dari baris header tertentu.
 *
 * @param ws - WorkSheet yang akan dikonversi
 * @param headerRow - Nomor baris header (1-indexed, sesuai Excel)
 * @returns Array of ExcelRow, dimana setiap elemen adalah satu baris data
 */
function sheetToRows(ws: WorkSheet, headerRow: number): ExcelRow[] {
  if (!ws["!ref"]) return [];

  // Decode range untuk mengetahui batas baris dan kolom
  const range = XLSX.utils.decode_range(ws["!ref"]);
  const dataStartRow = headerRow; // Sudah 0-indexed (headerRow - 1 + 1 untuk data)
  const maxCol = range.e.c;
  const maxRow = range.e.r;

  const rows: ExcelRow[] = [];

  for (let rowIdx = dataStartRow; rowIdx <= maxRow; rowIdx++) {
    const row: CellValue[] = [];

    for (let colIdx = 0; colIdx <= maxCol; colIdx++) {
      row.push(getCellValue(ws, colIdx, rowIdx));
    }

    rows.push(row);
  }

  return rows;
}

/**
 * Memeriksa apakah workbook memiliki sheet dengan nama tertentu
 *
 * @param workbook - WorkBook SheetJS
 * @param sheetName - Nama sheet yang dicari
 * @returns true jika sheet ditemukan
 */
function hasSheet(workbook: WorkBook, sheetName: string): boolean {
  return workbook.SheetNames.includes(sheetName);
}

// ─── SHEET PARSERS ────────────────────────────────────────────────────────────

/**
 * Mem-parse satu sheet nilai (xipplg1, xipplg2, atau xipplg3)
 *
 * @param workbook - WorkBook yang sudah dimuat
 * @param namaKelas - Nama kelas yang diparse
 * @param warnings - Array warnings untuk ditambahkan jika ada masalah
 * @returns Data mentah sheet atau null jika sheet tidak ditemukan
 */
function parseNilaiSheet(
  workbook: WorkBook,
  namaKelas: NamaKelas,
  warnings: string[]
): RawSheetData | null {
  const sheetName = SHEET_NAMES.nilai[namaKelas];

  if (!hasSheet(workbook, sheetName)) {
    warnings.push(
      `Sheet nilai "${sheetName}" untuk kelas ${namaKelas} tidak ditemukan`
    );
    return null;
  }

  const ws = workbook.Sheets[sheetName]!;
  // Data siswa dimulai setelah header (baris 5 Excel = indeks 5 karena 0-indexed)
  // Header di baris 5, data mulai baris 6 → indeks 5
  const rows = sheetToRows(ws, HEADER_ROWS.nilai);

  return {
    sheetName,
    namaKelas,
    rows,
    totalRows: rows.length,
  };
}

/**
 * Mem-parse satu sheet absensi (ab xipplg1, ab xipplg2, ab xipplg3)
 *
 * @param workbook - WorkBook yang sudah dimuat
 * @param namaKelas - Nama kelas yang diparse
 * @param warnings - Array warnings untuk ditambahkan jika ada masalah
 * @returns Data mentah sheet atau null jika sheet tidak ditemukan
 */
function parseAbsensiSheet(
  workbook: WorkBook,
  namaKelas: NamaKelas,
  warnings: string[]
): RawSheetData | null {
  const sheetName = SHEET_NAMES.absensi[namaKelas];

  if (!hasSheet(workbook, sheetName)) {
    warnings.push(
      `Sheet absensi "${sheetName}" untuk kelas ${namaKelas} tidak ditemukan`
    );
    return null;
  }

  const ws = workbook.Sheets[sheetName]!;
  // Header di baris 6, data mulai baris 7 → indeks 6
  const rows = sheetToRows(ws, HEADER_ROWS.absensi);

  return {
    sheetName,
    namaKelas,
    rows,
    totalRows: rows.length,
  };
}

/**
 * Mem-parse satu sheet catatan guru
 *
 * @param workbook - WorkBook yang sudah dimuat
 * @param namaKelas - Nama kelas yang diparse
 * @param warnings - Array warnings untuk ditambahkan jika ada masalah
 * @returns Data mentah sheet atau null jika sheet tidak ditemukan
 */
function parseCatatanSheet(
  workbook: WorkBook,
  namaKelas: NamaKelas,
  warnings: string[]
): RawSheetData | null {
  const sheetName = SHEET_NAMES.catatan[namaKelas];

  if (!hasSheet(workbook, sheetName)) {
    warnings.push(
      `Sheet catatan "${sheetName}" untuk kelas ${namaKelas} tidak ditemukan`
    );
    return null;
  }

  const ws = workbook.Sheets[sheetName]!;
  // Format bebas, mulai dari baris 1
  const rows = sheetToRows(ws, 0);

  return {
    sheetName,
    namaKelas,
    rows,
    totalRows: rows.length,
  };
}

/**
 * Mem-parse satu sheet laporan (Lxipplg1, Lxipplg2, Lxipplg3)
 *
 * @param workbook - WorkBook yang sudah dimuat
 * @param namaKelas - Nama kelas yang diparse
 * @param warnings - Array warnings untuk ditambahkan jika ada masalah
 * @returns Data mentah sheet atau null jika sheet tidak ditemukan
 */
function parseLaporanSheet(
  workbook: WorkBook,
  namaKelas: NamaKelas,
  warnings: string[]
): RawSheetData | null {
  const sheetName = SHEET_NAMES.laporan[namaKelas];

  if (!hasSheet(workbook, sheetName)) {
    warnings.push(
      `Sheet laporan "${sheetName}" untuk kelas ${namaKelas} tidak ditemukan`
    );
    return null;
  }

  const ws = workbook.Sheets[sheetName]!;
  const rows = sheetToRows(ws, HEADER_ROWS.laporan - 1);

  return {
    sheetName,
    namaKelas,
    rows,
    totalRows: rows.length,
  };
}

// ─── MAIN PARSER ──────────────────────────────────────────────────────────────

/**
 * Mem-parse file Excel Buffer dan mengekstrak data dari semua 12 sheet.
 *
 * Fungsi ini menerima Buffer dari file upload dan mengembalikan semua data
 * dalam format terstruktur yang siap diproses oleh mapper.ts.
 *
 * @param buffer - Buffer dari file Excel yang diupload
 * @param fileName - Nama file untuk logging (contoh: "NilaiGenap2526.xlsx")
 * @returns Hasil parsing semua sheet dari file Excel
 * @throws Error jika file bukan Excel valid atau tidak bisa dibaca
 *
 * @example
 * ```typescript
 * // Di API Route:
 * const formData = await request.formData();
 * const file = formData.get("file") as File;
 * const buffer = Buffer.from(await file.arrayBuffer());
 * const parsed = await parseExcelFile(buffer, file.name);
 * ```
 */
export async function parseExcelFile(
  buffer: Buffer,
  fileName: string
): Promise<ParsedExcelData> {
  const warnings: string[] = [];

  // ── Muat workbook dari buffer ─────────────────────────────────────────────
  let workbook: WorkBook;
  try {
    workbook = XLSX.read(buffer, {
      type: "buffer",
      cellFormula: false,    // Jangan parse formula (kita butuh nilai hasil)
      cellHTML: false,       // Tidak perlu HTML
      cellNF: false,         // Tidak perlu number format
      cellDates: false,      // Tidak perlu konversi tanggal otomatis
      cellStyles: false,     // Tidak perlu style info
      sheetStubs: true,      // Sertakan sel yang kosong
      raw: false,            // Gunakan nilai formatted untuk tanggal
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(
      `Gagal membaca file Excel "${fileName}": ${message}. ` +
      `Pastikan file adalah format .xlsx yang valid.`
    );
  }

  // Cek apakah workbook punya sheet
  if (!workbook.SheetNames.length) {
    throw new Error(`File "${fileName}" tidak memiliki sheet sama sekali`);
  }

  // Log sheet yang ditemukan
  const foundSheets = workbook.SheetNames.join(", ");
  console.log(`[Excel Parser] File: "${fileName}", Sheet ditemukan: [${foundSheets}]`);

  const kelasNames: NamaKelas[] = ["XI PPLG 1", "XI PPLG 2", "XI PPLG 3"];

  // ── Parse semua sheet nilai ───────────────────────────────────────────────
  const nilaiData: Partial<Record<NamaKelas, RawSheetData>> = {};
  const absensiData: Partial<Record<NamaKelas, RawSheetData>> = {};
  const catatanData: Partial<Record<NamaKelas, RawSheetData>> = {};
  const laporanData: Partial<Record<NamaKelas, RawSheetData>> = {};

  for (const kelas of kelasNames) {
    const nilai = parseNilaiSheet(workbook, kelas, warnings);
    if (nilai) {
      nilaiData[kelas] = nilai;
      console.log(
        `[Excel Parser] Sheet nilai "${nilai.sheetName}": ${nilai.totalRows} baris`
      );
    }

    const absensi = parseAbsensiSheet(workbook, kelas, warnings);
    if (absensi) {
      absensiData[kelas] = absensi;
      console.log(
        `[Excel Parser] Sheet absensi "${absensi.sheetName}": ${absensi.totalRows} baris`
      );
    }

    const catatan = parseCatatanSheet(workbook, kelas, warnings);
    if (catatan) {
      catatanData[kelas] = catatan;
      console.log(
        `[Excel Parser] Sheet catatan "${catatan.sheetName}": ${catatan.totalRows} baris`
      );
    }

    const laporan = parseLaporanSheet(workbook, kelas, warnings);
    if (laporan) {
      laporanData[kelas] = laporan;
      console.log(
        `[Excel Parser] Sheet laporan "${laporan.sheetName}": ${laporan.totalRows} baris`
      );
    }
  }

  // Buat data fallback untuk sheet yang tidak ditemukan
  const createEmptySheetData = (
    namaKelas: NamaKelas,
    sheetName: string
  ): RawSheetData => ({
    sheetName,
    namaKelas,
    rows: [],
    totalRows: 0,
  });

  return {
    fileName,
    nilai: {
      "XI PPLG 1": nilaiData["XI PPLG 1"] ?? createEmptySheetData("XI PPLG 1", "xipplg1"),
      "XI PPLG 2": nilaiData["XI PPLG 2"] ?? createEmptySheetData("XI PPLG 2", "xipplg2"),
      "XI PPLG 3": nilaiData["XI PPLG 3"] ?? createEmptySheetData("XI PPLG 3", "xipplg3"),
    },
    absensi: {
      "XI PPLG 1": absensiData["XI PPLG 1"] ?? createEmptySheetData("XI PPLG 1", "ab xipplg1"),
      "XI PPLG 2": absensiData["XI PPLG 2"] ?? createEmptySheetData("XI PPLG 2", "ab xipplg2"),
      "XI PPLG 3": absensiData["XI PPLG 3"] ?? createEmptySheetData("XI PPLG 3", "ab xipplg3"),
    },
    catatan: {
      "XI PPLG 1": catatanData["XI PPLG 1"] ?? createEmptySheetData("XI PPLG 1", "catatan"),
      "XI PPLG 2": catatanData["XI PPLG 2"] ?? createEmptySheetData("XI PPLG 2", "catatan 2"),
      "XI PPLG 3": catatanData["XI PPLG 3"] ?? createEmptySheetData("XI PPLG 3", "catatan 3"),
    },
    laporan: {
      "XI PPLG 1": laporanData["XI PPLG 1"] ?? createEmptySheetData("XI PPLG 1", "Lxipplg1"),
      "XI PPLG 2": laporanData["XI PPLG 2"] ?? createEmptySheetData("XI PPLG 2", "Lxipplg2"),
      "XI PPLG 3": laporanData["XI PPLG 3"] ?? createEmptySheetData("XI PPLG 3", "Lxipplg3"),
    },
    parsedAt: new Date(),
    warnings,
  };
}

/**
 * Verifikasi bahwa file yang diupload adalah Excel yang valid
 *
 * @param file - File object dari FormData
 * @returns true jika file valid
 * @throws Error jika file tidak valid
 */
export function validateExcelFile(file: File): void {
  const MAX_SIZE_MB = 10;
  const MAX_SIZE_BYTES = MAX_SIZE_MB * 1024 * 1024;

  const VALID_MIME_TYPES = [
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    "application/vnd.ms-excel",
  ];

  const VALID_EXTENSIONS = [".xlsx", ".xls"];

  // Cek ukuran file
  if (file.size > MAX_SIZE_BYTES) {
    throw new Error(
      `File terlalu besar: ${(file.size / 1024 / 1024).toFixed(1)}MB. ` +
      `Maksimum ${MAX_SIZE_MB}MB.`
    );
  }

  // Cek tipe MIME
  if (!VALID_MIME_TYPES.includes(file.type)) {
    // Fallback: cek ekstensi file
    const hasValidExtension = VALID_EXTENSIONS.some((ext) =>
      file.name.toLowerCase().endsWith(ext)
    );

    if (!hasValidExtension) {
      throw new Error(
        `File harus berformat Excel (.xlsx atau .xls). ` +
        `File yang diupload: "${file.name}" (tipe: ${file.type || "tidak diketahui"})`
      );
    }
  }
}
