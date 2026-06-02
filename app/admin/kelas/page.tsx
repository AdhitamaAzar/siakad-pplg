/**
 * @file app/admin/kelas/page.tsx
 * @description Admin page for viewing and managing all classes (kelas) in the system.
 *              Fetches class data and passes it to the interactive KelasClientPage.
 * @module SIAKAD PPLG — Admin Manajemen Kelas
 */

import type { Metadata } from 'next';
import prisma from '@/lib/prisma';
import KelasClientPage from './KelasClientPage';

export const metadata: Metadata = {
  title: 'Manajemen Kelas — SIAKAD PPLG',
};

export default async function KelasPage() {
  // Ambil data semua kelas beserta jumlah siswa terdaftar
  const classes = await prisma.class.findMany({
    include: {
      _count: { select: { students: true } },
    },
    orderBy: { namaKelas: 'asc' },
  });

  return (
    <div className="min-h-screen bg-slate-950 px-6 py-10">
      <KelasClientPage initialClasses={classes} />
    </div>
  );
}

