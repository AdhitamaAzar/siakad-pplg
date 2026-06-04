"use client";

// =============================================================================
// FILE: app/guru/nilai/NilaiClientPage.tsx
// TUJUAN: Client component untuk halaman rekap nilai guru.
//         Menampilkan tabel nilai + tombol Edit tiap baris.
//         Klik Edit → modal input 9 komponen nilai + auto-kalkulasi preview.
// =============================================================================

import { useState, useTransition, useEffect } from "react";
import Link from "next/link";
import { Pencil, X, Save, Loader2, CheckCircle2, AlertCircle, Settings } from "lucide-react";
import BobotModal from "./BobotModal";

interface SubjectWithWeights {
  id: number;
  namaMapel: string;
  kodeMapel: string;
  weightGithub: number;
  weightApi: number;
  weightAdminPanel: number;
  weightLandingPage: number;
  weightKagglePython: number;
  weightKaggleSql: number;
  weightKaggleMl: number;
  weightUjianMl: number;
  weightUjianSql: number;
  activeGithub: boolean;
  activeApi: boolean;
  activeAdminPanel: boolean;
  activeLandingPage: boolean;
  activeKagglePython: boolean;
  activeKaggleSql: boolean;
  activeKaggleMl: boolean;
  activeUjianMl: boolean;
  activeUjianSql: boolean;
}

const getKomponen = (isRpl: boolean) => [
  { key: "nilaiGithub" as const,      label: isRpl ? "Github" : "Tugas 1",        desc: isRpl ? "Portfolio / Link GitHub" : "Tugas 1" },
  { key: "nilaiApi" as const,         label: isRpl ? "Tugas API" : "Tugas 2",     desc: isRpl ? "Tugas pembuatan API" : "Tugas 2" },
  { key: "nilaiAdminPanel" as const,  label: isRpl ? "Admin Panel" : "Tugas 3",   desc: isRpl ? "Tugas Admin Panel" : "Tugas 3" },
  { key: "nilaiLandingPage" as const, label: isRpl ? "Landing Page" : "Tugas 4",  desc: isRpl ? "Link Landing Page" : "Tugas 4" },
  { key: "nilaiKagglePython" as const,label: isRpl ? "Kaggle Python" : "Tugas 5", desc: isRpl ? "Kaggle Intro to Python" : "Tugas 5" },
  { key: "nilaiKaggleSql" as const,   label: isRpl ? "Kaggle SQL" : "Tugas 6",    desc: isRpl ? "Kaggle Intro to SQL" : "Tugas 6" },
  { key: "nilaiKaggleMl" as const,    label: isRpl ? "Kaggle ML" : "Tugas 7",     desc: isRpl ? "Kaggle Machine Learning" : "Tugas 7" },
  { key: "nilaiUjianMl" as const,     label: isRpl ? "Ujian ML" : "Ujian 1",      desc: isRpl ? "Ujian Online Machine Learning" : "Ujian 1" },
  { key: "nilaiUjianSql" as const,    label: isRpl ? "Ujian SQL" : "Ujian 2",     desc: isRpl ? "Ujian Online SQL" : "Ujian 2" },
] as const;

type KomponenKey = ReturnType<typeof getKomponen>[number]["key"];

interface GradeData {
  nilaiGithub?: number | null;
  nilaiApi?: number | null;
  nilaiAdminPanel?: number | null;
  nilaiLandingPage?: number | null;
  nilaiKagglePython?: number | null;
  nilaiKaggleSql?: number | null;
  nilaiKaggleMl?: number | null;
  nilaiUjianMl?: number | null;
  nilaiUjianSql?: number | null;
  rataRata?: number | null;
  nilaiRaport?: number | null;
  predikat?: string | null;
}

interface Student {
  id: number;
  nama: string;
  nis: string;
  grades: GradeData[];
}

interface Props {
  kelasList: { id: number; namaKelas: string }[];
  subjectsList: SubjectWithWeights[];
  students: Student[];
  activeKelasId: number | undefined;
  activeSubjectId: number | undefined;
  semester: string;
  tahunAjaran: string;
}

function nilaiColor(nilai: number | null | undefined) {
  if (!nilai) return "text-slate-600";
  if (nilai >= 90) return "text-emerald-400";
  if (nilai >= 75) return "text-indigo-300";
  if (nilai >= 60) return "text-amber-400";
  return "text-rose-400";
}

