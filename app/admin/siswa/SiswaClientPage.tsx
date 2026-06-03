/**
 * @file app/admin/siswa/SiswaClientPage.tsx
 * @description Client component for Data Siswa admin page.
 *              Provides interactive filter tabs by kelas (class) and renders
 *              a dark-styled table with grade and predikat information.
 *              Includes Edit modal for editing student profile details.
 * @module SIAKAD PPLG — Admin Data Siswa (Client)
 */

'use client';

import { useState, useMemo } from 'react';
import { GraduationCap, Search, Edit2, X, Loader2 } from 'lucide-react';
import { useRouter } from 'next/navigation';

// ─── Types ────────────────────────────────────────────────────────────────────
type Grade = {
  nilaiRaport: number | null;
  predikat: string | null;
};

type Student = {
  id: number;
  nama: string;
  nis: string;
  kelasId: number;
  kelas: { id: number; namaKelas: string; tahunAjaran: string } | null;
  grades: Grade[];
  tempatLahir: string | null;
  tanggalLahir: string | null;
  jenisKelamin: string | null;
  alamat: string | null;
  noHp: string | null;
  namaWali: string | null;
};

type ClassType = {
  id: number;
  namaKelas: string;
  tahunAjaran: string;
};

// ─── Predikat badge ───────────────────────────────────────────────────────────
const PREDIKAT_STYLES: Record<string, string> = {
  A:  'bg-emerald-500/15 text-emerald-400 ring-1 ring-emerald-500/30',
  B:  'bg-sky-500/15 text-sky-400 ring-1 ring-sky-500/30',
  C:  'bg-amber-500/15 text-amber-400 ring-1 ring-amber-500/30',
  D:  'bg-rose-500/15 text-rose-400 ring-1 ring-rose-500/30',
};

