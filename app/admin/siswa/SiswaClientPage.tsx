/**
 * @file app/admin/siswa/SiswaClientPage.tsx
 * @description Client component for Data Siswa admin page.
 *              Provides interactive filter tabs by kelas (class) and renders
 *              a dark-styled table with grade and predikat information.
 * @module SIAKAD PPLG — Admin Data Siswa (Client)
 */

'use client';

import { useState, useMemo } from 'react';
import { GraduationCap, Search, Star } from 'lucide-react';

// ─── Types ────────────────────────────────────────────────────────────────────
type Grade = {
  nilaiRaport: number | null;
  predikat: string | null;
};

type Student = {
  id: number;
  nama: string;
  nis: string;
  kelas: { id: number; namaKelas: string; tahunAjaran: string } | null;
  grades: Grade[];
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
export default function SiswaClientPage({ students }: { students: Student[] }) {
  const [activeKelas, setActiveKelas] = useState<string>('Semua');
  const [search, setSearch]           = useState('');

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
                {['No', 'Nama Siswa', 'NIS', 'Kelas', 'Nilai Raport', 'Predikat'].map((h) => (
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
                  <td colSpan={6} className="px-5 py-16 text-center">
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
                        <span className="font-medium text-white">{siswa.nama}</span>
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
    </div>
  );
}
