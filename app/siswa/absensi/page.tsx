// =============================================================================
// FILE: app/siswa/absensi/page.tsx
// TUJUAN: Halaman absensi pribadi siswa yang sedang login.
//         Menampilkan total hadir, sakit, izin, alpha, dan persentase.
//         Server Component — data dari Prisma.
// SEMESTER: Genap 2025/2026
// =============================================================================

import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";
import {
  CalendarCheck,
  CalendarX,
  CalendarClock,
  CalendarOff,
  BarChart3,
  AlertTriangle,
  Info,
} from "lucide-react";

import { getActiveAcademicConfig } from "@/lib/academicConfig";

export const metadata: Metadata = { title: "Absensi Saya" };

// ─── HELPERS ─────────────────────────────────────────────────────────────────

function getPersenColor(persen: number): string {
  if (persen >= 90) return "text-emerald-400";
  if (persen >= 80) return "text-indigo-400";
  if (persen >= 60) return "text-amber-400";
  return "text-rose-400";
}

function getPersenBg(persen: number): string {
  if (persen >= 90) return "border-emerald-500/30 bg-emerald-500/5";
  if (persen >= 80) return "border-indigo-500/30 bg-indigo-500/5";
  if (persen >= 60) return "border-amber-500/30 bg-amber-500/5";
  return "border-rose-500/30 bg-rose-500/5";
}

// ─── PAGE ─────────────────────────────────────────────────────────────────────

