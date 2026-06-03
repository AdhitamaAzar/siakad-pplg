// =============================================================================
// FILE: app/guru/import/ImportForm.tsx
// TUJUAN: Form upload & import Excel interaktif (Client Component).
//         - Client-side Excel parsing menggunakan SheetJS (xlsx)
//         - Mapping kolom otomatis & manual per sheet
//         - Preview data & validasi client-side sebelum upload
//         - Pilihan mata pelajaran target
//         - Progress bar impor per sheet
//         - Log hasil impor lengkap (sukses, skip, error)
// =============================================================================

"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import {
  Upload, FileSpreadsheet, X, CheckCircle, AlertCircle, Loader2,
  ChevronDown, ChevronRight, Settings, ArrowRight, Check, AlertTriangle, Play
} from "lucide-react";
import * as XLSX from "xlsx";

// ─── TYPES & CONSTANTS ────────────────────────────────────────────────────────

const getDbFields = (isRpl: boolean) => [
  { key: "nis", label: "NIS (Wajib)", required: true, matchers: ["nis", "no induk", "nomor induk"] },
  { key: "nama", label: "Nama (Wajib)", required: true, matchers: ["nama", "nama siswa", "nama lengkap"] },
  { key: "nilaiGithub", label: isRpl ? "Nilai Github" : "Tugas 1", required: false, matchers: isRpl ? ["github", "portofolio", "nilai github", "portfolio"] : ["tugas 1", "tugas1", "t1", "tg1", "tugas"] },
  { key: "nilaiApi", label: isRpl ? "Nilai API" : "Tugas 2", required: false, matchers: isRpl ? ["api", "nilai api", "tugas api"] : ["tugas 2", "tugas2", "t2", "tg2"] },
  { key: "nilaiAdminPanel", label: isRpl ? "Nilai Admin Panel" : "Tugas 3", required: false, matchers: isRpl ? ["admin", "admin panel", "nilai admin panel"] : ["tugas 3", "tugas3", "t3", "tg3"] },
  { key: "nilaiLandingPage", label: isRpl ? "Nilai Landing Page" : "Tugas 4", required: false, matchers: isRpl ? ["landing", "landing page", "nilai landing page"] : ["tugas 4", "tugas4", "t4", "tg4"] },
  { key: "nilaiKagglePython", label: isRpl ? "Kaggle Python" : "Tugas 5", required: false, matchers: isRpl ? ["kaggle python", "python"] : ["tugas 5", "tugas5", "t5", "tg5"] },
  { key: "nilaiKaggleSql", label: isRpl ? "Kaggle SQL" : "Tugas 6", required: false, matchers: isRpl ? ["kaggle sql", "sql"] : ["tugas 6", "tugas6", "t6", "tg6"] },
  { key: "nilaiKaggleMl", label: isRpl ? "Kaggle ML" : "Tugas 7", required: false, matchers: isRpl ? ["kaggle ml", "ml"] : ["tugas 7", "tugas7", "t7", "tg7"] },
  { key: "nilaiUjianMl", label: isRpl ? "Ujian ML" : "Ujian 1", required: false, matchers: isRpl ? ["ujian ml", "ujian machine learning"] : ["ujian 1", "ujian1", "u1", "uh1", "uts", "ujian harian 1", "pts"] },
  { key: "nilaiUjianSql", label: isRpl ? "Ujian SQL" : "Ujian 2", required: false, matchers: isRpl ? ["ujian sql"] : ["ujian 2", "ujian2", "u2", "uh2", "uas", "ujian harian 2", "pas"] },
];

interface ExcelSheetData {
  sheetName: string;
  headers: string[];
  rows: any[];
  isSelected: boolean;
  targetClassId: string;
  columnMap: Record<string, string>; // dbField -> excelHeader
  validationErrors: string[];
}

interface ImportResult {
  ok: boolean;
  message: string;
  sheets?: Array<{
    sheet: string;
    success: number;
    skipped: number;
    errors: string[];
  }>;
}

// ─── MAIN COMPONENT ───────────────────────────────────────────────────────────

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

