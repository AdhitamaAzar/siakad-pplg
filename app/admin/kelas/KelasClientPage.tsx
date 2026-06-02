// =============================================================================
// FILE: app/admin/kelas/KelasClientPage.tsx
// TUJUAN: Client Component untuk mengelola kelas (Class CRUD) bagi admin.
//         - Tampilkan list kelas dalam grid
//         - Modal tambah kelas baru (tingkat & nama)
//         - Tombol hapus kelas (pengamanan cegah hapus jika ada siswa)
// =============================================================================

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  School, Users, CalendarRange, BookOpen, Plus, Trash2, X, Loader2
} from "lucide-react";

interface ClassItem {
  id:          number;
  namaKelas:   string;
  tingkat:     number;
  tahunAjaran: string;
  _count: {
    students: number;
  };
}

interface KelasClientPageProps {
  initialClasses: ClassItem[];
}

export default function KelasClientPage({ initialClasses }: KelasClientPageProps) {
  const router = useRouter();

  // Modal & Form State
  const [isOpen, setIsOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  // Form Fields
  const [namaKelas, setNamaKelas] = useState("");
  const [tingkat, setTingkat] = useState("11");

  // Accents for cards
  const accents = [
    { ring: "ring-indigo-500/30", icon: "bg-indigo-500/20 text-indigo-400", bar: "bg-indigo-500" },
    { ring: "ring-violet-500/30", icon: "bg-violet-500/20 text-violet-400", bar: "bg-violet-500" },
    { ring: "ring-sky-500/30",    icon: "bg-sky-500/20 text-sky-400",       bar: "bg-sky-500"    },
    { ring: "ring-emerald-500/30", icon: "bg-emerald-500/20 text-emerald-400", bar: "bg-emerald-500" },
    { ring: "ring-amber-500/30",  icon: "bg-amber-500/20 text-amber-400",   bar: "bg-amber-500"  },
    { ring: "ring-rose-500/30",   icon: "bg-rose-500/20 text-rose-400",     bar: "bg-rose-500"   },
  ];

  // Actions
  function openModal() {
    setNamaKelas("");
    setTingkat("11");
    setErrorMsg("");
    setIsOpen(true);
  }

  async function handleCreate() {
    if (!namaKelas.trim()) {
      setErrorMsg("Nama kelas wajib diisi.");
      return;
    }

    setIsSubmitting(true);
    setErrorMsg("");

    try {
      const res = await fetch("/api/admin/kelas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          namaKelas: namaKelas.trim(),
          tingkat: Number(tingkat),
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Gagal membuat kelas baru.");
      }

      setIsOpen(false);
      router.refresh();
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleDelete(c: ClassItem) {
    if (c._count.students > 0) {
      alert(`Kelas ${c.namaKelas} tidak dapat dihapus karena memiliki ${c._count.students} siswa. Pindahkan siswa terlebih dahulu.`);
      return;
    }

    if (!confirm(`Apakah Anda yakin ingin menghapus kelas ${c.namaKelas}?`)) {
      return;
    }

    try {
      const res = await fetch(`/api/admin/kelas?id=${c.id}`, {
        method: "DELETE",
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Gagal menghapus kelas.");
      }

      router.refresh();
    } catch (err: any) {
      alert(err.message);
    }
  }

  const totalStudents = initialClasses.reduce((sum, k) => sum + k._count.students, 0);

  return (
    <div className="space-y-6">
      {/* ── Page header ── */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-500/20">
            <School className="h-5 w-5 text-indigo-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">Manajemen Kelas</h1>
            <p className="text-sm text-slate-500">Daftar seluruh kelas aktif di SIAKAD PPLG</p>
          </div>
        </div>

        {/* Action and Summary */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="rounded-xl border border-slate-800/60 bg-slate-900/60 px-4 py-2 text-center backdrop-blur-sm">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">Total Kelas</p>
            <p className="text-base font-bold text-white">{initialClasses.length}</p>
          </div>
          <div className="rounded-xl border border-slate-800/60 bg-slate-900/60 px-4 py-2 text-center backdrop-blur-sm">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">Total Siswa</p>
            <p className="text-base font-bold text-white">{totalStudents}</p>
          </div>
          <button
            onClick={openModal}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold bg-indigo-500 text-white hover:bg-indigo-600 transition-colors shadow-lg shadow-indigo-500/10 cursor-pointer"
          >
            <Plus size={16} />
            Tambah Kelas
          </button>
        </div>
      </div>

      {/* ── Cards grid ── */}
      {initialClasses.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-slate-800/60 bg-slate-900/60 py-20 text-center backdrop-blur-sm">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-800/60">
            <BookOpen className="h-8 w-8 text-slate-655" />
          </div>
          <p className="mt-4 text-base font-medium text-slate-400">Belum ada data kelas</p>
          <p className="mt-1 text-sm text-slate-600">Kelas akan muncul di sini setelah ditambahkan ke sistem.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {initialClasses.map((kelas, idx) => {
            const accent = accents[idx % accents.length];
            return (
              <div
                key={kelas.id}
                className={`group relative rounded-2xl border border-slate-800/65 bg-slate-900/60 p-6 backdrop-blur-sm ring-1 ${accent.ring} transition-all duration-200 hover:bg-slate-900/80 hover:shadow-lg`}
              >
                {/* Top accent bar */}
                <div className={`absolute inset-x-0 top-0 h-0.5 rounded-t-2xl ${accent.bar} opacity-60`} />

                {/* Icon + class name + delete button */}
                <div className="flex items-start justify-between">
                  <div className={`flex h-12 w-12 items-center justify-center rounded-xl ${accent.icon}`}>
                    <School className="h-6 w-6" />
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="rounded-full bg-slate-800/60 px-2.5 py-0.5 text-[10px] font-medium text-slate-400 ring-1 ring-slate-700/40">
                      Tingkat {kelas.tingkat}
                    </span>
                    <button
                      onClick={() => handleDelete(kelas)}
                      className="p-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 hover:text-rose-300 transition-colors cursor-pointer"
                      title="Hapus Kelas"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>

                <div className="mt-4">
                  <h3 className="text-xl font-bold text-white">{kelas.namaKelas}</h3>
                </div>

                {/* Meta */}
                <div className="mt-4 space-y-2">
                  <div className="flex items-center gap-2 text-sm text-slate-400">
                    <CalendarRange className="h-4 w-4 text-slate-600" />
                    <span>Tahun Ajaran: <span className="font-medium text-slate-300">{kelas.tahunAjaran}</span></span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-slate-400">
                    <Users className="h-4 w-4 text-slate-600" />
                    <span>
                      Jumlah Siswa:{' '}
                      <span className="font-semibold text-white">{kelas._count.students}</span> orang
                    </span>
                  </div>
                </div>

                {/* Student count progress bar (visual, max 40 students) */}
                <div className="mt-5">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-[11px] text-slate-600">Kapasitas</span>
                    <span className="text-[11px] text-slate-500">{kelas._count.students}/40</span>
                  </div>
                  <div className="h-1.5 w-full rounded-full bg-slate-800">
                    <div
                      className={`h-1.5 rounded-full ${accent.bar} opacity-70 transition-all duration-500`}
                      style={{ width: `${Math.min((kelas._count.students / 40) * 100, 100)}%` }}
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── Footer note ── */}
      {initialClasses.length > 0 && (
        <p className="text-xs text-slate-700">
          Data kelas diambil dari database. Diurutkan berdasarkan nama kelas secara ascending.
        </p>
      )}

      {/* ── MODAL ADD CLASS ────────────────────────────────────────────────── */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="relative w-full max-w-sm rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-white">Tambah Kelas Baru</h3>
              <button onClick={() => setIsOpen(false)} className="p-1 rounded-lg hover:bg-slate-800 text-slate-550 hover:text-slate-300">
                <X size={16} />
              </button>
            </div>

            {errorMsg && (
              <div className="rounded-lg border border-rose-500/20 bg-rose-500/10 p-3 text-xs text-rose-450">
                {errorMsg}
              </div>
            )}

            <div className="space-y-3">
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

              {/* Nama Kelas */}
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-400">Nama Kelas</label>
                <input
                  type="text"
                  value={namaKelas}
                  onChange={(e) => setNamaKelas(e.target.value)}
                  placeholder="Contoh: XI PPLG 3"
                  className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3 py-2 text-xs text-white placeholder-slate-655 outline-none focus:border-indigo-500/50"
                />
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
                onClick={handleCreate}
                disabled={isSubmitting}
                className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold bg-indigo-500 text-white hover:bg-indigo-600 disabled:opacity-50 transition-colors"
              >
                {isSubmitting ? <Loader2 size={13} className="animate-spin" /> : null}
                {isSubmitting ? "Memproses..." : "Tambah Kelas"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