export default async function SiswaAbsensiPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const { tahunAjaran: TAHUN_AJARAN, semester: SEMESTER } = await getActiveAcademicConfig();

  // Ambil data siswa
  const student = await prisma.student.findUnique({
    where: { userId: Number(session.user.id) },
    include: { kelas: true },
  });

  if (!student) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-slate-500">Data siswa tidak ditemukan.</p>
      </div>
    );
  }

  // Ambil data absensi semester ini
  const absensi = await prisma.attendance.findFirst({
    where: {
      studentId:   student.id,
      semester:    SEMESTER,
      tahunAjaran: TAHUN_AJARAN,
    },
  });

  const persen = absensi?.persentaseHadir ?? null;

  // Hitung total tidak hadir dari field yang tersedia
  const totalTidakHadir  = absensi?.totalTidakHadir ?? null;
  const totalHadir       = absensi?.totalHadir ?? null;
  const totalPertemuan   = totalHadir !== null && totalTidakHadir !== null
    ? totalHadir + totalTidakHadir
    : null;

  const memenuhi = persen !== null ? persen >= 80 : null;

  return (
    <div className="space-y-6 max-w-3xl">

      {/* ── Header ─────────────────────────────────────────────────────── */}
      <div>
        <h1 className="text-xl font-bold text-white flex items-center gap-2">
          <CalendarCheck size={18} className="text-emerald-400" />
          Absensi Saya
        </h1>
        <p className="text-slate-500 text-sm mt-1">
          Semester {SEMESTER} {TAHUN_AJARAN} · {student.kelas.namaKelas}
        </p>
      </div>

      {/* ── Peringatan / Info kehadiran ──────────────────────────────── */}
      <div
        className={`
          flex items-start gap-3 rounded-2xl border p-4 text-sm
          ${memenuhi === false
            ? "border-rose-500/30 bg-rose-500/5 text-rose-300"
            : memenuhi === true
            ? "border-emerald-500/30 bg-emerald-500/5 text-emerald-300"
            : "border-amber-500/30 bg-amber-500/5 text-amber-300"}
        `}
      >
        {memenuhi === false ? (
          <AlertTriangle size={16} className="mt-0.5 shrink-0 text-rose-400" />
        ) : (
          <Info size={16} className="mt-0.5 shrink-0" />
        )}
        <span>
          {memenuhi === false
            ? `Kehadiran Anda ${persen?.toFixed(1)}% masih di bawah minimal 80%. Harap segera koordinasi dengan wali kelas.`
            : memenuhi === true
            ? `Kehadiran Anda ${persen?.toFixed(1)}% sudah memenuhi syarat mengikuti ujian (≥80%).`
            : "Kehadiran minimal 80% untuk mengikuti ujian akhir semester."}
        </span>
      </div>

      {/* ── Stat cards ──────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">

        {/* Hadir */}
        <div className="rounded-2xl border border-emerald-500/25 bg-emerald-500/5 p-5">
          <div className="flex items-center gap-2 mb-3">
            <CalendarCheck size={16} className="text-emerald-400" />
            <span className="text-xs font-semibold text-emerald-400 uppercase tracking-wider">
              Hadir
            </span>
          </div>
          <span className="text-4xl font-black text-emerald-400 tabular-nums leading-none">
            {totalHadir ?? "—"}
          </span>
          <p className="text-xs text-slate-600 mt-1">pertemuan</p>
        </div>

        {/* Total Tidak Hadir */}
        <div className="rounded-2xl border border-rose-500/25 bg-rose-500/5 p-5">
          <div className="flex items-center gap-2 mb-3">
            <CalendarX size={16} className="text-rose-400" />
            <span className="text-xs font-semibold text-rose-400 uppercase tracking-wider">
              Tidak Hadir
            </span>
          </div>
          <span className="text-4xl font-black text-rose-400 tabular-nums leading-none">
            {totalTidakHadir ?? "—"}
          </span>
          <p className="text-xs text-slate-600 mt-1">pertemuan</p>
        </div>

        {/* Total Pertemuan */}
        <div className="rounded-2xl border border-slate-700/40 bg-slate-900/40 p-5 col-span-2 sm:col-span-1">
          <div className="flex items-center gap-2 mb-3">
            <CalendarClock size={16} className="text-slate-400" />
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Total
            </span>
          </div>
          <span className="text-4xl font-black text-slate-300 tabular-nums leading-none">
            {totalPertemuan ?? "—"}
          </span>
          <p className="text-xs text-slate-600 mt-1">total pertemuan</p>
        </div>
      </div>

      {/* ── Persentase kehadiran (big card) ─────────────────────────── */}
      {persen !== null ? (
        <div
          className={`rounded-2xl border p-6 ${getPersenBg(persen)}`}
        >
          <div className="flex items-center gap-2 mb-4">
            <BarChart3 size={16} className={getPersenColor(persen)} />
            <span className={`text-xs font-semibold uppercase tracking-wider ${getPersenColor(persen)}`}>
              Persentase Kehadiran
            </span>
          </div>

          <div className="flex items-end gap-2 mb-5">
            <span
              className={`text-6xl font-black tabular-nums leading-none ${getPersenColor(persen)}`}
            >
              {persen.toFixed(1)}
            </span>
            <span className={`text-2xl font-bold mb-1 ${getPersenColor(persen)}`}>%</span>
          </div>

          {/* Progress bar */}
          <div className="relative h-3 rounded-full bg-slate-800">
            <div
              className={`
                absolute left-0 top-0 h-3 rounded-full transition-all duration-700
                ${persen >= 90 ? "bg-emerald-500" : persen >= 80 ? "bg-indigo-500" : persen >= 60 ? "bg-amber-500" : "bg-rose-500"}
              `}
              style={{ width: `${Math.min(persen, 100)}%` }}
            />
            {/* Marker 80% */}
            <div
              className="absolute top-0 h-3 w-0.5 bg-white/20"
              style={{ left: "80%" }}
              title="Batas minimal 80%"
            />
          </div>

          <div className="flex items-center justify-between mt-2 text-xs text-slate-600">
            <span>0%</span>
            <span className="text-slate-500">▲ minimal 80%</span>
            <span>100%</span>
          </div>
        </div>
      ) : (
        <div className="rounded-2xl border border-slate-800/60 bg-slate-900/40 p-8 text-center">
          <CalendarOff size={32} className="text-slate-700 mx-auto mb-3" />
          <p className="text-slate-500 text-sm">Data absensi belum tersedia</p>
          <p className="text-slate-700 text-xs mt-1">
            Hubungi guru untuk memperbarui data absensi
          </p>
        </div>
      )}

      {/* ── Catatan penting ──────────────────────────────────────────── */}
      <div className="rounded-2xl border border-amber-500/20 bg-amber-500/5 p-4">
        <div className="flex items-start gap-3">
          <Info size={15} className="text-amber-400 mt-0.5 shrink-0" />
          <div className="text-xs text-amber-300/80 space-y-1">
            <p className="font-semibold text-amber-300">Catatan Penting</p>
            <p>Kehadiran minimal <span className="font-bold text-amber-200">80%</span> untuk dapat mengikuti Ujian Akhir Semester.</p>
            <p>Data absensi diimport dari sheet Excel oleh guru setiap minggu.</p>
          </div>
        </div>
      </div>

      <p className="text-xs text-slate-700 text-center pb-2">
        Data absensi dikelola guru · Hubungi guru jika ada perbedaan data
      </p>
    </div>
  );
}
