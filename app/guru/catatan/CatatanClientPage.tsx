// =============================================================================
// FILE: app/guru/catatan/CatatanClientPage.tsx
// TUJUAN: Halaman Client Component untuk manajemen Catatan & Skor Proyek Siswa.
//         - Tampilkan list siswa sekelas
//         - Accordion untuk ekspansi catatan per siswa
//         - Modal formulir tambah/edit catatan lengkap dengan 7 komponen skor
//         - Terkoneksi ke API endpoint /api/guru/catatan
// =============================================================================

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  MessageSquare, Plus, Edit2, Trash2, X, Loader2,
  ChevronDown, ChevronRight, FileText, CheckCircle, Info
} from "lucide-react";

// ─── TYPES ────────────────────────────────────────────────────────────────────

interface Note {
  id:          number;
  judulProyek: string | null;
  catatan:     string;
  nilaiItem:   number | null;
  nilaiData:   number | null;
  nilaiAlur:   number | null;
  nilaiMetode:   number | null;
  nilaiTambah:   number | null;
  nilaiUrutan:   number | null;
  nilaiTa1:      number | null;
  nilaiTotal:    number | null;
  createdAt:   string;
  teacher: {
    nama: string;
  };
}

interface Student {
  id:     number;
  nama:   string;
  nis:    string;
  notes:  Note[];
}

interface ClassItem {
  id:        number;
  namaKelas: string;
}

interface CatatanClientPageProps {
  students:      Student[];
  kelasList:     ClassItem[];
  activeKelasId: number;
}

// ─── MAIN COMPONENT ───────────────────────────────────────────────────────────

