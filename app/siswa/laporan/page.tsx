// =============================================================================
// FILE: app/siswa/laporan/page.tsx
// TUJUAN: Laporan akhir semester untuk siswa — status tugas laporan & absensi.
//         Menyembunyikan nilai/skor akademik untuk menjaga privasi nilai.
// =============================================================================

import type { Metadata } from "next";
import { auth }          from "@/lib/auth";
import { redirect }      from "next/navigation";
import prisma            from "@/lib/prisma";
import { FileText, CheckCircle2, XCircle, CalendarCheck, CheckSquare } from "lucide-react";

import { getActiveAcademicConfig } from "@/lib/academicConfig";

export const metadata: Metadata = { title: "Laporan Akhir — Portal Siswa" };

export default async function SiswaLaporanPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const { tahunAjaran: TAHUN_AJARAN, semester: SEMESTER } = await getActiveAcademicConfig();

  const student = await prisma.student.findUnique({
    where:   { userId: Number(session.user.id) },
    include: {
      kelas:       true,
      attendances: { where: { semester: SEMESTER, tahunAjaran: TAHUN_AJARAN }, take: 1 },
      reports:     { where: { semester: SEMESTER, tahunAjaran: TAHUN_AJARAN }, take: 1 },
    },
  });

  if (!student) {
    return (
      <div className="rounded-2xl border border-slate-800/60 bg-slate-900/40 p-8 text-center bg-slate-950">
        <p className="text-slate-400">Data siswa tidak ditemukan.</p>
      </div>
    );
  }

  const attendance = student.attendances[0] ?? null;
  const report     = student.reports[0]     ?? null;

  const checklistItems = [
    { label: "Tugas Laporan Keuangan / Kewirausahaan (H)", completed: report?.checklistH ?? false },
    { label: "Tugas Laporan Kerja Lapangan / Praktek (I)", completed: report?.checklistI ?? false },
    { label: "Tugas Laporan Dokumentasi Proyek (J)", completed: report?.checklistJ ?? false },
    { label: "Tugas Laporan Presentasi Akhir (K)", completed: report?.checklistK ?? false },
  ];

  return (
    <div className="space-y-6 max-w-[800px] bg-slate-950 px-2 py-4">
      {/* HEADER */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-indigo-500/10 flex items-center justify-center">
          <FileText size={20} className="text-indigo-400" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-white">Laporan Perkembangan Semester</h1>
          <p className="text-slate-500 text-sm">{SEMESTER} {TAHUN_AJARAN} · Kelas {student.kelas.namaKelas}</p>
        </div>
      </div>

      {/* Student Profile Card */}
      <div className="rounded-2xl border border-indigo-500/20 bg-indigo-500/5 p-6 flex items-center gap-4">
        <div className="w-16 h-16 rounded-2xl bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center text-2xl font-bold text-indigo-300">
          {student.nama.charAt(0)}
        </div>
        <div>
          <h2 className="text-lg font-bold text-white">{student.nama}</h2>
          <p className="text-slate-400 text-sm">NIS: {student.nis}</p>
          <p className="text-slate-500 text-xs">Wali Murid: {student.namaWali || "—"}</p>
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Kehadiran */}
        <div className="rounded-2xl border border-slate-800/60 bg-slate-900/60 p-5 flex items-center justify-between">
          <div>
            <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider block">Total Kehadiran</span>
            <span className="text-2xl font-bold text-white mt-1 block">
              {attendance ? `${attendance.persentaseHadir}%` : "—"}
            </span>
            <span className="text-xs text-slate-500 mt-1 block">
              {attendance ? `Siswa Hadir: ${attendance.totalHadir} kali` : "Belum ada rekap"}
            </span>
          </div>
          <CalendarCheck size={28} className="text-sky-400 opacity-60" />
        </div>

        {/* Status Kelulusan */}
        <div className="rounded-2xl border border-slate-800/60 bg-slate-900/60 p-5 flex items-center justify-between">
          <div>
            <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider block">Status Akhir</span>
            <span className="text-xl font-bold text-white mt-1 block">
              {report?.statusKelulusan || "DALAM PROSES"}
            </span>
            <span className="text-xs text-slate-500 mt-1 block">
              Tahun Ajaran {TAHUN_AJARAN}
            </span>
          </div>
          <CheckSquare size={28} className="text-emerald-400 opacity-60" />
        </div>
      </div>

      {/* Checklist Laporan */}
      <div className="rounded-2xl border border-slate-800/60 bg-slate-900/60 p-6 space-y-4">
        <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
          <CheckSquare size={16} className="text-indigo-400" />
          <h3 className="text-sm font-bold text-white uppercase tracking-wider">Checklist Tugas Laporan Akhir</h3>
        </div>

        <div className="space-y-3">
          {checklistItems.map((item, idx) => (
            <div key={idx} className="flex items-center justify-between p-3.5 rounded-xl border border-slate-800 bg-slate-950/40">
              <span className="text-xs text-slate-350">{item.label}</span>
              <div className="shrink-0 ml-4">
                {item.completed ? (
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-2.5 py-1 text-[11px] font-semibold text-emerald-400 ring-1 ring-emerald-500/30">
                    <CheckCircle2 size={12} />
                    Selesai
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-800 px-2.5 py-1 text-[11px] font-semibold text-slate-500 ring-1 ring-slate-700/30">
                    <XCircle size={12} />
                    Belum Kumpul
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

    </div>
  );
}