function Cell({ nilai }: { nilai: number | null | undefined }) {
  if (!nilai) return <td className="px-2 py-2.5 text-center text-slate-700 text-xs">—</td>;
  return (
    <td className={`px-2 py-2.5 text-center text-xs font-semibold tabular-nums ${nilaiColor(nilai)}`}>
      {nilai}
    </td>
  );
}


/** Hitung preview rata-rata dari form values secara berbobot */
function hitungPreview(
  form: Record<string, string>,
  komponen: readonly any[],
  subject: SubjectWithWeights | undefined
): { rata: number | null; raport: number | null } {
  if (!subject) return { rata: null, raport: null };

  let weightedSum = 0;
  let activeWeightSum = 0;

  for (const k of komponen) {
    const activeKey = k.key.replace("nilai", "active");
    const weightKey = k.key.replace("nilai", "weight");

    const isActive = subject[activeKey as keyof SubjectWithWeights];
    if (isActive) {
      const valStr = form[k.key];
      if (valStr !== "" && valStr !== null && valStr !== undefined) {
        const val = Number(valStr);
        const weight = subject[weightKey as keyof SubjectWithWeights] as number;
        if (!isNaN(val) && val >= 0) {
          weightedSum += val * weight;
          activeWeightSum += weight;
        }
      }
    }
  }

  if (activeWeightSum === 0) return { rata: null, raport: null };
  const rata = Math.round((weightedSum / activeWeightSum) * 10) / 10;
  return { rata, raport: Math.round(rata) };
}

