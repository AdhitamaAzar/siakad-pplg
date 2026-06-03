/**
 * @file app/admin/siswa/page.tsx
 * @description Admin page for viewing all students with class info and latest
 *              grade data. Includes client-side filter tabs by class (kelas).
 *              Data is fetched server-side ordered by class then name.
 * @module SIAKAD PPLG — Admin Data Siswa
 */

import type { Metadata } from 'next';
import prisma from '@/lib/prisma';
import { GraduationCap, Users, Award, Star } from 'lucide-react';
import SiswaClientPage from './SiswaClientPage';

export const metadata: Metadata = {
  title: 'Data Siswa — SIAKAD PPLG',
};

const SEMESTER      = 'Genap';
const TAHUN_AJARAN  = '2025/2026';

// ─── Page ─────────────────────────────────────────────────────────────────────
export default async function SiswaPage() {
  const students = await prisma.student.findMany({
    include: {
      kelas: true,
      grades: {
        where: { semester: SEMESTER, tahunAjaran: TAHUN_AJARAN },
        select: { nilaiRaport: true, predikat: true },
        take: 1,
      },
    },
    orderBy: [
      { kelas: { namaKelas: 'asc' } },
      { nama: 'asc' },
    ],
  });

  const classes = await prisma.class.findMany({
    orderBy: { namaKelas: 'asc' },
  });

  return (
    <div className="min-h-screen bg-slate-950 px-6 py-10">
      {/* ── Page header ── */}
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/20">
            <GraduationCap className="h-5 w-5 text-emerald-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">Data Siswa</h1>
            <p className="text-sm text-slate-500">
              Semester {SEMESTER} • Tahun Ajaran {TAHUN_AJARAN}
            </p>
          </div>
        </div>

        {/* Quick stats */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 rounded-xl border border-slate-800/60 bg-slate-900/60 px-4 py-2">
            <Users className="h-4 w-4 text-slate-500" />
            <span className="text-sm font-semibold text-white">{students.length}</span>
            <span className="text-xs text-slate-500">siswa</span>
          </div>
          <div className="flex items-center gap-2 rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-2">
            <Award className="h-4 w-4 text-emerald-400" />
            <span className="text-sm font-semibold text-emerald-300">
              {students.filter((s) => s.grades[0]?.nilaiRaport !== null && s.grades[0]?.nilaiRaport !== undefined).length}
            </span>
            <span className="text-xs text-emerald-500">sudah dinilai</span>
          </div>
        </div>
      </div>

      {/* ── Client component with filter tabs ── */}
      <SiswaClientPage students={students} classes={classes} />
    </div>
  );
}
