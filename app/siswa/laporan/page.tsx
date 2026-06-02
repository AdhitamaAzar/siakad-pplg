// =============================================================================
// FILE: app/siswa/laporan/page.tsx
// TUJUAN: Laporan akhir semester untuk siswa — ringkasan lengkap nilai & absensi.
// =============================================================================

import type { Metadata } from "next";
import { auth }          from "@/lib/auth";
import { redirect }      from "next/navigation";
import prisma            from "@/lib/prisma";
import { FileText, Award, CalendarCheck, TrendingUp } from "lucide-react";

export const metadata: Metadata = { title: "Laporan Akhir — Siswa" };

const SEMESTER     = "Genap";
const TAHUN_AJARAN = "2025/2026";

export default async function SiswaLaporanPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const student = await prisma.student.findUnique({
    where:   { userId: Number(session.user.id) },
    include: {
      kelas:       true,
      grades:      { where: { semester: SEMESTER, tahunAjaran: TAHUN_AJARAN }, take: 1 },
      attendances: { where: { semester: SEMESTER, tahunAjaran: TAHUN_AJARAN }, take: 1 },
    },
  });

  if (!student) {
    return (
      <div className="rounded-2xl border border-slate-800/60 bg-slate-900/40 p-8 text-center">
        <p className="text-slate-400">Data siswa tidak ditemukan.</p>
      </div>
    );
  }

  const grade      = student.grades[0]      ?? null;
  const attendance = student.attendances[0] ?? null;

  return (
    <div className="space-y-6 max-w-[800px]">
      <div className="flex items-center gap-3">
        <FileText size={20} className="text-indigo-400" />
        <div>
          <h1 className="text-xl font-bold text-white">Laporan Akhir Semester</h1>
          <p className="text-slate-500 text-sm">{SEMESTER} {TAHUN_AJARAN} · {student.kelas.namaKelas}</p>
        </div>
      </div>

      {/* Student card */}
      <div className="rounded-2xl border border-indigo-500/20 bg-indigo-500/5 p-6 flex items-center gap-4">
        <div className="w-16 h-16 rounded-2xl bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center">
          <span className="text-2xl font-bold text-indigo-300">{student.nama.charAt(0)}</span>
        </div>
        <div>
          <h2 className="text-lg font-bold text-white">{student.nama}</h2>
          <p className="text-slate-400 text-sm">NIS: {student.nis}</p>
          <p className="text-slate-500 text-xs">{student.kelas.namaKelas}</p>
        </div>
      </div>

      {/* Ringkasan nilai */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="rounded-2xl border border-slate-800/60 bg-slate-900/60 p-4">
          <TrendingUp size={16} className="text-indigo-400 mb-2" />
          <p className="text-2xl font-bold text-white">{grade?.nilaiRaport ?? "—"}</p>
          <p className="text-xs text-slate-400 mt-0.5">Nilai Raport</p>
        </div>
        <div className="rounded-2xl border border-slate-800/60 bg-slate-900/60 p-4">
          <Award size={16} className="text-amber-400 mb-2" />
          <p className="text-lg font-bold text-white">{grade?.predikat ?? "—"}</p>
          <p className="text-xs text-slate-400 mt-0.5">Predikat</p>
        </div>
        <div className="rounded-2xl border border-slate-800/60 bg-slate-900/60 p-4">
          <CalendarCheck size={16} className="text-emerald-400 mb-2" />
          <p className="text-2xl font-bold text-white">{attendance?.persentaseHadir ?? "—"}{attendance ? "%" : ""}</p>
          <p className="text-xs text-slate-400 mt-0.5">Kehadiran</p>
        </div>
        <div className="rounded-2xl border border-slate-800/60 bg-slate-900/60 p-4">
          <div className={`w-3 h-3 rounded-full mb-2 ${grade?.statusTuntas === "TUNTAS" ? "bg-emerald-400" : "bg-rose-400"}`} />
          <p className="text-lg font-bold text-white">{grade?.statusTuntas ?? "—"}</p>
          <p className="text-xs text-slate-400 mt-0.5">Status</p>
        </div>
      </div>

      {/* Detail komponen */}
      {grade && (
        <div className="rounded-2xl border border-slate-800/60 bg-slate-900/60 overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-800/60">
            <h3 className="text-sm font-semibold text-slate-300">Detail Nilai Komponen</h3>
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-800/60">
                <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-500">Komponen</th>
                <th className="px-4 py-3 text-center text-[11px] font-semibold uppercase tracking-wider text-slate-500">Nilai</th>
                <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-500">Keterangan</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/40">
              {[
                { label: "Portfolio / Github", nilai: grade.nilaiGithub },
                { label: "Tugas API",          nilai: grade.nilaiApi },
                { label: "Admin Panel",        nilai: grade.nilaiAdminPanel },
                { label: "Landing Page",       nilai: grade.nilaiLandingPage },
                { label: "Kaggle Python",      nilai: grade.nilaiKagglePython },
                { label: "Kaggle SQL",         nilai: grade.nilaiKaggleSql },
                { label: "Kaggle ML",          nilai: grade.nilaiKaggleMl },
                { label: "Ujian ML",           nilai: grade.nilaiUjianMl },
                { label: "Ujian SQL",          nilai: grade.nilaiUjianSql },
              ].map(({ label, nilai }) => (
                <tr key={label} className="hover:bg-white/[0.02]">
                  <td className="px-4 py-2.5 text-slate-300 text-xs">{label}</td>
                  <td className="px-4 py-2.5 text-center">
                    <span className={`text-sm font-bold tabular-nums ${
                      nilai === null ? "text-slate-700" :
                      nilai >= 90 ? "text-emerald-400" :
                      nilai >= 75 ? "text-indigo-400" :
                      nilai >= 60 ? "text-amber-400" : "text-rose-400"
                    }`}>{nilai ?? "—"}</span>
                  </td>
                  <td className="px-4 py-2.5 text-xs text-slate-600">
                    {nilai === null ? "Belum dikerjakan" :
                     nilai >= 90 ? "Sangat Baik" :
                     nilai >= 75 ? "Baik" :
                     nilai >= 60 ? "Cukup" : "Perlu Bimbingan"}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t border-slate-700/60 bg-slate-800/30">
                <td className="px-4 py-3 text-xs font-semibold text-slate-400">Rata-rata</td>
                <td className="px-4 py-3 text-center text-sm font-bold text-indigo-300 tabular-nums">{grade.rataRata?.toFixed(1) ?? "—"}</td>
                <td className="px-4 py-3 text-xs text-slate-600">Nilai Raport: {grade.nilaiRaport ?? "—"}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}
    </div>
  );
}
