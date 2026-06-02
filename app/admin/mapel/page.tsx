/**
 * @file app/admin/mapel/page.tsx
 * @description Admin page for viewing and managing all subjects (mata pelajaran) in the system.
 *              Fetches subject data and passes it to the interactive MapelClientPage.
 * @module SIAKAD PPLG — Admin Manajemen Mata Pelajaran
 */

import type { Metadata } from 'next';
import prisma from '@/lib/prisma';
import MapelClientPage from './MapelClientPage';

export const metadata: Metadata = {
  title: 'Manajemen Mata Pelajaran — SIAKAD PPLG',
};

export default async function MapelPage() {
  // Ambil data semua mata pelajaran beserta jumlah guru yang mengajar
  const subjects = await prisma.subject.findMany({
    include: {
      _count: { select: { teacherClassSubjects: true } },
    },
    orderBy: { namaMapel: 'asc' },
  });

  return (
    <div className="min-h-screen bg-slate-950 px-6 py-10">
      <MapelClientPage initialSubjects={subjects} />
    </div>
  );
}
