/**
 * @file app/admin/pengguna/page.tsx
 * @description Admin page for managing all system users.
 *              Fetches users and classes from database and passes them to the PenggunaClientPage.
 * @module SIAKAD PPLG — Admin Manajemen Pengguna
 */

import type { Metadata } from 'next';
import prisma from '@/lib/prisma';
import { Users } from 'lucide-react';
import PenggunaClientPage from './PenggunaClientPage';

export const metadata: Metadata = {
  title: 'Manajemen Pengguna — SIAKAD PPLG',
};

export default async function PenggunaPage() {
  // Ambil semua pengguna beserta role dan nama siswa
  const usersRaw = await prisma.user.findMany({
    include: {
      role: true,
      student: { select: { nama: true } },
      teacher: { select: { nama: true } },
    },
    orderBy: { createdAt: 'desc' },
  });

  // Ambil semua kelas untuk form pendaftaran siswa
  const classesRaw = await prisma.class.findMany({
    select: {
      id: true,
      namaKelas: true,
    },
    orderBy: { namaKelas: 'asc' },
  });

  // Serialisasi tanggal untuk menghindari masalah pengiriman props
  const users = usersRaw.map((u) => ({
    ...u,
    createdAt: u.createdAt.toISOString(),
  }));

  const classes = classesRaw.map((c) => ({
    id: c.id,
    namaKelas: c.namaKelas,
  }));

  return (
    <div className="min-h-screen bg-slate-950 px-6 py-10">
      {/* ── Page header ── */}
      <div className="mb-8">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-500/20">
            <Users className="h-5 w-5 text-indigo-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">Manajemen Pengguna</h1>
            <p className="text-sm text-slate-500">Kelola data login, role, dan akun pengguna sistem</p>
          </div>
        </div>
      </div>

      {/* ── Client Interactive Page ── */}
      <PenggunaClientPage users={users} classes={classes} />
    </div>
  );
}

