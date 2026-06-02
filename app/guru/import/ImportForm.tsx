// =============================================================================
// FILE: app/guru/import/ImportForm.tsx
// TUJUAN: Form upload Excel — Client Component.
//         - Drag & drop zone dengan visual feedback
//         - Preview nama file & ukuran sebelum upload
//         - Progress bar + log hasil import per sheet
//         - Memanggil POST /api/import-excel
// =============================================================================

"use client";

import { useState, useRef, useCallback, useTransition } from "react";
import {
  Upload, FileSpreadsheet, X, CheckCircle, AlertCircle,
  Loader2, ChevronDown, ChevronRight
} from "lucide-react";

// ─── TYPES ────────────────────────────────────────────────────────────────────

interface SheetResult {
  sheet:   string;
  success: number;
  skipped: number;
  errors:  string[];
}

interface ImportResult {
  ok:      boolean;
  message: string;
  sheets?: SheetResult[];
  error?:  string;
}

// ─── MAIN COMPONENT ───────────────────────────────────────────────────────────

export default function ImportForm() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isPending, startTransition] = useTransition();
  const [file,       setFile]   = useState<File | null>(null);
  const [isDragging, setDragging] = useState(false);
  const [result,     setResult] = useState<ImportResult | null>(null);
  const [expanded,   setExpanded] = useState<Record<string, boolean>>({});
  const [semester,   setSemester] = useState("Genap");
  const [tahunAjaran, setTahunAjaran] = useState("2025/2026");

  // ── File handlers ────────────────────────────────────────────────────────

  function handleFile(f: File) {
    if (!f.name.endsWith(".xlsx") && !f.name.endsWith(".xls")) {
      setResult({ ok: false, message: "Hanya file Excel (.xlsx / .xls) yang didukung.", error: "FORMAT" });
      return;
    }
    setFile(f);
    setResult(null);
  }

  const onDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragging(false);
    const f = e.dataTransfer.files[0];
    if (f) handleFile(f);
  }, []);

  function onDragOver(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setDragging(true);
  }

  // ── Submit ───────────────────────────────────────────────────────────────

  function handleSubmit() {
    if (!file) return;

    startTransition(async () => {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("semester", semester);
      formData.append("tahunAjaran", tahunAjaran);

      try {
        const res  = await fetch("/api/import-excel", { method: "POST", body: formData });
        const data = (await res.json()) as ImportResult;
        setResult(data);
      } catch {
        setResult({ ok: false, message: "Gagal menghubungi server.", error: "NETWORK" });
      }
    });
  }

  const formatSize = (bytes: number) =>
    bytes > 1024 * 1024
      ? `${(bytes / 1024 / 1024).toFixed(1)} MB`
      : `${(bytes / 1024).toFixed(0)} KB`;

  return (
    <div className="space-y-4">

      {/* ── SETTINGS ──────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-slate-400">Tahun Ajaran</label>
          <input 
            type="text" 
            value={tahunAjaran} 
            onChange={(e) => setTahunAjaran(e.target.value)}
            className="w-full bg-slate-900/50 border border-slate-700/60 rounded-xl px-3 py-2.5 text-sm text-slate-200 outline-none focus:border-indigo-500 focus:bg-slate-900 transition-colors"
            placeholder="Contoh: 2025/2026"
          />
        </div>
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-slate-400">Semester</label>
          <select 
            value={semester}
            onChange={(e) => setSemester(e.target.value)}
            className="w-full bg-slate-900/50 border border-slate-700/60 rounded-xl px-3 py-2.5 text-sm text-slate-200 outline-none focus:border-indigo-500 focus:bg-slate-900 transition-colors"
          >
            <option value="Ganjil">Ganjil</option>
            <option value="Genap">Genap</option>
          </select>
        </div>
      </div>

      {/* ── DROP ZONE ─────────────────────────────────────────────────── */}
      <div
        id="excel-drop-zone"
        role="button"
        tabIndex={0}
        onDrop={onDrop}
        onDragOver={onDragOver}
        onDragLeave={() => setDragging(false)}
        onKeyDown={(e) => e.key === "Enter" && inputRef.current?.click()}
        onClick={() => inputRef.current?.click()}
        className={`
          relative rounded-2xl border-2 border-dashed transition-all duration-200
          flex flex-col items-center justify-center gap-3 py-14 cursor-pointer
          ${isDragging
            ? "border-indigo-400 bg-indigo-500/10 scale-[1.01]"
            : file
            ? "border-emerald-500/40 bg-emerald-500/5"
            : "border-slate-700/60 bg-slate-900/40 hover:border-slate-600 hover:bg-slate-900/60"}
        `}
      >
        <input
          ref={inputRef}
          type="file"
          accept=".xlsx,.xls"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) handleFile(f);
          }}
        />

        {file ? (
          <>
            <div className="w-14 h-14 rounded-2xl bg-emerald-500/15 flex items-center justify-center border border-emerald-500/30">
              <FileSpreadsheet size={28} className="text-emerald-400" />
            </div>
            <div className="text-center">
              <p className="font-semibold text-emerald-300 text-sm">{file.name}</p>
              <p className="text-xs text-slate-500 mt-0.5">{formatSize(file.size)}</p>
            </div>
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); setFile(null); setResult(null); }}
              className="absolute top-3 right-3 p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-slate-200 transition-colors"
              aria-label="Hapus file"
            >
              <X size={14} />
            </button>
          </>
        ) : (
          <>
            <div className="w-14 h-14 rounded-2xl bg-slate-800/80 flex items-center justify-center border border-slate-700/60">
              <Upload size={24} className="text-slate-500" />
            </div>
            <div className="text-center">
              <p className="font-semibold text-slate-300 text-sm">
                {isDragging ? "Lepaskan file di sini" : "Drag & drop file Excel"}
              </p>
              <p className="text-xs text-slate-600 mt-0.5">
                atau klik untuk memilih · <span className="text-indigo-400">NilaiGenap2526.xlsx</span>
              </p>
            </div>
          </>
        )}
      </div>

      {/* ── TOMBOL IMPORT ─────────────────────────────────────────────── */}
      <button
        id="import-submit-btn"
        type="button"
        onClick={handleSubmit}
        disabled={!file || isPending}
        className={`
          w-full py-3 px-6 rounded-xl font-semibold text-sm
          flex items-center justify-center gap-2
          transition-all duration-200
          disabled:opacity-50 disabled:cursor-not-allowed
        `}
        style={{
          background: !file || isPending
            ? "rgba(99,102,241,0.3)"
            : "linear-gradient(135deg, #6366f1, #4f46e5)",
          boxShadow: !file || isPending ? "none" : "0 4px 20px rgba(99,102,241,0.3)",
          color: "white",
        }}
      >
        {isPending ? (
          <>
            <Loader2 size={16} className="animate-spin" />
            Memproses data...
          </>
        ) : (
          <>
            <Upload size={16} />
            {file ? `Import "${file.name}"` : "Pilih file terlebih dahulu"}
          </>
        )}
      </button>

      {/* ── HASIL IMPORT ──────────────────────────────────────────────── */}
      {result && (
        <div className={`
          rounded-2xl border p-5 space-y-4
          ${result.ok
            ? "border-emerald-500/30 bg-emerald-500/5"
            : "border-rose-500/30 bg-rose-500/5"}
        `}>
          {/* Summary */}
          <div className="flex items-start gap-3">
            {result.ok
              ? <CheckCircle size={18} className="text-emerald-400 mt-0.5 shrink-0" />
              : <AlertCircle size={18} className="text-rose-400 mt-0.5 shrink-0" />
            }
            <div>
              <p className={`font-semibold text-sm ${result.ok ? "text-emerald-300" : "text-rose-300"}`}>
                {result.message}
              </p>
              {result.error && (
                <p className="text-xs text-rose-400/70 mt-0.5">{result.error}</p>
              )}
            </div>
          </div>

          {/* Per-sheet detail */}
          {result.sheets && result.sheets.length > 0 && (
            <div className="space-y-2">
              {result.sheets.map((s) => (
                <div key={s.sheet} className="rounded-xl bg-white/[0.03] border border-white/5 overflow-hidden">
                  <button
                    type="button"
                    onClick={() => setExpanded((p) => ({ ...p, [s.sheet]: !p[s.sheet] }))}
                    className="w-full flex items-center justify-between px-4 py-3 hover:bg-white/[0.03] transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      {expanded[s.sheet]
                        ? <ChevronDown size={14} className="text-slate-500" />
                        : <ChevronRight size={14} className="text-slate-500" />
                      }
                      <span className="text-sm font-semibold text-slate-200">{s.sheet}</span>
                      <span className="text-xs text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full">
                        ✓ {s.success}
                      </span>
                      {s.skipped > 0 && (
                        <span className="text-xs text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-full">
                          ⚠ {s.skipped} skip
                        </span>
                      )}
                      {s.errors.length > 0 && (
                        <span className="text-xs text-rose-400 bg-rose-500/10 px-2 py-0.5 rounded-full">
                          ✗ {s.errors.length} error
                        </span>
                      )}
                    </div>
                  </button>

                  {expanded[s.sheet] && s.errors.length > 0 && (
                    <div className="px-4 pb-3 space-y-1">
                      {s.errors.map((err, i) => (
                        <p key={i} className="text-xs text-rose-300/70 pl-5">{err}</p>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
