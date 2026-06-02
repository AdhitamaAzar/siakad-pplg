// =============================================================================
// FILE: app/admin/mapel/MapelClientPage.tsx
// TUJUAN: Client Component untuk mengelola mata pelajaran (Subject CRUD) bagi admin.
//         - Tampilkan list mapel dalam grid/card
//         - Modal tambah mapel baru
//         - Modal edit mapel
//         - Tombol hapus mapel
// =============================================================================

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  ClipboardList, BookOpen, Plus, Trash2, Edit, X, Loader2
} from "lucide-react";

interface SubjectItem {
  id:        number;
  namaMapel: string;
  kodeMapel: string;
  tingkat:   number;
  _count: {
    teacherClassSubjects: number;
  };
}

interface MapelClientPageProps {
  initialSubjects: SubjectItem[];
}

export default function MapelClientPage({ initialSubjects }: MapelClientPageProps) {
  const router = useRouter();

  // State
  const [isOpen, setIsOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  // Form Fields
  const [namaMapel, setNamaMapel] = useState("");
  const [kodeMapel, setKodeMapel] = useState("");
  const [tingkat, setTingkat] = useState("11");

  // Accent colors for visual cards
  const accents = [
    { ring: "ring-indigo-500/30", icon: "bg-indigo-500/20 text-indigo-400", bar: "bg-indigo-500" },
    { ring: "ring-emerald-500/30", icon: "bg-emerald-500/20 text-emerald-400", bar: "bg-emerald-500" },
    { ring: "ring-sky-500/30",    icon: "bg-sky-500/20 text-sky-400",       bar: "bg-sky-500"    },
    { ring: "ring-amber-500/30",  icon: "bg-amber-500/20 text-amber-400",   bar: "bg-amber-500"  },
    { ring: "ring-violet-500/30", icon: "bg-violet-500/20 text-violet-400", bar: "bg-violet-500" },
    { ring: "ring-rose-500/30",   icon: "bg-rose-500/20 text-rose-400",     bar: "bg-rose-500"   },
  ];

  // Actions
  function openAddModal() {
    setIsEditMode(false);
    setEditingId(null);
    setNamaMapel("");
    setKodeMapel("");
    setTingkat("11");
    setErrorMsg("");
    setIsOpen(true);
  }

  function openEditModal(m: SubjectItem) {
    setIsEditMode(true);
    setEditingId(m.id);
    setNamaMapel(m.namaMapel);
    setKodeMapel(m.kodeMapel);
    setTingkat(String(m.tingkat));
    setErrorMsg("");
    setIsOpen(true);
  }

  async function handleSubmit() {
    if (!namaMapel.trim() || !kodeMapel.trim()) {
      setErrorMsg("Semua kolom wajib diisi.");
      return;
    }

    setIsSubmitting(true);
    setErrorMsg("");

    try {
      const endpoint = "/api/admin/mapel";
      const method = isEditMode ? "PUT" : "POST";
      const body = {
        id: editingId,
        namaMapel: namaMapel.trim(),
        kodeMapel: kodeMapel.trim(),
        tingkat: Number(tingkat),
      };

      const res = await fetch(endpoint, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Gagal menyimpan mata pelajaran.");
      }

      setIsOpen(false);
      router.refresh();
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleDelete(m: SubjectItem) {
    if (m._count.teacherClassSubjects > 0) {
      alert(`Mata pelajaran ${m.namaMapel} tidak dapat dihapus karena ditugaskan ke ${m._count.teacherClassSubjects} kelas mengajar.`);
      return;
    }

    if (!confirm(`Apakah Anda yakin ingin menghapus mata pelajaran ${m.namaMapel}?`)) {
      return;
    }

    try {
      const res = await fetch(`/api/admin/mapel?id=${m.id}`, {
        method: "DELETE",
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Gagal menghapus mata pelajaran.");
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
            <ClipboardList className="h-5 w-5 text-indigo-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">Manajemen Mata Pelajaran</h1>
            <p className="text-sm text-slate-500">Daftar mata pelajaran aktif di SIAKAD PPLG</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="rounded-xl border border-slate-800/60 bg-slate-900/60 px-4 py-2 text-center backdrop-blur-sm">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">Total Mapel</p>
            <p className="text-base font-bold text-white">{initialSubjects.length}</p>
          </div>
          <button
            onClick={openAddModal}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold bg-indigo-500 text-white hover:bg-indigo-600 transition-colors shadow-lg shadow-indigo-500/10 cursor-pointer"
          >
            <Plus size={16} />
            Tambah Mapel
          </button>
        </div>
      </div>

      {/* Grid */}
      {initialSubjects.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-slate-800/60 bg-slate-900/60 py-20 text-center backdrop-blur-sm">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-800/60">
            <BookOpen className="h-8 w-8 text-slate-600" />
          </div>
          <p className="mt-4 text-base font-medium text-slate-400">Belum ada mata pelajaran</p>
          <p className="mt-1 text-sm text-slate-600">Mata pelajaran akan muncul di sini setelah ditambahkan.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {initialSubjects.map((mapel, idx) => {
            const accent = accents[idx % accents.length];
            return (
              <div
                key={mapel.id}
                className={`group relative rounded-2xl border border-slate-800/65 bg-slate-900/60 p-6 backdrop-blur-sm ring-1 ${accent.ring} transition-all duration-200 hover:bg-slate-900/80 hover:shadow-lg`}
              >
                <div className={`absolute inset-x-0 top-0 h-0.5 rounded-t-2xl ${accent.bar} opacity-60`} />

                <div className="flex items-start justify-between">
                  <div className={`flex h-12 w-12 items-center justify-center rounded-xl ${accent.icon}`}>
                    <ClipboardList className="h-6 w-6" />
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="rounded-full bg-slate-800/60 px-2.5 py-0.5 text-[10px] font-medium text-slate-400 ring-1 ring-slate-700/40">
                      Kelas {mapel.tingkat}
                    </span>
                    <button
                      onClick={() => openEditModal(mapel)}
                      className="p-1.5 rounded-lg bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-400 hover:text-indigo-300 transition-colors cursor-pointer"
                      title="Edit Mapel"
                    >
                      <Edit size={13} />
                    </button>
                    <button
                      onClick={() => handleDelete(mapel)}
                      className="p-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 hover:text-rose-300 transition-colors cursor-pointer"
                      title="Hapus Mapel"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>

                <div className="mt-4 space-y-1">
                  <p className="text-xs font-mono text-slate-500 uppercase tracking-wider">{mapel.kodeMapel}</p>
                  <h3 className="text-lg font-bold text-white line-clamp-2 min-h-[3.5rem] leading-snug">{mapel.namaMapel}</h3>
                </div>

                <div className="mt-4 pt-4 border-t border-slate-800/65 flex items-center justify-between text-xs text-slate-500">
                  <span>Kelas Mengajar:</span>
                  <span className="font-semibold text-slate-300">{mapel._count.teacherClassSubjects} kelas</span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="relative w-full max-w-sm rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-white">
                {isEditMode ? "Edit Mata Pelajaran" : "Tambah Mapel Baru"}
              </h3>
              <button onClick={() => setIsOpen(false)} className="p-1 rounded-lg hover:bg-slate-800 text-slate-500 hover:text-slate-300">
                <X size={16} />
              </button>
            </div>

            {errorMsg && (
              <div className="rounded-lg border border-rose-500/20 bg-rose-500/10 p-3 text-xs text-rose-400">
                {errorMsg}
              </div>
            )}

            <div className="space-y-3">
              {/* Kode Mapel */}
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-400">Kode Mapel</label>
                <input
                  type="text"
                  value={kodeMapel}
                  onChange={(e) => setKodeMapel(e.target.value)}
                  placeholder="Contoh: PW-11"
                  className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3 py-2 text-xs text-white placeholder-slate-600 outline-none focus:border-indigo-500/50 uppercase"
                />
              </div>

              {/* Nama Mapel */}
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-400">Nama Mata Pelajaran</label>
                <input
                  type="text"
                  value={namaMapel}
                  onChange={(e) => setNamaMapel(e.target.value)}
                  placeholder="Contoh: Pemrograman Web"
                  className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3 py-2 text-xs text-white placeholder-slate-600 outline-none focus:border-indigo-500/50"
                />
              </div>

              {/* Tingkat */}
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-400">Tingkat</label>
                <select
                  value={tingkat}
                  onChange={(e) => setTingkat(e.target.value)}
                  className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3 py-2 text-xs text-white outline-none focus:border-indigo-500/50"
                >
                  <option value="10">Kelas X (10)</option>
                  <option value="11">Kelas XI (11)</option>
                  <option value="12">Kelas XII (12)</option>
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
                onClick={handleSubmit}
                disabled={isSubmitting}
                className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold bg-indigo-500 text-white hover:bg-indigo-600 disabled:opacity-50 transition-colors"
              >
                {isSubmitting ? <Loader2 size={13} className="animate-spin" /> : null}
                {isSubmitting ? "Memproses..." : isEditMode ? "Simpan Perubahan" : "Tambah Mapel"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