function PredikatBadge({ predikat }: { predikat: string | null }) {
  if (!predikat) return <span className="text-slate-700 text-xs">—</span>;
  const style = PREDIKAT_STYLES[predikat.toUpperCase()] ?? 'bg-slate-700/50 text-slate-400';
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-bold ${style}`}>
      {predikat}
    </span>
  );
}

// ─── Nilai display ────────────────────────────────────────────────────────────
function NilaiDisplay({ nilai }: { nilai: number | null | undefined }) {
  if (nilai === null || nilai === undefined) {
    return <span className="text-slate-700 text-xs">Belum dinilai</span>;
  }
  const color =
    nilai >= 90 ? 'text-emerald-400' :
    nilai >= 75 ? 'text-sky-400'     :
    nilai >= 60 ? 'text-amber-400'   :
                  'text-rose-400';
  return (
    <span className={`font-semibold tabular-nums ${color}`}>{nilai}</span>
  );
}

// ─── Main client component ────────────────────────────────────────────────────
export default function SiswaClientPage({
  students,
  classes = [],
}: {
  students: Student[];
  classes: ClassType[];
}) {
  const router = useRouter();
  const [activeKelas, setActiveKelas] = useState<string>('Semua');
  const [search, setSearch]           = useState('');

  // Edit Siswa State
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editSiswa, setEditSiswa]   = useState<Student | null>(null);
  const [editNama, setEditNama]     = useState('');
  const [editNis, setEditNis]       = useState('');
  const [editKelasId, setEditKelasId] = useState('');
  const [editTempatLahir, setEditTempatLahir] = useState('');
  const [editTanggalLahir, setEditTanggalLahir] = useState('');
  const [editJenisKelamin, setEditJenisKelamin] = useState('');
  const [editAlamat, setEditAlamat] = useState('');
  const [editNoHp, setEditNoHp]     = useState('');
  const [editNamaWali, setEditNamaWali] = useState('');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg]         = useState('');

  function openEditModal(siswa: Student) {
    setEditSiswa(siswa);
    setEditNama(siswa.nama);
    setEditNis(siswa.nis);
    setEditKelasId(String(siswa.kelasId));
    setEditTempatLahir(siswa.tempatLahir || '');
    setEditTanggalLahir(siswa.tanggalLahir || '');
    setEditJenisKelamin(siswa.jenisKelamin || '');
    setEditAlamat(siswa.alamat || '');
    setEditNoHp(siswa.noHp || '');
    setEditNamaWali(siswa.namaWali || '');
    setErrorMsg('');
    setIsEditOpen(true);
  }

  async function handleEditSubmit() {
    if (!editSiswa || !editNama.trim() || !editNis.trim() || !editKelasId) {
      setErrorMsg('Nama, NIS, dan Kelas wajib diisi.');
      return;
    }

    setIsSubmitting(true);
    setErrorMsg('');

    try {
      const res = await fetch('/api/admin/siswa', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: editSiswa.id,
          nama: editNama.trim(),
          nis: editNis.trim(),
          kelasId: Number(editKelasId),
          tempatLahir: editTempatLahir.trim() || null,
          tanggalLahir: editTanggalLahir.trim() || null,
          jenisKelamin: editJenisKelamin || null,
          alamat: editAlamat.trim() || null,
          noHp: editNoHp.trim() || null,
          namaWali: editNamaWali.trim() || null,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Gagal menyimpan perubahan.');
      }

      setIsEditOpen(false);
      router.refresh();
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setIsSubmitting(false);
    }
  }

  // Collect unique class names
  const kelasList = useMemo(() => {
    const names = new Set<string>();
    students.forEach((s) => {
      if (s.kelas?.namaKelas) names.add(s.kelas.namaKelas);
    });
    return ['Semua', ...Array.from(names).sort()];
  }, [students]);

  // Filter by active tab + search query
  const filtered = useMemo(() => {
    let list = students;
    if (activeKelas !== 'Semua') {
      list = list.filter((s) => s.kelas?.namaKelas === activeKelas);
    }
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter(
        (s) =>
          s.nama.toLowerCase().includes(q) ||
          s.nis.toLowerCase().includes(q),
      );
    }
    return list;
  }, [students, activeKelas, search]);

  return (
    <div className="space-y-5">
      {/* ── Controls row ── */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        {/* Filter tabs */}
        <div className="flex flex-wrap gap-2">
          {kelasList.map((kelas) => (
            <button
              key={kelas}
              onClick={() => setActiveKelas(kelas)}
              className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-all duration-150 ${
                activeKelas === kelas
                  ? 'bg-indigo-500 text-white shadow-lg shadow-indigo-500/20'
                  : 'bg-slate-800/60 text-slate-400 hover:bg-slate-800 hover:text-slate-200'
              }`}
            >
              {kelas}
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-600" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cari nama / NIS..."
            className="w-full rounded-xl border border-slate-800/60 bg-slate-900/60 pl-9 pr-4 py-2 text-sm text-white placeholder-slate-600 outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/30 sm:w-60"
          />
        </div>
      </div>

      {/* ── Table ── */}
      <div className="rounded-2xl border border-slate-800/60 bg-slate-900/60 overflow-hidden backdrop-blur-sm">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-800/60 bg-slate-900/40">
                {['No', 'Nama Siswa', 'NIS', 'Kelas', 'Nilai Raport', 'Predikat', 'Aksi'].map((h) => (
                  <th
                    key={h}
                    className="px-5 py-4 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-500"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/40">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-5 py-16 text-center">
                    <div className="flex flex-col items-center gap-3">
                      <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-slate-800/60">
                        <GraduationCap className="h-6 w-6 text-slate-600" />
                      </div>
                      <p className="text-sm text-slate-500">
                        {search ? `Tidak ada hasil untuk "${search}"` : 'Belum ada data siswa.'}
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                filtered.map((siswa, idx) => (
                  <tr key={siswa.id} className="hover:bg-white/[0.02] transition-colors">
                    <td className="px-5 py-4 text-sm text-slate-600">{idx + 1}</td>

                    {/* Nama */}
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-500/15 ring-1 ring-emerald-500/25">
                          <span className="text-[10px] font-bold text-emerald-400">
                            {siswa.nama.slice(0, 2).toUpperCase()}
                          </span>
                        </div>
                        <div>
                          <span className="font-medium text-white block">{siswa.nama}</span>
                          {siswa.namaWali && (
                            <span className="text-[10px] text-slate-500 block">Wali: {siswa.namaWali}</span>
                          )}
                        </div>
                      </div>
                    </td>

                    {/* NIS */}
                    <td className="px-5 py-4 font-mono text-sm text-slate-400">{siswa.nis}</td>

                    {/* Kelas */}
                    <td className="px-5 py-4">
                      {siswa.kelas ? (
                        <span className="rounded-lg bg-slate-800/60 px-2.5 py-1 text-xs font-semibold text-slate-300 ring-1 ring-slate-700/40">
                          {siswa.kelas.namaKelas}
                        </span>
                      ) : (
                        <span className="text-slate-700 text-xs">—</span>
                      )}
                    </td>

                    {/* Nilai */}
                    <td className="px-5 py-4">
                      <NilaiDisplay nilai={siswa.grades[0]?.nilaiRaport} />
                    </td>

                    {/* Predikat */}
                    <td className="px-5 py-4">
                      <PredikatBadge predikat={siswa.grades[0]?.predikat ?? null} />
                    </td>

                    {/* Aksi */}
                    <td className="px-5 py-4">
                      <button
                        onClick={() => openEditModal(siswa)}
                        className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-500/10 px-2.5 py-1 text-xs font-semibold text-indigo-400 ring-1 ring-indigo-500/30 hover:bg-indigo-500/20 transition-all cursor-pointer"
                      >
                        <Edit2 className="h-3.5 w-3.5" />
                        Edit
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-slate-800/60 px-5 py-3">
          <p className="text-xs text-slate-600">
            Menampilkan {filtered.length} dari {students.length} siswa
            {activeKelas !== 'Semua' ? ` • Kelas ${activeKelas}` : ''}
          </p>
          {activeKelas !== 'Semua' && (
            <button
              onClick={() => { setActiveKelas('Semua'); setSearch(''); }}
              className="text-xs text-indigo-400 hover:text-indigo-300 transition-colors"
            >
              Tampilkan semua
            </button>
          )}
        </div>
      </div>

      {/* Edit Siswa Modal */}
      {isEditOpen && editSiswa && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm overflow-y-auto">
          <div className="relative w-full max-w-lg rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-2xl space-y-4 my-8">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-white">Edit Data Siswa</h3>
              <button onClick={() => setIsEditOpen(false)} className="p-1 rounded-lg hover:bg-slate-800 text-slate-500 hover:text-slate-300">
                <X size={16} />
              </button>
            </div>

            {errorMsg && (
              <div className="rounded-lg border border-rose-500/20 bg-rose-500/10 p-3 text-xs text-rose-400">
                {errorMsg}
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Nama */}
              <div className="space-y-1 sm:col-span-2">
                <label className="text-xs font-semibold text-slate-400">Nama Lengkap Siswa</label>
                <input
                  type="text"
                  value={editNama}
                  onChange={(e) => setEditNama(e.target.value)}
                  placeholder="Nama Lengkap..."
                  className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3 py-2 text-xs text-white outline-none focus:border-indigo-500/50"
                />
              </div>

              {/* NIS */}
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-400">NIS / Username</label>
                <input
                  type="text"
                  value={editNis}
                  onChange={(e) => setEditNis(e.target.value)}
                  placeholder="NIS..."
                  className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3 py-2 text-xs text-white outline-none focus:border-indigo-500/50 font-mono"
                />
              </div>

              {/* Kelas */}
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-400">Kelas</label>
                <select
                  value={editKelasId}
                  onChange={(e) => setEditKelasId(e.target.value)}
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

              {/* Tempat Lahir */}
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-400">Tempat Lahir</label>
                <input
                  type="text"
                  value={editTempatLahir}
                  onChange={(e) => setEditTempatLahir(e.target.value)}
                  placeholder="Contoh: Bandung"
                  className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3 py-2 text-xs text-white outline-none focus:border-indigo-500/50"
                />
              </div>

              {/* Tanggal Lahir */}
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-400">Tanggal Lahir</label>
                <input
                  type="text"
                  value={editTanggalLahir}
                  onChange={(e) => setEditTanggalLahir(e.target.value)}
                  placeholder="Contoh: 12 April 2009"
                  className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3 py-2 text-xs text-white outline-none focus:border-indigo-500/50"
                />
              </div>

              {/* Jenis Kelamin */}
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-400">Jenis Kelamin</label>
                <select
                  value={editJenisKelamin}
                  onChange={(e) => setEditJenisKelamin(e.target.value)}
                  className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3 py-2 text-xs text-white outline-none focus:border-indigo-500/50"
                >
                  <option value="">-- Pilih Jenis Kelamin --</option>
                  <option value="Laki-laki">Laki-laki</option>
                  <option value="Perempuan">Perempuan</option>
                </select>
              </div>

              {/* No. HP */}
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-400">No. HP / WhatsApp Wali</label>
                <input
                  type="text"
                  value={editNoHp}
                  onChange={(e) => setEditNoHp(e.target.value)}
                  placeholder="Contoh: 08123456789"
                  className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3 py-2 text-xs text-white outline-none focus:border-indigo-500/50"
                />
              </div>

              {/* Nama Wali */}
              <div className="space-y-1 sm:col-span-2">
                <label className="text-xs font-semibold text-slate-400">Nama Orang Tua / Wali</label>
                <input
                  type="text"
                  value={editNamaWali}
                  onChange={(e) => setEditNamaWali(e.target.value)}
                  placeholder="Nama Orang Tua / Wali..."
                  className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3 py-2 text-xs text-white outline-none focus:border-indigo-500/50"
                />
              </div>

              {/* Alamat */}
              <div className="space-y-1 sm:col-span-2">
                <label className="text-xs font-semibold text-slate-400">Alamat Lengkap</label>
                <textarea
                  value={editAlamat}
                  onChange={(e) => setEditAlamat(e.target.value)}
                  placeholder="Alamat Lengkap..."
                  rows={2}
                  className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3 py-2 text-xs text-white outline-none focus:border-indigo-500/50 resize-none"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 border-t border-slate-800 pt-3">
              <button
                onClick={() => setIsEditOpen(false)}
                className="px-4 py-2 rounded-lg text-xs font-semibold text-slate-400 hover:bg-slate-800 hover:text-slate-200 transition-colors"
              >
                Batal
              </button>
              <button
                onClick={handleEditSubmit}
                disabled={isSubmitting}
                className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold bg-indigo-500 text-white hover:bg-indigo-600 disabled:opacity-50 transition-colors"
              >
                {isSubmitting ? <Loader2 size={13} className="animate-spin" /> : null}
                {isSubmitting ? 'Menyimpan...' : 'Simpan Perubahan'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
