// =============================================================================
// FILE: app/admin/guru/GuruClientPage.tsx
// TUJUAN: Client Component untuk mengelola Guru & Penugasan mengajar bagi admin.
//         - Tampilkan list guru
//         - Modal penugasan mapel & kelas
//         - Tombol hapus penugasan
// =============================================================================

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  GraduationCap, BookOpen, Plus, Trash2, X, Loader2, School, AtSign, Hash
} from "lucide-react";

interface ClassItem {
  id: number;
  namaKelas: string;
}

interface SubjectItem {
  id: number;
  namaMapel: string;
  kodeMapel: string;
}

interface AssignmentItem {
  id: number;
  kelas: ClassItem;
  subject: SubjectItem;
}

interface TeacherItem {
  id:    number;
  nip:   string;
  nama:  string;
  email: string | null;
  user: {
    username: string;
    createdAt: string;
  };
  classSubjects: AssignmentItem[];
}

interface GuruClientPageProps {
  teachers: TeacherItem[];
  classes: ClassItem[];
  subjects: SubjectItem[];
}

export default function GuruClientPage({ teachers, classes, subjects }: GuruClientPageProps) {
  const router = useRouter();

  // Modal State
  const [isOpen, setIsOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  // Target Teacher for Assignment
  const [activeTeacher, setActiveTeacher] = useState<TeacherItem | null>(null);

  // Form Fields
  const [selectedClassId, setSelectedClassId] = useState("");
  const [selectedSubjectId, setSelectedSubjectId] = useState("");

  // Actions
  function openAssignModal(t: TeacherItem) {
    setActiveTeacher(t);
    setSelectedClassId(classes[0]?.id ? String(classes[0].id) : "");
    setSelectedSubjectId(subjects[0]?.id ? String(subjects[0].id) : "");
    setErrorMsg("");
    setIsOpen(true);
  }

  async function handleAssign() {
    if (!activeTeacher || !selectedClassId || !selectedSubjectId) {
      setErrorMsg("Semua kolom wajib diisi.");
      return;
    }

    setIsSubmitting(true);
    setErrorMsg("");

    try {
      const res = await fetch("/api/admin/guru/assign", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          teacherId: activeTeacher.id,
          kelasId: Number(selectedClassId),
          subjectId: Number(selectedSubjectId),
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Gagal membuat penugasan.");
      }

      setIsOpen(false);
      router.refresh();
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleUnassign(assignmentId: number, teacherName: string, className: string, subjectName: string) {
    if (!confirm(`Hapus penugasan mengajar ${teacherName} di kelas ${className} untuk mapel ${subjectName}?`)) {
      return;
    }

    try {
      const res = await fetch(`/api/admin/guru/assign?id=${assignmentId}`, {
        method: "DELETE",
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Gagal menghapus penugasan.");
      }

      router.refresh();
    } catch (err: any) {
      alert(err.message);
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-500/20">
            <GraduationCap className="h-5 w-5 text-indigo-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">Manajemen Penugasan Guru</h1>
            <p className="text-sm text-slate-500">Kelola kelas mengajar dan mata pelajaran untuk setiap guru</p>
          </div>
        </div>

        <div className="rounded-xl border border-slate-800/60 bg-slate-900/60 px-4 py-2 text-center backdrop-blur-sm">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">Guru Aktif</p>
          <p className="text-base font-bold text-white">{teachers.length}</p>
        </div>
      </div>

      {/* Table */}
      <div className="rounded-2xl border border-slate-800/60 bg-slate-900/60 overflow-hidden backdrop-blur-sm">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-800/60 bg-slate-900/40">
                <th className="px-5 py-4 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                  <Hash className="inline h-3 w-3 mr-1" />No
                </th>
                <th className="px-5 py-4 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                  Nama Guru
                </th>
                <th className="px-5 py-4 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                  NIP & Username
                </th>
                <th className="px-5 py-4 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                  Penugasan Mengajar (Kelas - Mapel)
                </th>
                <th className="px-5 py-4 text-right text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                  Aksi
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/40">
              {teachers.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-5 py-16 text-center">
                    <div className="flex flex-col items-center gap-3">
                      <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-slate-800/60">
                        <GraduationCap className="h-6 w-6 text-slate-600" />
                      </div>
                      <p className="text-sm text-slate-500">Belum ada data guru terdaftar.</p>
                    </div>
                  </td>
                </tr>
              ) : (
                teachers.map((t, idx) => (
                  <tr key={t.id} className="hover:bg-white/[0.02] transition-colors">
                    {/* No */}
                    <td className="px-5 py-4 text-sm text-slate-600">{idx + 1}</td>

                    {/* Nama */}
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-indigo-500/15 ring-1 ring-indigo-500/30">
                          <span className="text-[10px] font-bold text-indigo-400">
                            {t.nama.slice(0, 2).toUpperCase()}
                          </span>
                        </div>
                        <div>
                          <span className="font-semibold text-white block">{t.nama}</span>
                          <span className="text-xs text-slate-500 block">{t.email || `${t.user.username}@smk.sch.id`}</span>
                        </div>
                      </div>
                    </td>

                    {/* NIP & Username */}
                    <td className="px-5 py-4">
                      <span className="text-xs font-mono text-slate-300 block">NIP: {t.nip}</span>
                      <span className="text-xs text-slate-500 block">User: @{t.user.username}</span>
                    </td>

                    {/* Class & Subject Badges */}
                    <td className="px-5 py-4">
                      <div className="flex flex-wrap gap-1.5 max-w-md">
                        {t.classSubjects.length === 0 ? (
                          <span className="text-slate-600 text-xs italic">Belum ada penugasan mengajar</span>
                        ) : (
                          t.classSubjects.map((cs) => (
                            <span
                              key={cs.id}
                              className="inline-flex items-center gap-1 rounded-full bg-indigo-500/15 pl-2.5 pr-1 py-0.5 text-[10px] font-semibold text-indigo-400 ring-1 ring-indigo-500/30"
                            >
                              <span>{cs.kelas.namaKelas} - {cs.subject.kodeMapel}</span>
                              <button
                                onClick={() => handleUnassign(cs.id, t.nama, cs.kelas.namaKelas, cs.subject.namaMapel)}
                                className="p-0.5 rounded-full hover:bg-indigo-500/30 text-indigo-400 hover:text-indigo-200 transition-colors"
                              >
                                <X size={10} />
                              </button>
                            </span>
                          ))
                        )}
                      </div>
                    </td>

                    {/* Aksi */}
                    <td className="px-5 py-4 text-right">
                      <button
                        onClick={() => openAssignModal(t)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-indigo-500 hover:bg-indigo-600 text-white transition-colors cursor-pointer"
                      >
                        <Plus size={12} />
                        Tugaskan Mapel
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal */}
      {isOpen && activeTeacher && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="relative w-full max-w-sm rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-white">Tugaskan Mengajar</h3>
              <button onClick={() => setIsOpen(false)} className="p-1 rounded-lg hover:bg-slate-800 text-slate-500 hover:text-slate-300">
                <X size={16} />
              </button>
            </div>

            <div className="p-3.5 rounded-xl border border-indigo-500/10 bg-indigo-500/5 space-y-1">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-indigo-400 block">Guru</span>
              <span className="text-sm font-bold text-white block">{activeTeacher.nama}</span>
              <span className="text-xs text-slate-500 block">NIP: {activeTeacher.nip}</span>
            </div>

            {errorMsg && (
              <div className="rounded-lg border border-rose-500/20 bg-rose-500/10 p-3 text-xs text-rose-400">
                {errorMsg}
              </div>
            )}

            <div className="space-y-3">
              {/* Kelas */}
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-400">Pilih Kelas</label>
                <select
                  value={selectedClassId}
                  onChange={(e) => setSelectedClassId(e.target.value)}
                  className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3 py-2 text-xs text-white outline-none focus:border-indigo-500/50"
                >
                  {classes.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.namaKelas}
                    </option>
                  ))}
                  {classes.length === 0 && (
                    <option value="">Belum ada kelas aktif</option>
                  )}
                </select>
              </div>

              {/* Mapel */}
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-400">Pilih Mata Pelajaran</label>
                <select
                  value={selectedSubjectId}
                  onChange={(e) => setSelectedSubjectId(e.target.value)}
                  className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3 py-2 text-xs text-white outline-none focus:border-indigo-500/50"
                >
                  {subjects.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.kodeMapel} - {s.namaMapel}
                    </option>
                  ))}
                  {subjects.length === 0 && (
                    <option value="">Belum ada mapel aktif</option>
                  )}
                </select>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 border-t border-slate-800 pt-3">
              <button
                onClick={() => setIsOpen(false)}
                className="px-4 py-2 rounded-lg text-xs font-semibold text-slate-400 hover:bg-slate-800 hover:text-slate-200 transition-colors"
              >
                Batal
              </button>
              <button
                onClick={handleAssign}
                disabled={isSubmitting}
                className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold bg-indigo-500 text-white hover:bg-indigo-600 disabled:opacity-50 transition-colors"
              >
                {isSubmitting ? <Loader2 size={13} className="animate-spin" /> : null}
                {isSubmitting ? "Memproses..." : "Tugaskan"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