export default function CatatanClientPage({
  students,
  kelasList,
  activeKelasId,
}: CatatanClientPageProps) {
  const router = useRouter();

  // State
  const [expandedStudentId, setExpandedStudentId] = useState<number | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  // Form State
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [editingNote, setEditingNote] = useState<Note | null>(null);
  
  const [judulProyek, setJudulProyek] = useState("");
  const [catatan, setCatatan] = useState("");
  const [nilaiItem, setNilaiItem] = useState("");
  const [nilaiData, setNilaiData] = useState("");
  const [nilaiAlur, setNilaiAlur] = useState("");
  const [nilaiMetode, setNilaiMetode] = useState("");
  const [nilaiTambah, setNilaiTambah] = useState("");
  const [nilaiUrutan, setNilaiUrutan] = useState("");
  const [nilaiTa1, setNilaiTa1] = useState("");

  // ── Form Actions ─────────────────────────────────────────────────────────

  function openAddModal(student: Student) {
    setSelectedStudent(student);
    setEditingNote(null);
    setJudulProyek("Proyek Mandiri");
    setCatatan("");
    setNilaiItem("");
    setNilaiData("");
    setNilaiAlur("");
    setNilaiMetode("");
    setNilaiTambah("");
    setNilaiUrutan("");
    setNilaiTa1("");
    setErrorMsg("");
    setIsModalOpen(true);
  }

  function openEditModal(student: Student, note: Note) {
    setSelectedStudent(student);
    setEditingNote(note);
    setJudulProyek(note.judulProyek || "");
    setCatatan(note.catatan);
    setNilaiItem(note.nilaiItem?.toString() || "");
    setNilaiData(note.nilaiData?.toString() || "");
    setNilaiAlur(note.nilaiAlur?.toString() || "");
    setNilaiMetode(note.nilaiMetode?.toString() || "");
    setNilaiTambah(note.nilaiTambah?.toString() || "");
    setNilaiUrutan(note.nilaiUrutan?.toString() || "");
    setNilaiTa1(note.nilaiTa1?.toString() || "");
    setErrorMsg("");
    setIsModalOpen(true);
  }

  async function handleSave() {
    if (!catatan.trim()) {
      setErrorMsg("Kolom catatan masukan wajib diisi.");
      return;
    }

    setIsSubmitting(true);
    setErrorMsg("");

    const payload = {
      id: editingNote?.id,
      studentId: selectedStudent?.id,
      judulProyek,
      catatan,
      nilaiItem: nilaiItem === "" ? null : Number(nilaiItem),
      nilaiData: nilaiData === "" ? null : Number(nilaiData),
      nilaiAlur: nilaiAlur === "" ? null : Number(nilaiAlur),
      nilaiMetode: nilaiMetode === "" ? null : Number(nilaiMetode),
      nilaiTambah: nilaiTambah === "" ? null : Number(nilaiTambah),
      nilaiUrutan: nilaiUrutan === "" ? null : Number(nilaiUrutan),
      nilaiTa1: nilaiTa1 === "" ? null : Number(nilaiTa1),
    };

    try {
      const method = editingNote ? "PUT" : "POST";
      const res = await fetch("/api/guru/catatan", {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Gagal menyimpan catatan.");
      }

      setIsModalOpen(false);
      router.refresh();
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleDelete(noteId: number) {
    if (!confirm("Apakah Anda yakin ingin menghapus catatan ini? Nilai TA1 yang terikat juga akan terpengaruh.")) return;

    try {
      const res = await fetch(`/api/guru/catatan?id=${noteId}`, {
        method: "DELETE",
      });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Gagal menghapus catatan.");
      }

      router.refresh();
    } catch (err: any) {
      alert(err.message);
    }
  }

  const scoreLabels = [
    { label: "Item/Topik", value: nilaiItem, setter: setNilaiItem },
    { label: "Kualitas Data", value: nilaiData, setter: setNilaiData },
    { label: "Alur/Logika", value: nilaiAlur, setter: setNilaiAlur },
    { label: "Metode", value: nilaiMetode, setter: setNilaiMetode },
    { label: "Nilai Tambah", value: nilaiTambah, setter: setNilaiTambah },
    { label: "Urutan Saji", value: nilaiUrutan, setter: setNilaiUrutan },
    { label: "Tugas Akhir 1 (Raport)", value: nilaiTa1, setter: setNilaiTa1 },
  ];

  return (
    <div className="space-y-6 max-w-4xl">
      {/* ── HEADER ────────────────────────────────────────────────────────── */}
      <div>
        <div className="flex items-center gap-2 mb-1">
          <MessageSquare className="h-6 w-6 text-emerald-400" />
          <h1 className="text-xl font-bold text-white">Catatan Guru & Projek</h1>
        </div>
        <p className="text-slate-500 text-sm">
          Berikan evaluasi, bimbingan proyek, dan isi nilai tugas akhir siswa per kelas.
        </p>
      </div>

      {/* ── TAB KELAS ────────────────────────────────────────────────────── */}
      <div className="flex gap-2 flex-wrap">
        {kelasList.map((k) => (
          <Link
            key={k.id}
            href={`/guru/catatan?kelas=${k.id}`}
            className={`
              px-4 py-2 rounded-xl text-sm font-semibold border transition-all duration-200
              ${k.id === activeKelasId
                ? "bg-indigo-500/20 text-indigo-300 border-indigo-500/40"
                : "bg-slate-900/60 text-slate-500 border-slate-800/60 hover:text-slate-300"}
            `}
          >
            {k.namaKelas}
          </Link>
        ))}
      </div>

      {/* ── LIST SISWA ────────────────────────────────────────────────────── */}
      <div className="space-y-3">
        {students.map((student) => {
          const isExpanded = expandedStudentId === student.id;
          const hasNotes = student.notes.length > 0;

          return (
            <div
              key={student.id}
              className={`
                rounded-2xl border transition-all duration-200 overflow-hidden
                ${isExpanded ? "border-indigo-500/30 bg-slate-900/40" : "border-slate-800/60 bg-slate-900/20"}
              `}
            >
              {/* Header Siswa */}
              <div
                onClick={() => setExpandedStudentId(isExpanded ? null : student.id)}
                className="px-5 py-4 flex items-center justify-between cursor-pointer select-none hover:bg-white/[0.01]"
              >
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-xl bg-indigo-500/10 flex items-center justify-center text-indigo-400 font-bold border border-indigo-500/20 shrink-0">
                    {student.nama.charAt(0)}
                  </div>
                  <div>
                    <h3 className="font-semibold text-slate-200 text-sm sm:text-base leading-tight">
                      {student.nama}
                    </h3>
                    <p className="text-xs text-slate-500 mt-1 font-mono">{student.nis}</p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  {/* Badge Jumlah Catatan */}
                  {hasNotes ? (
                    <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                      {student.notes.length} proyek
                    </span>
                  ) : (
                    <span className="text-xs text-slate-600">Belum ada catatan</span>
                  )}

                  {isExpanded ? <ChevronDown size={16} className="text-slate-500" /> : <ChevronRight size={16} className="text-slate-500" />}
                </div>
              </div>

              {/* Detail Ekspansi Catatan */}
              {isExpanded && (
                <div className="px-5 pb-5 border-t border-slate-800/40 pt-4 space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-semibold text-slate-500">Daftar Proyek / Evaluasi</span>
                    <button
                      onClick={() => openAddModal(student)}
                      className="flex items-center gap-1 text-xs font-semibold px-3 py-1.5 rounded-lg bg-indigo-500 text-white hover:bg-indigo-600 transition-colors"
                    >
                      <Plus size={13} />
                      Tambah Catatan
                    </button>
                  </div>

                  {!hasNotes ? (
                    <div className="rounded-xl border border-dashed border-slate-800 p-8 text-center bg-slate-900/10">
                      <p className="text-xs text-slate-500">Siswa ini belum memiliki catatan proyek.</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {student.notes.map((note) => (
                        <div key={note.id} className="rounded-xl border border-slate-800/80 bg-slate-950/40 p-4 space-y-3 relative">
                          {/* Judul & Aksi */}
                          <div className="flex justify-between items-start gap-4">
                            <div>
                              <h4 className="text-sm font-bold text-white">{note.judulProyek || "Proyek Mandiri"}</h4>
                              <p className="text-[10px] text-slate-500 mt-0.5">
                                Oleh: <span className="text-slate-400 font-semibold">{note.teacher.nama}</span> · {new Date(note.createdAt).toLocaleDateString("id-ID", { dateStyle: "medium" })}
                              </p>
                            </div>
                            <div className="flex items-center gap-1 shrink-0">
                              <button
                                onClick={() => openEditModal(student, note)}
                                className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-slate-200 transition-colors"
                                title="Edit Catatan"
                              >
                                <Edit2 size={12} />
                              </button>
                              <button
                                onClick={() => handleDelete(note.id)}
                                className="p-1 rounded bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 hover:text-rose-300 transition-colors"
                                title="Hapus Catatan"
                              >
                                <Trash2 size={12} />
                              </button>
                            </div>
                          </div>

                          {/* Teks Masukan */}
                          <div className="text-xs text-slate-400 whitespace-pre-line leading-relaxed bg-white/[0.01] p-3 rounded-lg border border-white/5">
                            {note.catatan}
                          </div>

                          {/* Nilai Komponen */}
                          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2">
                            {[
                              { label: "Item", val: note.nilaiItem },
                              { label: "Data", val: note.nilaiData },
                              { label: "Alur", val: note.nilaiAlur },
                              { label: "Metode", val: note.nilaiMetode },
                              { label: "Inovasi", val: note.nilaiTambah },
                              { label: "Saji", val: note.nilaiUrutan },
                              { label: "TA1", val: note.nilaiTa1 },
                            ].map(({ label, val }) => (
                              <div key={label} className="rounded-lg bg-slate-900/60 border border-slate-800/40 p-2 text-center">
                                <p className="text-[9px] uppercase tracking-wider text-slate-500">{label}</p>
                                <p className={`text-xs font-bold mt-0.5 ${val ? "text-indigo-400" : "text-slate-700"}`}>
                                  {val ?? "—"}
                                </p>
                              </div>
                            ))}
                            {/* Total */}
                            <div className="rounded-lg bg-indigo-500/10 border border-indigo-500/20 p-2 text-center">
                              <p className="text-[9px] uppercase tracking-wider text-indigo-400 font-bold">Total</p>
                              <p className="text-xs font-black mt-0.5 text-indigo-300">
                                {note.nilaiTotal ?? "—"}
                              </p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}

        {students.length === 0 && (
          <div className="rounded-2xl border border-slate-800/60 bg-slate-900/40 p-10 text-center">
            <p className="text-slate-500 text-sm">Tidak ada siswa terdaftar di kelas ini.</p>
          </div>
        )}
      </div>

      {/* ── MODAL FORMULIR ───────────────────────────────────────────────── */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="relative w-full max-w-lg rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <h3 className="text-base font-bold text-white">
                  {editingNote ? "Edit Catatan Proyek" : "Tambah Catatan Proyek"}
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">Siswa: {selectedStudent?.nama}</p>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1 rounded-lg hover:bg-slate-800 text-slate-500 hover:text-slate-300"
              >
                <X size={16} />
              </button>
            </div>

            {/* Error Message */}
            {errorMsg && (
              <div className="rounded-lg border border-rose-500/20 bg-rose-500/10 p-3 text-xs text-rose-400">
                {errorMsg}
              </div>
            )}

            {/* Inputs */}
            <div className="space-y-3">
              {/* Judul Proyek */}
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-400">Nama / Tema Proyek</label>
                <input
                  type="text"
                  value={judulProyek}
                  onChange={(e) => setJudulProyek(e.target.value)}
                  placeholder="Contoh: Deteksi Penyakit Kulit dengan CNN"
                  className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3 py-2 text-xs text-white placeholder-slate-600 outline-none focus:border-indigo-500/50"
                />
              </div>

              {/* Catatan / Feedback */}
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-400">Catatan Masukan / Feedback Guru</label>
                <textarea
                  value={catatan}
                  onChange={(e) => setCatatan(e.target.value)}
                  placeholder="Tuliskan catatan kemajuan proyek, saran revisi, atau evaluasi portofolio siswa..."
                  rows={4}
                  className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3 py-2 text-xs text-white placeholder-slate-600 outline-none focus:border-indigo-500/50 resize-none"
                />
              </div>

              {/* Grid Nilai Komponen */}
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-400 block mb-1">Skor Komponen Proyek (0-100, Opsional)</label>
                <div className="grid grid-cols-2 gap-2">
                  {scoreLabels.map(({ label, value, setter }) => (
                    <div key={label} className="space-y-1 p-2 rounded-lg bg-slate-950 border border-slate-800/40">
                      <span className="text-[10px] text-slate-500 font-semibold">{label}</span>
                      <input
                        type="number"
                        min={0}
                        max={100}
                        value={value}
                        onChange={(e) => setter(e.target.value)}
                        placeholder="—"
                        className="w-full bg-transparent text-xs text-indigo-400 font-bold outline-none border-none tabular-nums"
                      />
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end gap-2 border-t border-slate-800 pt-3">
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="px-4 py-2 rounded-lg text-xs font-semibold text-slate-400 hover:bg-slate-800 hover:text-slate-200 transition-colors"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleSave}
                disabled={isSubmitting}
                className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold bg-indigo-500 text-white hover:bg-indigo-600 disabled:opacity-50 transition-colors"
              >
                {isSubmitting ? <Loader2 size={13} className="animate-spin" /> : null}
                {isSubmitting ? "Menyimpan..." : "Simpan Catatan"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
