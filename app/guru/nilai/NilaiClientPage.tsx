"use client";

// =============================================================================
// FILE: app/guru/nilai/NilaiClientPage.tsx
// TUJUAN: Client component untuk halaman rekap nilai guru.
//         Menampilkan tabel nilai + tombol Edit tiap baris.
//         Klik Edit → modal input 9 komponen nilai + auto-kalkulasi preview.
// =============================================================================

import { useState, useTransition } from "react";
import Link from "next/link";
import { Pencil, X, Save, Loader2, CheckCircle2, AlertCircle } from "lucide-react";

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
  subjectsList: { id: number; namaMapel: string; kodeMapel: string }[];
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


/** Hitung preview rata-rata dari form values */
function hitungPreview(form: Record<string, string>, komponen: readonly any[]): { rata: number | null; raport: number | null } {
  const vals = komponen
    .map((k) => form[k.key])
    .filter((v) => v !== "" && v !== null && v !== undefined)
    .map(Number)
    .filter((v) => !isNaN(v) && v > 0);
  if (vals.length === 0) return { rata: null, raport: null };
  const rata = Math.round((vals.reduce((a, b) => a + b, 0) / vals.length) * 10) / 10;
  return { rata, raport: Math.round(rata) };
}

// ─── MODAL EDIT NILAI ──────────────────────────────────────────────────────────
function EditModal({
  student,
  isRpl,
  subjectId,
  onClose,
  onSaved,
}: {
  student: Student;
  isRpl: boolean;
  subjectId: number | undefined;
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

  const preview = hitungPreview(form, komponen);

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
          body: JSON.stringify({ studentId: student.id, subjectId, ...form }),
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
            {komponen.map((k) => (
              <div key={k.key}>
                <label className="block text-xs font-medium text-slate-400 mb-1">
                  {k.label}
                  <span className="text-slate-600 font-normal ml-1">({k.desc})</span>
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
            ))}
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
  const [editStudent, setEditStudent] = useState<Student | null>(null);

  const activeSubject = subjectsList.find((s) => s.id === activeSubjectId);
  const isRpl = activeSubject ? activeSubject.kodeMapel.toLowerCase().includes("pplg") : true;
  const komponen = getKomponen(isRpl);

  function handleSaved(studentId: number, newGrade: GradeData) {
    setStudents((prev) =>
      prev.map((s) =>
        s.id === studentId ? { ...s, grades: [newGrade] } : s
      )
    );
  }

  return (
    <>
      {editStudent && (
        <EditModal
          student={editStudent}
          isRpl={isRpl}
          subjectId={activeSubjectId}
          onClose={() => setEditStudent(null)}
          onSaved={handleSaved}
        />
      )}

      <div className="space-y-5 max-w-[1360px]">
        {/* Header */}
        <div className="flex items-start justify-between">
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
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
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

          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Mata Pelajaran:</span>
            <select
              value={activeSubjectId || ""}
              onChange={(e) => {
                window.location.href = `/guru/nilai?kelas=${activeKelasId}&mapel=${e.target.value}`;
              }}
              className="bg-slate-900 border border-slate-800 rounded-xl px-3 py-1.5 text-xs font-semibold text-slate-300 outline-none focus:border-indigo-500 focus:bg-slate-950 transition-colors"
            >
              {subjectsList.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.namaMapel} ({s.kodeMapel})
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Tabel */}
        <div className="rounded-2xl border border-slate-800/60 bg-slate-900/60 overflow-auto">
          <table className="w-full text-sm whitespace-nowrap">
            <thead>
              <tr className="border-b border-slate-800/60">
                <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-500 sticky left-0 z-10 bg-[#0c121e] w-12 min-w-[48px] max-w-[48px]">#</th>
                <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-500 sticky left-[48px] z-10 bg-[#0c121e] min-w-[200px] border-r border-slate-800/80">Nama Siswa</th>
                {komponen.map((k) => (
                  <th key={k.key} className="px-2 py-3 text-center text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                    {k.label}
                  </th>
                ))}
                <th className="px-3 py-3 text-center text-[11px] font-semibold uppercase tracking-wider text-slate-400">Avg</th>
                <th className="px-3 py-3 text-center text-[11px] font-semibold uppercase tracking-wider text-indigo-400">Raport</th>
                <th className="px-3 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-500">Predikat</th>
                <th className="px-3 py-3 text-center text-[11px] font-semibold uppercase tracking-wider text-slate-600">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/40">
              {students.map((s, i) => {
                const g = s.grades[0] ?? null;
                return (
                  <tr key={s.id} className="hover:bg-white/[0.02] transition-colors group">
                    <td className="px-4 py-2.5 text-slate-600 text-xs sticky left-0 z-10 bg-[#0c121e] w-12 min-w-[48px] max-w-[48px] group-hover:bg-[#161e2f] transition-colors">{i + 1}</td>
                    <td className="px-4 py-2.5 sticky left-[48px] z-10 bg-[#0c121e] min-w-[200px] group-hover:bg-[#161e2f] border-r border-slate-800/80 transition-colors">
                      <div className="text-slate-200 font-medium text-sm">{s.nama}</div>
                      <div className="text-slate-600 text-[11px]">{s.nis}</div>
                    </td>
                    {komponen.map((k) => (
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
                    <td className="px-3 py-2.5 text-center">
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
              {students.length === 0 && (
                <tr>
                  <td colSpan={14} className="px-4 py-8 text-center text-slate-600 text-sm">
                    Belum ada data siswa di kelas ini.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <p className="text-xs text-slate-700 text-center">
          Nilai disimpan secara otomatis · Rata-rata & predikat dihitung dari komponen yang terisi
        </p>
      </div>
    </>
  );
}
