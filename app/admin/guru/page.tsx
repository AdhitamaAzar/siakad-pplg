/**
 * @file app/admin/guru/page.tsx
 * @description Admin page for viewing all teacher (guru) accounts.
 *              Fetches users with role name 'guru' and displays them in
 *              a styled dark table ordered alphabetically by username.
 * @module SIAKAD PPLG — Admin Data Guru
 */

import type { Metadata } from 'next';
import prisma from '@/lib/prisma';
import { BookOpen, UserCheck, Hash, AtSign, CalendarDays, Users } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Data Guru — SIAKAD PPLG',
};

// ─── Avatar placeholder ───────────────────────────────────────────────────────
function GuruAvatar({ username }: { username: string }) {
  const initials = username.slice(0, 2).toUpperCase();
  return (
    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-indigo-500/20 ring-1 ring-indigo-500/30">
      <span className="text-[11px] font-bold text-indigo-400">{initials}</span>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default async function GuruPage() {
  const gurus = await prisma.user.findMany({
    where: { role: { name: 'guru' } },
    include: { role: true },
    orderBy: { username: 'asc' },
  });

  return (
    <div className="min-h-screen bg-slate-950 px-6 py-10">
      {/* ── Page header ── */}
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-500/20">
            <BookOpen className="h-5 w-5 text-indigo-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">Data Guru</h1>
            <p className="text-sm text-slate-500">
              Daftar seluruh akun guru yang terdaftar di sistem
            </p>
          </div>
        </div>

        {/* Total badge */}
        <div className="inline-flex items-center gap-2 rounded-xl border border-indigo-500/20 bg-indigo-500/10 px-4 py-2">
          <Users className="h-4 w-4 text-indigo-400" />
          <span className="text-sm font-semibold text-indigo-300">
            {gurus.length} Guru Terdaftar
          </span>
        </div>
      </div>

      {/* ── Table ── */}
      <div className="rounded-2xl border border-slate-800/60 bg-slate-900/60 overflow-hidden backdrop-blur-sm">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-800/60 bg-slate-900/40">
                <th className="px-5 py-4 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                  <Hash className="inline h-3 w-3 mr-1" />No
                </th>
                <th className="px-5 py-4 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                  <AtSign className="inline h-3 w-3 mr-1" />Username
                </th>
                <th className="px-5 py-4 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                  Role
                </th>
                <th className="px-5 py-4 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                  <CalendarDays className="inline h-3 w-3 mr-1" />Bergabung
                </th>
                <th className="px-5 py-4 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                  Status
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/40">
              {gurus.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-5 py-16 text-center">
                    <div className="flex flex-col items-center gap-3">
                      <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-slate-800/60">
                        <BookOpen className="h-6 w-6 text-slate-600" />
                      </div>
                      <p className="text-sm text-slate-500">Belum ada data guru yang terdaftar.</p>
                    </div>
                  </td>
                </tr>
              ) : (
                gurus.map((guru, idx) => (
                  <tr key={guru.id} className="hover:bg-white/[0.02] transition-colors">
                    {/* No */}
                    <td className="px-5 py-4 text-sm text-slate-600">{idx + 1}</td>

                    {/* Username + avatar */}
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <GuruAvatar username={guru.username} />
                        <span className="font-medium text-white">{guru.username}</span>
                      </div>
                    </td>

                    {/* Role */}
                    <td className="px-5 py-4">
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-indigo-500/15 px-2.5 py-0.5 text-[11px] font-semibold text-indigo-400 ring-1 ring-indigo-500/30">
                        <BookOpen className="h-3 w-3" />
                        {guru.role?.name ?? 'guru'}
                      </span>
                    </td>

                    {/* Joined date */}
                    <td className="px-5 py-4 text-sm text-slate-400">
                      {new Date(guru.createdAt).toLocaleDateString('id-ID', {
                        day: '2-digit',
                        month: 'long',
                        year: 'numeric',
                      })}
                    </td>

                    {/* Status */}
                    <td className="px-5 py-4">
                      <span className="inline-flex items-center gap-1.5 text-xs">
                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 shadow-[0_0_4px_#34d399]" />
                        <span className="text-emerald-400 font-medium">Aktif</span>
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {gurus.length > 0 && (
          <div className="flex items-center justify-between border-t border-slate-800/60 px-5 py-3">
            <p className="text-xs text-slate-600">
              Menampilkan {gurus.length} guru • Diurutkan A–Z
            </p>
            <div className="flex items-center gap-1.5 text-xs text-slate-600">
              <UserCheck className="h-3.5 w-3.5" />
              <span>Semua guru aktif</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