export default function ImportForm() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const workbookRef = useRef<XLSX.WorkBook | null>(null);
  const [classes, setClasses] = useState<any[]>([]);
  const [subjects, setSubjects] = useState<any[]>([]);
  const [defaultSubjectId, setDefaultSubjectId] = useState<string>("");
  const [semester, setSemester] = useState("Genap");
  const [tahunAjaran, setTahunAjaran] = useState("2025/2026");
  const [academicYears, setAcademicYears] = useState<any[]>([]);
  const [showAdvanced, setShowAdvanced] = useState(false);

  const activeSubject = subjects.find((s) => String(s.id) === defaultSubjectId);
  const isRpl = activeSubject ? activeSubject.kodeMapel.toLowerCase().includes("pplg") : true;
  const dbFields = getDbFields(isRpl);

  // Flow states: 'upload' | 'preview' | 'importing' | 'result'
  const [step, setStep] = useState<"upload" | "preview" | "importing" | "result">("upload");
  const [file, setFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [sheets, setSheets] = useState<ExcelSheetData[]>([]);
  const [currentSheetIdx, setCurrentSheetIdx] = useState<number>(0);
  const [importProgress, setImportProgress] = useState({ current: 0, total: 0, sheetName: "" });
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [expandedLogs, setExpandedLogs] = useState<Record<string, boolean>>({});

  // Fetch metadata kelas, mapel & tahun ajaran
  useEffect(() => {
    fetch("/api/admin/kelas")
      .then((res) => res.json())
      .then((data) => {
        if (data.ok && data.classes) setClasses(data.classes);
      })
      .catch((err) => console.error("Gagal mengambil data kelas:", err));

    fetch("/api/admin/mapel")
      .then((res) => res.json())
      .then((data) => {
        if (data.ok && data.subjects) {
          setSubjects(data.subjects);
          const def = data.subjects.find((s: any) => s.kodeMapel === "PPLG-IMPORT");
          if (def) setDefaultSubjectId(String(def.id));
          else if (data.subjects.length > 0) setDefaultSubjectId(String(data.subjects[0].id));
        }
      })
      .catch((err) => console.error("Gagal mengambil data mapel:", err));

    fetch("/api/admin/tahun-ajaran")
      .then((res) => res.json())
      .then((data) => {
        if (data.ok && data.years) {
          setAcademicYears(data.years);
          const activeYear = data.years.find((y: any) => y.isActive);
          if (activeYear) setTahunAjaran(activeYear.tahunAjaran);
          else if (data.years.length > 0) setTahunAjaran(data.years[0].tahunAjaran);
        }
      })
      .catch((err) => console.error("Gagal mengambil data tahun ajaran:", err));
  }, []);

  // ─── VALIDATION ────────────────────────────────────────────────────────────

  const validateSheets = useCallback((targetSheets: ExcelSheetData[]) => {
    const fields = getDbFields(isRpl);
    return targetSheets.map((sheet) => {
      if (!sheet.isSelected) return sheet;

      // Filter baris kosong terlebih dahulu (jika NIS atau Nama kosong, abaikan/skip)
      const validRows = sheet.rows.filter((row) => {
        const nisVal = sheet.columnMap.nis ? String(row[sheet.columnMap.nis] || "").trim() : "";
        const namaVal = sheet.columnMap.nama ? String(row[sheet.columnMap.nama] || "").trim() : "";
        return nisVal !== "" && namaVal !== "";
      });

      const errors: string[] = [];
      if (!sheet.targetClassId) {
        errors.push("Target kelas belum ditentukan.");
      }

      // Validasi kolom wajib NIS dan Nama
      if (!sheet.columnMap.nis) {
        errors.push("Kolom NIS belum dipetakan.");
      }
      if (!sheet.columnMap.nama) {
        errors.push("Kolom Nama belum dipetakan.");
      }

      validRows.forEach((row, idx) => {
        const namaVal = sheet.columnMap.nama ? String(row[sheet.columnMap.nama] || "").trim() : "";

        // Validasi nilai harus 0 - 100 (lewati jika berisi "-", "Belum", atau kosong)
        fields.forEach((f) => {
          if (f.key !== "nis" && f.key !== "nama" && sheet.columnMap[f.key]) {
            const val = row[sheet.columnMap[f.key]];
            const valStr = val !== null && val !== undefined ? String(val).trim() : "";
            if (valStr !== "") {
              const num = Number(valStr);
              if (!isNaN(num)) {
                if (num < 0 || num > 100) {
                  errors.push(`Baris ${idx + 1} (${namaVal || "Siswa"}): Nilai ${f.label} tidak valid (${val}). Harus 0-100.`);
                }
              }
            }
          }
        });
      });

      return { ...sheet, rows: validRows, validationErrors: errors };
    });
  }, [isRpl]);

  // ─── FILE PARSING ──────────────────────────────────────────────────────────

  const processExcelFile = useCallback((uploadedFile: File) => {
    setFile(uploadedFile);
    const reader = new FileReader();
    reader.onload = (e) => {
      const data = new Uint8Array(e.target?.result as ArrayBuffer);
      const workbook = XLSX.read(data, { type: "array" });
      workbookRef.current = workbook;

      const gradeSheets = workbook.SheetNames.filter((name) => {
        const lower = name.toLowerCase().replace(/\s+/g, "");
        return lower === "xipplg1" || lower === "xipplg2" || lower === "xipplg3";
      });
      
      const parsedSheets: ExcelSheetData[] = gradeSheets.map((sheetName) => {
        const ws = workbook.Sheets[sheetName];
        const aoa = XLSX.utils.sheet_to_json<any[]>(ws, { header: 1, defval: "" });
        
        // Asumsi header berada pada baris ke-5 (index 4) atau cari baris pertama yang berisi NIS
        let headerRowIdx = 4;
        let headers: string[] = [];
        
        if (aoa.length > 0) {
          // Cari baris yang mengandung text 'nis' atau 'nama' untuk dijadikan header
          for (let i = 0; i < Math.min(10, aoa.length); i++) {
            const row = aoa[i];
            if (row && row.some((cell: any) => String(cell).toLowerCase().includes("nis"))) {
              headerRowIdx = i;
              break;
            }
          }
          headers = (aoa[headerRowIdx] as string[]) || [];
        }

        // Ambil data baris setelah header
        const rows: any[] = [];
        for (let i = headerRowIdx + 1; i < aoa.length; i++) {
          const row = aoa[i];
          if (row && row.some((cell: any) => cell !== "")) {
            // Mapping array baris ke object berpola key: headerName, value: cellValue
            const rowObj: Record<string, any> = {};
            headers.forEach((h, idx) => {
              rowObj[h] = row[idx] !== undefined ? row[idx] : "";
            });
            rows.push(rowObj);
          }
        }

        // Auto-match Target Kelas berdasarkan nama sheet (contoh: "xipplg1" -> "XI PPLG 1")
        let matchedClassId = "";
        const cleanSheetName = sheetName.toLowerCase().replace(/[^a-z0-9]/g, "");
        const matchedClass = classes.find((c) => {
          const cleanClassName = c.namaKelas.toLowerCase().replace(/[^a-z0-9]/g, "");
          return cleanClassName === cleanSheetName || cleanSheetName.includes(cleanClassName) || cleanClassName.includes(cleanSheetName);
        });
        if (matchedClass) matchedClassId = String(matchedClass.id);

        // Auto-mapping kolom otomatis
        const columnMap: Record<string, string> = {};
        const fields = getDbFields(isRpl);
        fields.forEach((field) => {
          const matchedHeader = headers.find((h) =>
            field.matchers.some((matcher) => String(h).toLowerCase().trim() === matcher)
          );
          if (matchedHeader) {
            columnMap[field.key] = matchedHeader;
          } else {
            // Fallback sederhana jika tidak ada exact match
            const fallbackHeader = headers.find((h) =>
              field.matchers.some((matcher) => String(h).toLowerCase().includes(matcher))
            );
            columnMap[field.key] = fallbackHeader || "";
          }
        });

        return {
          sheetName,
          headers,
          rows,
          isSelected: true,
          targetClassId: matchedClassId,
          columnMap,
          validationErrors: [],
        };
      });

      const validated = validateSheets(parsedSheets);
      setSheets(validated);

      // Tentukan sheet pertama yang aktif untuk di-preview
      const firstSelectedIdx = validated.findIndex((s) => s.isSelected);
      if (firstSelectedIdx !== -1) {
        setCurrentSheetIdx(firstSelectedIdx);
      }
      setStep("preview");
    };
    reader.readAsArrayBuffer(uploadedFile);
  }, [classes, isRpl, validateSheets]);

  // ─── FILE DRAG & DROP HANDLERS ─────────────────────────────────────────────

  const handleDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    const f = e.dataTransfer.files[0];
    if (f && (f.name.endsWith(".xlsx") || f.name.endsWith(".xls"))) {
      processExcelFile(f);
    }
  }, [processExcelFile]);

  // ─── SUBMIT / IMPORT EXECUTION ─────────────────────────────────────────────

  const handleStartImport = async () => {
    setStep("importing");
    const activeSheets = sheets.filter((s) => s.isSelected);
    setImportProgress({ current: 0, total: activeSheets.length, sheetName: "" });

    const finalResults: NonNullable<ImportResult["sheets"]> = [];
    let isSuccessGlobal = true;
    const fields = getDbFields(isRpl);

    for (let i = 0; i < activeSheets.length; i++) {
      const sheet = activeSheets[i]!;
      setImportProgress({ current: i + 1, total: activeSheets.length, sheetName: sheet.sheetName });

      // Transform rows sesuai pemetaan kolom
      const mappedRows = sheet.rows.map((row) => {
        const nilai: Record<string, number | null> = {};
        fields.forEach((f) => {
          if (f.key !== "nis" && f.key !== "nama") {
            const excelHeader = sheet.columnMap[f.key];
            const rawVal = excelHeader ? row[excelHeader] : "";
            const rawValStr = rawVal !== null && rawVal !== undefined ? String(rawVal).trim() : "";
            const num = Number(rawValStr);
            // Jika nilai kosong atau bukan angka (misal "-", "Belum", dll.), simpan sebagai null agar diabaikan
            const isEmpty = rawValStr === "" || isNaN(num);
            nilai[f.key.replace("nilai", "").replace(/^\w/, (c) => c.toLowerCase())] =
              isEmpty ? null : num;
          }
        });

        return {
          nis: String(row[sheet.columnMap.nis || ""]).replace(/\s+/g, "").trim(),
          nama: String(row[sheet.columnMap.nama || ""]).trim(),
          nilai,
        };
      });

      // Parse corresponding auxiliary sheets from raw workbook
      const workbook = workbookRef.current;
      let attendanceRows: any[] = [];
      let laporanRows: any[] = [];
      let filteredCatatanRows: any[] = [];

      if (workbook) {
        const attSheetName = workbook.SheetNames.find(name => {
          const clean = name.toLowerCase().replace(/\s+/g, "");
          return clean === "ab" + sheet.sheetName.toLowerCase().replace(/\s+/g, "");
        });
        if (attSheetName) {
          attendanceRows = parseAttendanceSheet(workbook.Sheets[attSheetName]);
        }

        const repSheetName = workbook.SheetNames.find(name => {
          const clean = name.toLowerCase().replace(/\s+/g, "");
          return clean === "l" + sheet.sheetName.toLowerCase().replace(/\s+/g, "");
        });
        if (repSheetName) {
          laporanRows = parseLaporanSheet(workbook.Sheets[repSheetName]);
        }

        const catSheetName = workbook.SheetNames.find(name => {
          const clean = name.toLowerCase().replace(/\s+/g, "");
          return clean === "catatan";
        });
        if (catSheetName) {
          const targetClass = classes.find(c => String(c.id) === String(sheet.targetClassId));
          const className = targetClass ? targetClass.namaKelas : "";
          const parsedCatatan = parseCatatanSheet(workbook.Sheets[catSheetName]);
          filteredCatatanRows = parsedCatatan.filter(r => 
            r.className.toLowerCase().replace(/\s+/g, "") === className.toLowerCase().replace(/\s+/g, "")
          );
        }
      }

      try {
        const res = await fetch("/api/import-excel", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            semester,
            tahunAjaran,
            subjectId: defaultSubjectId ? Number(defaultSubjectId) : undefined,
            sheets: [
              {
                sheetName: sheet.sheetName,
                targetClassId: Number(sheet.targetClassId),
                rows: mappedRows,
                attendanceRows,
                catatanRows: filteredCatatanRows,
                laporanRows,
              },
            ],
          }),
        });

        const data = await res.json();
        if (data.ok && data.sheets) {
          finalResults.push(...data.sheets);
        } else {
          isSuccessGlobal = false;
          finalResults.push({
            sheet: sheet.sheetName,
            success: 0,
            skipped: sheet.rows.length,
            errors: [data.message || "Gagal mengimpor sheet ini."],
          });
        }
      } catch (err: any) {
        isSuccessGlobal = false;
        finalResults.push({
          sheet: sheet.sheetName,
          success: 0,
          skipped: sheet.rows.length,
          errors: [err.message || "Koneksi terputus saat mengimpor."],
        });
      }
    }

    setImportResult({
      ok: isSuccessGlobal,
      message: isSuccessGlobal
        ? "Import Excel berhasil diselesaikan!"
        : "Proses import selesai dengan beberapa kesalahan.",
      sheets: finalResults,
    });
    setStep("result");
  };

  // ─── HELPERS ───────────────────────────────────────────────────────────────

  const formatSize = (bytes: number) =>
    bytes > 1024 * 1024
      ? `${(bytes / 1024 / 1024).toFixed(1)} MB`
      : `${(bytes / 1024).toFixed(0)} KB`;

  return (
    <div className="space-y-6">

      {/* ── SETTINGS GLOBAL ── */}
      {step !== "importing" && step !== "result" && (
        <div className="rounded-2xl border border-slate-800/60 bg-slate-900/60 p-5 grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-1.5">
            <label className="text-[11px] font-extrabold uppercase tracking-wider text-slate-500">Tahun Ajaran</label>
            <select
              value={tahunAjaran}
              onChange={(e) => setTahunAjaran(e.target.value)}
              className="w-full bg-slate-950/60 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-slate-200 outline-none focus:border-indigo-500 focus:bg-slate-950 transition-colors"
            >
              {academicYears.map((y) => (
                <option key={y.id} value={y.tahunAjaran}>
                  {y.tahunAjaran}{y.isActive ? " (Aktif)" : ""}
                </option>
              ))}
              {academicYears.length === 0 && (
                <option value="2025/2026">2025/2026</option>
              )}
            </select>
          </div>
          <div className="space-y-1.5">
            <label className="text-[11px] font-extrabold uppercase tracking-wider text-slate-500">Semester</label>
            <select
              value={semester}
              onChange={(e) => setSemester(e.target.value)}
              className="w-full bg-slate-950/60 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-slate-200 outline-none focus:border-indigo-500 focus:bg-slate-950 transition-colors"
            >
              <option value="Ganjil">Ganjil</option>
              <option value="Genap">Genap</option>
            </select>
          </div>
          <div className="space-y-1.5">
            <label className="text-[11px] font-extrabold uppercase tracking-wider text-slate-500">Mata Pelajaran Default</label>
            <select
              value={defaultSubjectId}
              onChange={(e) => setDefaultSubjectId(e.target.value)}
              className="w-full bg-slate-950/60 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-slate-200 outline-none focus:border-indigo-500 focus:bg-slate-950 transition-colors"
            >
              {subjects.map((sub) => (
                <option key={sub.id} value={sub.id}>
                  {sub.namaMapel} ({sub.kodeMapel})
                </option>
              ))}
            </select>
          </div>
        </div>
      )}

      {/* ── STEP 1: UPLOAD ── */}
      {step === "upload" && (
        <div
          onDrop={handleDrop}
          onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
          onDragLeave={() => setIsDragging(false)}
          onClick={() => fileInputRef.current?.click()}
          className={`
            relative rounded-2xl border-2 border-dashed transition-all duration-200
            flex flex-col items-center justify-center gap-3 py-16 cursor-pointer
            ${isDragging
              ? "border-indigo-500 bg-indigo-500/10 scale-[1.01]"
              : "border-slate-800 bg-slate-900/30 hover:border-slate-700 hover:bg-slate-900/50"}
          `}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".xlsx,.xls"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) processExcelFile(f);
            }}
          />
          <div className="w-14 h-14 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center">
            <Upload className="h-6 w-6 text-indigo-400" />
          </div>
          <div className="text-center">
            <p className="text-sm font-semibold text-slate-200">
              Drag & drop file Excel di sini
            </p>
            <p className="text-xs text-slate-500 mt-1">
              atau klik untuk mencari berkas komputer (.xlsx, .xls)
            </p>
          </div>
        </div>
      )}

      {/* ── STEP 3: PREVIEW & VALIDATE ── */}
      {step === "preview" && (
        <div className="space-y-6">
          <div className="rounded-2xl border border-slate-800/60 bg-slate-900/60 p-5 space-y-4">
            {/* Sheet Tabs */}
            <div className="flex flex-col gap-3 md:flex-row md:items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2 shrink-0">
                <FileSpreadsheet className="text-emerald-400 h-5 w-5 shrink-0" />
                <h4 className="text-sm font-bold text-white whitespace-nowrap">Validasi & Pratinjau Nilai</h4>
              </div>
              <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-lg overflow-x-auto max-w-full no-scrollbar">
                {sheets.map((sheet, idx) => {
                  if (!sheet.isSelected) return null;
                  const hasErr = sheet.validationErrors.length > 0;
                  return (
                    <button
                      key={sheet.sheetName}
                      onClick={() => setCurrentSheetIdx(idx)}
                      className={`px-3 py-1 rounded-md text-[10px] font-bold uppercase transition-all flex items-center gap-1 shrink-0 ${
                        currentSheetIdx === idx
                          ? "bg-slate-800 text-white"
                          : "text-slate-500 hover:text-slate-350"
                      }`}
                    >
                      <span className="whitespace-nowrap">{sheet.sheetName}</span>
                      {hasErr && <AlertCircle size={10} className="text-rose-400 shrink-0" />}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Error panel jika ada error validasi */}
            {sheets[currentSheetIdx]?.validationErrors && sheets[currentSheetIdx]!.validationErrors.length > 0 && (
              <div className="p-3.5 rounded-xl border border-rose-500/20 bg-rose-500/5 space-y-1">
                <p className="text-xs font-bold text-rose-400 flex items-center gap-1">
                  <AlertTriangle size={14} />
                  Ditemukan {sheets[currentSheetIdx]!.validationErrors.length} Kesalahan Validasi:
                </p>
                <div className="max-h-24 overflow-y-auto text-[10px] font-mono text-rose-350 pl-4 list-disc space-y-0.5 leading-relaxed">
                  {sheets[currentSheetIdx]!.validationErrors.map((err, i) => (
                    <p key={i}>• {err}</p>
                  ))}
                </div>
              </div>
            )}

            {/* Table Preview */}
            <div className="overflow-x-auto border border-slate-800 rounded-xl max-h-[300px]">
              <table className="w-full text-xs text-left">
                <thead>
                  <tr className="border-b border-slate-800 bg-slate-950/40 text-slate-400">
                    <th className="px-3 py-2">Baris</th>
                    {dbFields.map((f) => (
                      <th key={f.key} className="px-3 py-2 whitespace-nowrap">
                        {f.label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/40 text-slate-300">
                  {sheets[currentSheetIdx]?.rows.slice(0, 10).map((row, idx) => (
                    <tr key={idx} className="hover:bg-white/[0.01]">
                      <td className="px-3 py-2 text-slate-500">{idx + 1}</td>
                      {dbFields.map((f) => {
                        const excelHeader = sheets[currentSheetIdx]!.columnMap[f.key];
                        const val = excelHeader ? row[excelHeader] : "";
                        return (
                          <td key={f.key} className="px-3 py-2 whitespace-nowrap">
                            {val === "" ? (
                              <span className="text-slate-700">—</span>
                            ) : (
                              val
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {sheets[currentSheetIdx] && sheets[currentSheetIdx]!.rows.length > 10 && (
              <p className="text-[10px] text-slate-500 text-center">
                Menampilkan 10 baris pertama dari total {sheets[currentSheetIdx]!.rows.length} baris.
              </p>
            )}
          </div>

          {/* Advanced toggle */}
          <div className="pt-1">
            <button
              type="button"
              onClick={() => setShowAdvanced(!showAdvanced)}
              className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-300 font-semibold transition-colors cursor-pointer"
            >
              <Settings size={13} className={showAdvanced ? "animate-spin" : ""} />
              <span>{showAdvanced ? "Sembunyikan Pengaturan Lanjut" : "Sesuaikan Kelas & Pemetaan Kolom (Tingkat Lanjut)"}</span>
            </button>
          </div>

          {/* Advanced Panel */}
          {showAdvanced && (
            <div className="rounded-2xl border border-slate-800/60 bg-slate-900/60 p-5 space-y-4 fade-in">
              <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
                <Settings className="text-indigo-400 h-5 w-5" />
                <h4 className="text-sm font-bold text-white">Konfigurasi Lembar Kerja & Kolom</h4>
              </div>

              {/* Sheets List */}
              <div className="space-y-3">
                {sheets.map((sheet, idx) => (
                  <div key={sheet.sheetName} className="p-4 rounded-xl border border-slate-800 bg-slate-950/40 space-y-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <input
                          type="checkbox"
                          checked={sheet.isSelected}
                          onChange={(e) => {
                            const updated = [...sheets];
                            updated[idx]!.isSelected = e.target.checked;
                            const validated = validateSheets(updated);
                            setSheets(validated);

                            // If currently previewed sheet is deselected, find another selected one
                            if (!e.target.checked && currentSheetIdx === idx) {
                              const firstSelected = validated.findIndex(s => s.isSelected);
                              if (firstSelected !== -1) {
                                setCurrentSheetIdx(firstSelected);
                              }
                            }
                          }}
                          className="rounded border-slate-800 text-indigo-600 bg-slate-950 focus:ring-indigo-500"
                        />
                        <div>
                          <p className="text-xs font-semibold text-slate-200">{sheet.sheetName}</p>
                          <p className="text-[10px] text-slate-500 mt-0.5">{sheet.rows.length} baris data terdeteksi</p>
                        </div>
                      </div>

                      {sheet.isSelected && (
                        <div className="flex items-center gap-2">
                          <label className="text-[10px] uppercase font-bold text-slate-500">Target Kelas:</label>
                          <select
                            value={sheet.targetClassId}
                            onChange={(e) => {
                              const updated = [...sheets];
                              updated[idx]!.targetClassId = e.target.value;
                              const validated = validateSheets(updated);
                              setSheets(validated);
                            }}
                            className="bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1 text-xs text-slate-350 outline-none"
                          >
                            <option value="">-- Pilih Kelas --</option>
                            {classes.map((c) => (
                              <option key={c.id} value={c.id}>
                                {c.namaKelas}
                              </option>
                            ))}
                          </select>
                        </div>
                      )}
                    </div>

                    {/* Mapping Kolom UI */}
                    {sheet.isSelected && (
                      <div className="pt-3 border-t border-slate-800/60">
                        <p className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500 mb-2">Pemetaan Kolom Excel:</p>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                          {dbFields.map((field) => (
                            <div key={field.key} className="space-y-1">
                              <label className="text-[9px] font-bold text-slate-400 block truncate">{field.label}</label>
                              <select
                                value={sheet.columnMap[field.key] || ""}
                                onChange={(e) => {
                                  const updated = [...sheets];
                                  updated[idx]!.columnMap[field.key] = e.target.value;
                                  const validated = validateSheets(updated);
                                  setSheets(validated);
                                }}
                                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2 py-1 text-[10px] text-slate-300 outline-none"
                              >
                                <option value="">-- Skip Kolom --</option>
                                {sheet.headers.map((h) => (
                                  <option key={h} value={h}>
                                    {h}
                                  </option>
                                ))}
                              </select>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-between">
            <button
              onClick={() => { setFile(null); setSheets([]); setStep("upload"); }}
              className="px-4 py-2 border border-slate-800 text-slate-400 hover:text-white rounded-xl text-xs font-semibold transition-colors"
            >
              Kembali
            </button>
            <button
              onClick={handleStartImport}
              disabled={sheets.some((s) => s.isSelected && s.validationErrors.length > 0) || !sheets.some((s) => s.isSelected)}
              className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors"
            >
              <Play size={12} />
              <span>Simpan ke Database (Supabase)</span>
            </button>
          </div>
        </div>
      )}

      {/* ── STEP 4: IMPORTING ── */}
      {step === "importing" && (
        <div className="rounded-2xl border border-slate-800/60 bg-slate-900/60 p-8 text-center space-y-4">
          <Loader2 className="animate-spin text-indigo-400 h-8 w-8 mx-auto" />
          <div>
            <h4 className="text-sm font-bold text-white">Sedang Mengimpor Data...</h4>
            <p className="text-xs text-slate-400 mt-1">
              Impor sheet: <span className="font-semibold text-indigo-300">{importProgress.sheetName}</span> ({importProgress.current}/{importProgress.total})
            </p>
          </div>

          {/* Progress Bar */}
          <div className="max-w-xs mx-auto h-2 bg-slate-950 rounded-full overflow-hidden">
            <div
              className="h-full bg-indigo-500 rounded-full transition-all duration-300"
              style={{ width: `${(importProgress.current / importProgress.total) * 100}%` }}
            />
          </div>
        </div>
      )}

      {/* ── STEP 5: RESULT ── */}
      {step === "result" && importResult && (
        <div className="space-y-6">
          <div className={`
            rounded-2xl border p-5 space-y-4
            ${importResult.ok
              ? "border-emerald-500/30 bg-emerald-500/5"
              : "border-rose-500/30 bg-rose-500/5"}
          `}>
            {/* Status Summary */}
            <div className="flex items-start gap-3">
              {importResult.ok ? (
                <CheckCircle size={18} className="text-emerald-400 mt-0.5 shrink-0" />
              ) : (
                <AlertCircle size={18} className="text-rose-400 mt-0.5 shrink-0" />
              )}
              <div>
                <h4 className={`text-sm font-bold ${importResult.ok ? "text-emerald-300" : "text-rose-300"}`}>
                  {importResult.message}
                </h4>
                <p className="text-xs text-slate-500 mt-0.5">Semua data sheet yang dipilih selesai diproses.</p>
              </div>
            </div>

            {/* Per-sheet Results */}
            {importResult.sheets && (
              <div className="space-y-2 pt-2">
                {importResult.sheets.map((s) => (
                  <div key={s.sheet} className="rounded-xl bg-white/[0.02] border border-slate-800 overflow-hidden">
                    <button
                      onClick={() => setExpandedLogs((p) => ({ ...p, [s.sheet]: !p[s.sheet] }))}
                      className="w-full flex items-center justify-between px-4 py-3 hover:bg-white/[0.02] transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        {expandedLogs[s.sheet] ? (
                          <ChevronDown size={14} className="text-slate-500" />
                        ) : (
                          <ChevronRight size={14} className="text-slate-500" />
                        )}
                        <span className="text-xs font-semibold text-slate-200">{s.sheet}</span>
                        <span className="text-[10px] text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full font-bold">
                          ✓ {s.success} sukses
                        </span>
                        {s.skipped > 0 && (
                          <span className="text-[10px] text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-full font-bold">
                            ⚠ {s.skipped} skip
                          </span>
                        )}
                        {s.errors.length > 0 && (
                          <span className="text-[10px] text-rose-400 bg-rose-500/10 px-2 py-0.5 rounded-full font-bold">
                            ✗ {s.errors.length} error
                          </span>
                        )}
                      </div>
                    </button>

                    {expandedLogs[s.sheet] && s.errors.length > 0 && (
                      <div className="px-4 pb-3 space-y-1.5 border-t border-slate-900/60 pt-2.5">
                        <p className="text-[10px] font-bold text-rose-300">Detail Log Error:</p>
                        <div className="max-h-32 overflow-y-auto text-[10px] font-mono text-rose-300/80 space-y-1 pl-4 list-disc leading-relaxed">
                          {s.errors.map((err, i) => (
                            <p key={i}>• {err}</p>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Reset Button */}
          <div className="flex justify-end">
            <button
              onClick={() => {
                setStep("upload");
                setFile(null);
                setSheets([]);
                setImportResult(null);
              }}
              className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold transition-colors"
            >
              Import File Baru
            </button>
          </div>
        </div>
      )}

    </div>
  );
}