// ─── MODAL EDIT NILAI ──────────────────────────────────────────────────────────
function EditModal({
  student,
  isRpl,
  subject,
  onClose,
  onSaved,
}: {
  student: Student;
  isRpl: boolean;
  subject: SubjectWithWeights | undefined;
  onClose: () => void;
  onSaved: (studentId: number, grade: GradeData) => void;
}) {
  const grade = student.grades[0] ?? {};
  const komponen = getKomponen(isRpl);

  const initialForm: Record<string, string> = {};
  for (const k of komponen) {
    const v = grade[k.key as KomponenKey];
    initialForm[k.key] = v != null ? String(v) : "";
  }

  const [form, setForm] = useState<Record<string, string>>(initialForm);
  const [isPending, startTransition] = useTransition();
  const [status, setStatus] = useState<"idle" | "ok" | "err">("idle");
  const [errMsg, setErrMsg] = useState("");

  const preview = hitungPreview(form, komponen, subject);

  function predikatLabel(n: number | null) {
    if (!n) return "—";
    if (n >= 90) return "Sangat Baik";
    if (n >= 75) return "Baik";
    if (n >= 60) return "Cukup";
    return "Perlu Bimbingan";
  }

  function handleChange(key: string, val: string) {
    // Hanya izinkan angka 0-100
    if (val !== "" && (isNaN(Number(val)) || Number(val) < 0 || Number(val) > 100)) return;
    setForm((f) => ({ ...f, [key]: val }));
    if (status !== "idle") setStatus("idle");
  }

  function handleSave() {
    startTransition(async () => {
      try {
        const res = await fetch("/api/guru/nilai", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ studentId: student.id, subjectId: subject?.id, ...form }),
        });
        const json = await res.json();
        if (!res.ok || !json.ok) throw new Error(json.error ?? "Gagal menyimpan nilai.");
        setStatus("ok");
        onSaved(student.id, json.grade);
        setTimeout(onClose, 800);
      } catch (e: any) {
        setStatus("err");
        setErrMsg(e.message);
      }
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative z-10 w-full max-w-lg bg-slate-900 border border-slate-700/60 rounded-2xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800">
          <div>
            <h2 className="text-white font-bold text-base">Input Nilai</h2>
            <p className="text-slate-400 text-xs mt-0.5">{student.nama} · {student.nis}</p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-500 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        {/* Form */}
        <div className="px-6 py-5 space-y-3 max-h-[60vh] overflow-y-auto">
          <div className="grid grid-cols-2 gap-3">
            {komponen.map((k) => {
              const activeKey = k.key.replace("nilai", "active");
              const weightKey = k.key.replace("nilai", "weight");
              const isActive = subject ? subject[activeKey as keyof SubjectWithWeights] : true;
              const weight = subject ? subject[weightKey as keyof SubjectWithWeights] : 0;

              if (!isActive) return null;

              return (
                <div key={k.key}>
                  <label className="block text-xs font-medium text-slate-400 mb-1 flex items-center justify-between">
                    <span>
                      {k.label} <span className="text-slate-600 font-normal ml-1">({k.desc})</span>
                    </span>
                    <span className="text-xs text-indigo-400 font-semibold bg-indigo-500/10 px-1.5 py-0.5 rounded">
                      {weight}%
                    </span>
                  </label>
                  <input
                    id={`input-${k.key}`}
                    type="number"
                    min={0}
                    max={100}
                    placeholder="—"
                    value={form[k.key]}
                    onChange={(e) => handleChange(k.key, e.target.value)}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white text-sm
                      placeholder:text-slate-700 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/40
                      tabular-nums transition-all"
                  />
                </div>
              );
            })}
          </div>
        </div>

        {/* Preview kalkulasi */}
        <div className="mx-6 mb-4 p-3 bg-slate-800/60 border border-slate-700/40 rounded-xl flex items-center gap-6">
          <div className="text-center flex-1">
            <p className="text-xs text-slate-500 mb-0.5">Rata-rata</p>
            <p className={`text-xl font-bold tabular-nums ${nilaiColor(preview.rata)}`}>
              {preview.rata?.toFixed(1) ?? "—"}
            </p>
          </div>
          <div className="w-px h-10 bg-slate-700" />
          <div className="text-center flex-1">
            <p className="text-xs text-slate-500 mb-0.5">Nilai Raport</p>
            <p className={`text-xl font-bold tabular-nums ${nilaiColor(preview.raport)}`}>
              {preview.raport ?? "—"}
            </p>
          </div>
          <div className="w-px h-10 bg-slate-700" />
          <div className="text-center flex-1">
            <p className="text-xs text-slate-500 mb-0.5">Predikat</p>
            <p className="text-sm font-semibold text-slate-300">
              {predikatLabel(preview.raport)}
            </p>
          </div>
        </div>

        {/* Status */}
        {status === "err" && (
          <div className="mx-6 mb-3 flex items-center gap-2 text-rose-400 text-xs bg-rose-500/10 border border-rose-500/20 rounded-xl px-3 py-2">
            <AlertCircle size={13} />
            {errMsg}
          </div>
        )}
        {status === "ok" && (
          <div className="mx-6 mb-3 flex items-center gap-2 text-emerald-400 text-xs bg-emerald-500/10 border border-emerald-500/20 rounded-xl px-3 py-2">
            <CheckCircle2 size={13} />
            Nilai berhasil disimpan!
          </div>
        )}

        {/* Footer actions */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-slate-800">
          <button
            onClick={onClose}
            disabled={isPending}
            className="px-4 py-2 rounded-xl text-sm font-medium text-slate-400 hover:text-white border border-slate-700 hover:border-slate-600 transition-all disabled:opacity-50"
          >
            Batal
          </button>
          <button
            id="btn-simpan-nilai"
            onClick={handleSave}
            disabled={isPending || status === "ok"}
            className="px-5 py-2 rounded-xl text-sm font-semibold bg-indigo-600 hover:bg-indigo-500 text-white
              transition-all flex items-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {isPending ? (
              <><Loader2 size={14} className="animate-spin" /> Menyimpan...</>
            ) : status === "ok" ? (
              <><CheckCircle2 size={14} /> Tersimpan</>
            ) : (
              <><Save size={14} /> Simpan Nilai</>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── MAIN PAGE ─────────────────────────────────────────────────────────────────
export default function NilaiClientPage({
  kelasList,
  subjectsList,
  students: initialStudents,
  activeKelasId,
  activeSubjectId,
  semester,
  tahunAjaran,
}: Props) {
  const [students, setStudents] = useState<Student[]>(initialStudents);
  const [subjects, setSubjects] = useState<SubjectWithWeights[]>(subjectsList);
  const [editStudent, setEditStudent] = useState<Student | null>(null);
  const [isBobotOpen, setIsBobotOpen] = useState(false);

  // Search & Filter State
  const [searchQuery, setSearchQuery] = useState("");
  const [sortField, setSortField] = useState<"nama" | "rataRata" | "nilaiRaport">("nama");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  useEffect(() => {
    setStudents(initialStudents);
  }, [initialStudents]);

  const activeSubject = subjects.find((s) => s.id === activeSubjectId);
  const isRpl = activeSubject ? activeSubject.kodeMapel.toLowerCase().includes("pplg") : true;
  const komponen = getKomponen(isRpl);

  // Filter komponen yang aktif saja untuk ditunjukkan di tabel
  const activeKomponen = komponen.filter((k) => {
    const activeKey = k.key.replace("nilai", "active");
    return activeSubject ? activeSubject[activeKey as keyof SubjectWithWeights] : true;
  });

  function handleSaved(studentId: number, newGrade: GradeData) {
    setStudents((prev) =>
      prev.map((s) =>
        s.id === studentId ? { ...s, grades: [newGrade] } : s
      )
    );
  }

  // 1. Search filter
  const filteredStudents = students.filter((s) => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return true;
    return s.nama.toLowerCase().includes(q) || s.nis.includes(q);
  });

  // 2. Sort
  const sortedStudents = [...filteredStudents].sort((a, b) => {
    const ga = a.grades[0];
    const gb = b.grades[0];

    let valA: any = "";
    let valB: any = "";

    if (sortField === "nama") {
      valA = a.nama.toLowerCase();
      valB = b.nama.toLowerCase();
    } else if (sortField === "rataRata") {
      valA = ga?.rataRata ?? -1;
      valB = gb?.rataRata ?? -1;
    } else if (sortField === "nilaiRaport") {
      valA = ga?.nilaiRaport ?? -1;
      valB = gb?.nilaiRaport ?? -1;
    }

    if (valA < valB) return sortOrder === "asc" ? -1 : 1;
    if (valA > valB) return sortOrder === "asc" ? 1 : -1;
    return 0;
  });

  // 3. Paginate
  const totalItems = sortedStudents.length;
  const totalPages = Math.ceil(totalItems / pageSize) || 1;
  const activePage = Math.min(currentPage, totalPages);
  const paginatedStudents = sortedStudents.slice(
    (activePage - 1) * pageSize,
    (activePage - 1) * pageSize + pageSize
  );

  const handleSort = (field: "nama" | "rataRata" | "nilaiRaport") => {
    if (sortField === field) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortOrder(field === "nama" ? "asc" : "desc");
    }
    setCurrentPage(1);
  };

  const handleExportExcel = async () => {
    const XLSX = await import("xlsx");
    const exportData = sortedStudents.map((s, index) => {
      const g = s.grades[0];
      const row: any = {
        No: index + 1,
        NIS: s.nis,
        Nama: s.nama,
      };

      activeKomponen.forEach((k) => {
        row[k.label] = g ? (g[k.key as KomponenKey] ?? "—") : "—";
      });

      row["Rata-rata"] = g?.rataRata ?? "—";
      row["Nilai Raport"] = g?.nilaiRaport ?? "—";
      row["Predikat"] = g?.predikat ?? "—";

      return row;
    });

    const worksheet = XLSX.utils.json_to_sheet(exportData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Rekap Nilai");

    const wscols = [
      { wch: 5 },
      { wch: 15 },
      { wch: 30 },
      ...activeKomponen.map(() => ({ wch: 12 })),
      { wch: 10 },
      { wch: 12 },
      { wch: 15 },
    ];
    worksheet["!cols"] = wscols;

    const kelasName = kelasList.find((k) => k.id === activeKelasId)?.namaKelas ?? "Kelas";
    const mapelName = activeSubject ? activeSubject.kodeMapel : "Mapel";
    const fileName = `Rekap_Nilai_${kelasName.replace(/\s+/g, "_")}_${mapelName}_${semester}_${tahunAjaran.replace(/\//g, "-")}.xlsx`;
    XLSX.writeFile(workbook, fileName);
  };

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: `
        @media print {
          body {
            background: white !important;
            color: black !important;
          }
          nav, sidebar, header, .no-print, button, input, select {
            display: none !important;
          }
          .print-header {
            display: block !important;
          }
          .main-content {
            margin: 0 !important;
            padding: 0 !important;
          }
          table {
            width: 100% !important;
            border-collapse: collapse !important;
            color: black !important;
            background: white !important;
          }
          th, td {
            border: 1px solid #333 !important;
            padding: 6px 4px !important;
            font-size: 10px !important;
            color: black !important;
            background: white !important;
            text-align: center !important;
          }
          th {
            background-color: #f3f4f6 !important;
            font-weight: bold !important;
          }
          .sticky {
            position: static !important;
            background: white !important;
          }
        }
      `}} />

      {editStudent && (
        <EditModal
          student={editStudent}
          isRpl={isRpl}
          subject={activeSubject}
          onClose={() => setEditStudent(null)}
          onSaved={handleSaved}
        />
      )}

      {isBobotOpen && activeSubject && (
        <BobotModal
          subject={activeSubject}
          isRpl={isRpl}
          onClose={() => setIsBobotOpen(false)}
          onSaved={(updated) => {
            setSubjects((prev) => prev.map((s) => (s.id === updated.id ? updated : s)));
          }}
        />
      )}

      {/* Header Print Only */}
      <div className="hidden print-header mb-6 text-center">
        <h1 className="text-xl font-bold text-black uppercase">REKAP NILAI SISWA</h1>
        <p className="text-xs text-slate-700 mt-1">
          Semester {semester} Tahun Ajaran {tahunAjaran}
        </p>
        <p className="text-xs font-semibold text-slate-800">
          Kelas: {kelasList.find((k) => k.id === activeKelasId)?.namaKelas} · Mapel: {activeSubject?.namaMapel} ({activeSubject?.kodeMapel})
        </p>
      </div>

      <div className="space-y-5 max-w-[1360px] main-content">
        {/* Header */}
        <div className="flex items-start justify-between no-print">
          <div>
            <h1 className="text-xl font-bold text-white">Rekap Nilai</h1>
            <p className="text-slate-500 text-sm mt-1">
              Semester {semester} {tahunAjaran} ·{" "}
              {kelasList.find((k) => k.id === activeKelasId)?.namaKelas}
            </p>
          </div>
          <div className="flex items-center gap-2 text-xs text-slate-500 bg-slate-900/60 border border-slate-800 rounded-xl px-3 py-2">
            <Pencil size={12} className="text-indigo-400" />
            Klik <span className="text-indigo-300 font-medium">Edit</span> untuk input nilai
          </div>
        </div>

        {/* Tab kelas & pemilih mapel */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 no-print">
          <div className="flex gap-2 flex-wrap">
            {kelasList.map((k) => (
              <Link
                key={k.id}
                href={`/guru/nilai?kelas=${k.id}${activeSubjectId ? `&mapel=${activeSubjectId}` : ""}`}
                className={`
                  px-4 py-2 rounded-xl text-sm font-semibold border transition-all
                  ${k.id === activeKelasId
                    ? "bg-indigo-500/20 text-indigo-300 border-indigo-500/40"
                    : "bg-slate-900/60 text-slate-500 border-slate-800/60 hover:text-slate-300"}
                `}
              >
                {k.namaKelas}
              </Link>
            ))}
          </div>

          <div className="flex items-center gap-2.5 flex-wrap">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Mata Pelajaran:</span>
            <select
              value={activeSubjectId || ""}
              onChange={(e) => {
                window.location.href = `/guru/nilai?kelas=${activeKelasId}&mapel=${e.target.value}`;
              }}
              className="bg-slate-900 border border-slate-800 rounded-xl px-3 py-1.5 text-xs font-semibold text-slate-300 outline-none focus:border-indigo-500 focus:bg-slate-950 transition-colors"
            >
              {subjects.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.namaMapel} ({s.kodeMapel})
                </option>
              ))}
            </select>

            {activeSubject && (
              <button
                onClick={() => setIsBobotOpen(true)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold
                  text-indigo-400 bg-indigo-500/10 border border-indigo-500/20
                  hover:bg-indigo-500/20 hover:text-indigo-300 hover:border-indigo-500/40
                  transition-all"
              >
                <Settings size={13} />
                Bobot Nilai
              </button>
            )}
          </div>
        </div>

        {/* Toolbar Pencarian & Eksport */}
        <div className="flex flex-col md:flex-row items-center justify-between gap-4 p-4 rounded-2xl border border-slate-800/60 bg-slate-900/40 no-print">
          <div className="relative w-full md:w-80">
            <input
              type="text"
              placeholder="Cari nama atau NIS..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full pl-9 pr-4 py-2 bg-slate-800/60 border border-slate-700 rounded-xl text-white text-xs placeholder:text-slate-500 focus:outline-none focus:border-indigo-500 transition-all"
            />
            <div className="absolute left-3 top-2.5 text-slate-500">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.637 10.637z" />
              </svg>
            </div>
          </div>

          <div className="flex items-center gap-2 w-full md:w-auto justify-end">
            <button
              onClick={handleExportExcel}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white border border-emerald-500/20 hover:border-emerald-500/40 shadow-lg shadow-emerald-950/20 hover:shadow-emerald-950/40 transition-all cursor-pointer"
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v6m3-3H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Export Excel
            </button>
            <button
              onClick={() => window.print()}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-750 text-white border border-slate-700 hover:border-slate-650 transition-all cursor-pointer"
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6.72 13.829c-.24.03-.48.062-.72.096m.72-.096a42.415 42.415 0 0110.56 0m-10.56 0L6.34 18m10.94-4.171c.24.03.48.062.72.096m-.72-.096a42.42 42.42 0 01-10.56 0m10.56 0L17.66 18m0 0a2.25 2.25 0 002.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-.282.376-.769.542-1.21.38a12.035 12.035 0 01-7.143-7.143c-.162-.441.004-.928.38-1.21l1.293-.97c.363-.271.527-.734.417-1.173L6.963 3.107a1.125 1.125 0 00-1.091-.852H4.5A2.25 2.25 0 002.25 4.5v1.372c0 .516.351.966.852 1.091l4.423 1.106c.44.11.902-.055 1.173-.417l.97-1.293c.282-.376.769-.542 1.21-.38a12.035 12.035 0 017.143 7.143c.162.441-.004.928-.38 1.21l-1.293.97c-.363.271-.527.734-.417 1.173l1.106 4.423c.11.44.902.852 1.091.852z" />
              </svg>
              Cetak PDF
            </button>
          </div>
        </div>

        {/* Tabel */}
        <div className="rounded-2xl border border-slate-800/60 bg-slate-900/60 overflow-auto">
          <table className="w-full text-sm whitespace-nowrap">
            <thead>
              <tr className="border-b border-slate-800/60 select-none">
                <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-500 sticky left-0 z-10 bg-[#0c121e] w-12 min-w-[48px] max-w-[48px]">#</th>
                <th
                  onClick={() => handleSort("nama")}
                  className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-500 sticky left-[48px] z-10 bg-[#0c121e] min-w-[200px] border-r border-slate-800/80 cursor-pointer hover:bg-slate-800 hover:text-white transition-colors"
                >
                  <div className="flex items-center gap-1">
                    <span>Nama Siswa</span>
                    {sortField === "nama" && (sortOrder === "asc" ? " ▲" : " ▼")}
                  </div>
                </th>
                {activeKomponen.map((k) => {
                  const weightKey = k.key.replace("nilai", "weight");
                  const weight = activeSubject ? activeSubject[weightKey as keyof SubjectWithWeights] : 10;
                  return (
                    <th key={k.key} className="px-2 py-3 text-center text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                      <div className="flex flex-col items-center">
                        <span>{k.label}</span>
                        <span className="text-[9px] text-indigo-400 font-normal lowercase">({weight}%)</span>
                      </div>
                    </th>
                  );
                })}
                <th
                  onClick={() => handleSort("rataRata")}
                  className="px-3 py-3 text-center text-[11px] font-semibold uppercase tracking-wider text-slate-400 cursor-pointer hover:bg-slate-800 hover:text-white transition-colors"
                >
                  <div className="flex items-center justify-center gap-1">
                    <span>Avg</span>
                    {sortField === "rataRata" && (sortOrder === "asc" ? " ▲" : " ▼")}
                  </div>
                </th>
                <th
                  onClick={() => handleSort("nilaiRaport")}
                  className="px-3 py-3 text-center text-[11px] font-semibold uppercase tracking-wider text-indigo-400 cursor-pointer hover:bg-slate-800 hover:text-white transition-colors"
                >
                  <div className="flex items-center justify-center gap-1">
                    <span>Raport</span>
                    {sortField === "nilaiRaport" && (sortOrder === "asc" ? " ▲" : " ▼")}
                  </div>
                </th>
                <th className="px-3 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-500">Predikat</th>
                <th className="px-3 py-3 text-center text-[11px] font-semibold uppercase tracking-wider text-slate-600 no-print">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/40">
              {paginatedStudents.map((s, i) => {
                const g = s.grades[0] ?? null;
                const globalIndex = (activePage - 1) * pageSize + i + 1;
                return (
                  <tr key={s.id} className="hover:bg-white/[0.02] transition-colors group">
                    <td className="px-4 py-2.5 text-slate-600 text-xs sticky left-0 z-10 bg-[#0c121e] w-12 min-w-[48px] max-w-[48px] group-hover:bg-[#161e2f] transition-colors">{globalIndex}</td>
                    <td className="px-4 py-2.5 sticky left-[48px] z-10 bg-[#0c121e] min-w-[200px] group-hover:bg-[#161e2f] border-r border-slate-800/80 transition-colors">
                      <div className="text-slate-200 font-medium text-sm">{s.nama}</div>
                      <div className="text-slate-600 text-[11px]">{s.nis}</div>
                    </td>
                    {activeKomponen.map((k) => (
                      <Cell key={k.key} nilai={g ? (g[k.key as KomponenKey] as number | null) : null} />
                    ))}
                    <td className="px-3 py-2.5 text-center text-xs font-semibold text-slate-400 tabular-nums">
                      {g?.rataRata?.toFixed(1) ?? "—"}
                    </td>
                    <td className="px-3 py-2.5 text-center">
                      <span className={`text-sm font-bold tabular-nums ${nilaiColor(g?.nilaiRaport)}`}>
                        {g?.nilaiRaport ?? "—"}
                      </span>
                    </td>
                    <td className="px-3 py-2.5 text-slate-500 text-xs">{g?.predikat ?? "—"}</td>
                    <td className="px-3 py-2.5 text-center no-print">
                      <button
                        id={`btn-edit-nilai-${s.id}`}
                        onClick={() => setEditStudent(s)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold
                          text-indigo-400 bg-indigo-500/10 border border-indigo-500/20
                          hover:bg-indigo-500/20 hover:text-indigo-300 hover:border-indigo-500/40
                          opacity-0 group-hover:opacity-100 transition-all"
                      >
                        <Pencil size={11} />
                        Edit
                      </button>
                    </td>
                  </tr>
                );
              })}
              {paginatedStudents.length === 0 && (
                <tr>
                  <td colSpan={activeKomponen.length + 6} className="px-4 py-8 text-center text-slate-600 text-sm">
                    Belum ada data siswa di kelas ini.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Controls */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 border-t border-slate-800/60 bg-slate-900/20 rounded-2xl no-print">
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <span>Tampilkan:</span>
            <select
              value={pageSize}
              onChange={(e) => {
                setPageSize(Number(e.target.value));
                setCurrentPage(1);
              }}
              className="bg-slate-800 border border-slate-700 text-white rounded-lg px-2 py-1 text-xs focus:outline-none"
            >
              {[5, 10, 15, 20, 50].map((size) => (
                <option key={size} value={size}>
                  {size}
                </option>
              ))}
            </select>
            <span>data per halaman</span>
            <span className="ml-4">
              Menampilkan {totalItems > 0 ? (activePage - 1) * pageSize + 1 : 0} -{" "}
              {Math.min(activePage * pageSize, totalItems)} dari {totalItems} siswa
            </span>
          </div>

          {totalPages > 1 && (
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={activePage === 1}
                className="px-3 py-1.5 rounded-lg text-xs font-semibold border border-slate-800 bg-slate-900/60 text-slate-450 hover:text-white hover:bg-slate-850 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
              >
                Prev
              </button>
              {Array.from({ length: totalPages }, (_, idx) => idx + 1).map((page) => (
                <button
                  key={page}
                  onClick={() => setCurrentPage(page)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
                    page === activePage
                      ? "bg-indigo-500/20 text-indigo-300 border-indigo-500/40"
                      : "border-slate-800 bg-slate-900/60 text-slate-500 hover:text-slate-350 hover:bg-slate-800"
                  }`}
                >
                  {page}
                </button>
              ))}
              <button
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={activePage === totalPages}
                className="px-3 py-1.5 rounded-lg text-xs font-semibold border border-slate-800 bg-slate-900/60 text-slate-450 hover:text-white hover:bg-slate-850 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
              >
                Next
              </button>
            </div>
          )}
        </div>

        <p className="text-xs text-slate-700 text-center no-print">
          Nilai disimpan secara otomatis · Rata-rata & predikat dihitung dari komponen yang terisi berdasarkan bobot mata pelajaran.
        </p>
      </div>
    </>
  );
}
