/**
 * @file app/admin/guru/page.tsx
 * @description Admin page for managing all teacher (guru) accounts and their teaching assignments.
 *              Fetches teacher, class, and subject data and passes them to GuruClientPage.
 * @module SIAKAD PPLG — Admin Data Guru
 */

import type { Metadata } from 'next';
import prisma from '@/lib/prisma';
import GuruClientPage from './GuruClientPage';

export const metadata: Metadata = {
  title: 'Manajemen Guru — SIAKAD PPLG',
};

export default async function GuruPage() {
  const teachersRaw = await prisma.teacher.findMany({
    include: {
      user: {
        select: {
          username: true,
          createdAt: true,
        },
      },
      classSubjects: {
        include: {
          kelas: {
            select: { id: true, namaKelas: true }
          },
          subject: {
            select: { id: true, namaMapel: true, kodeMapel: true }
          },
        },
        orderBy: { kelas: { namaKelas: 'asc' } }
      },
    },
    orderBy: { nama: 'asc' },
  });

  const classes = await prisma.class.findMany({
    select: { id: true, namaKelas: true },
    orderBy: { namaKelas: 'asc' },
  });

  const subjects = await prisma.subject.findMany({
    select: { id: true, namaMapel: true, kodeMapel: true },
    orderBy: { namaMapel: 'asc' },
  });

  // Serialize date
  const teachers = teachersRaw.map((t) => ({
    ...t,
    user: {
      ...t.user,
      createdAt: t.user.createdAt.toISOString(),
    },
  }));

  return (
    <div className="min-h-screen bg-slate-950 px-6 py-10">
      <GuruClientPage teachers={teachers} classes={classes} subjects={subjects} />
    </div>
  );
}
