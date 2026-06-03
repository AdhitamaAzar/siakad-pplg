// =============================================================================
// FILE: app/siswa/dashboard/page.tsx
// TUJUAN: Dashboard siswa yang disederhanakan untuk orang tua siswa.
//         - Menampilkan informasi data penting siswa (Wali, Alamat, TTL, dll)
//         - Menyembunyikan seluruh grafik dan rekap nilai/raport.
//         - Menampilkan persentase kehadiran secara sederhana dan mudah dibaca.
//         - Menampilkan catatan evaluasi guru terbaru.
// =============================================================================

import type { Metadata } from "next";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { CalendarCheck, Star, MessageSquare, User, MapPin, Phone, Calendar, Heart } from "lucide-react";
import prisma from "@/lib/prisma";
import Link from "next/link";

export const metadata: Metadata = { title: "Dashboard Siswa — SIAKAD PPLG" };
export const revalidate = 0; // Disable caching to reflect updates instantly

const SEMESTER     = "Genap";
const TAHUN_AJARAN = "2025/2026";

export default async function SiswaDashboardPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  // Cari data siswa berdasarkan userId dari session
  const student = await prisma.student.findUnique({
    where: { userId: Number(session.user.id) },
    include: {
      kelas: true,
      attendances: {
        where: { semester: SEMESTER, tahunAjaran: TAHUN_AJARAN },
        take: 1,
      },
      notes: {
        orderBy: { createdAt: "desc" },
        take: 5,
        include: {
          teacher: {
            select: { nama: true },
          },
        },
      },
    },
  });

  // Jika tidak ditemukan (mis. user admin), tampilkan pesan
  if (!student) {
    return (
      <div className="min-h-screen bg-slate-950 p-6 flex items-center justify-center">
        <div className="rounded-2xl border border-slate-800 bg-slate-900 p-8 text-center max-w-sm">
          <p className="text-slate-400">Data profil siswa tidak ditemukan.</p>
        </div>
      </div>
    );
  }

  const attendance = student.attendances[0] ?? null;
  const jam  = new Date().getHours();
  const sapa = jam < 11 ? "Selamat Pagi" : jam < 15 ? "Selamat Siang" : jam < 18 ? "Selamat Sore" : "Selamat Malam";

  return (
    <div className="space-y-6 max-w-[1000px] bg-slate-950 px-2 py-4">

      {/* ── GREETING ── */}
      <div
        className="rounded-2xl p-6 border border-indigo-500/20 relative overflow-hidden"
        style={{ background: "linear-gradient(135deg, rgba(99,102,241,0.08), rgba(79,70,229,0.04))" }}
      >
        <div className="absolute right-6 top-1/2 -translate-y-1/2 opacity-5">
          <Star size={100} />
        </div>
        <div className="relative z-10">
          <p className="text-indigo-300 text-sm font-medium mb-1">{sapa}, Bapak/Ibu Wali Murid dari</p>
          <h1 className="text-2xl font-bold text-white">{student.nama} 👋</h1>
          <div className="flex items-center gap-3 mt-2 flex-wrap text-slate-400 text-sm">
            <span>Kelas: {student.kelas.namaKelas}</span>
            <span className="text-slate-700">·</span>
            <span className="text-slate-400 font-mono text-xs">NIS: {student.nis}</span>
            <span className="text-slate-700">·</span>
            <span>Semester {SEMESTER} • {TAHUN_AJARAN}</span>
          </div>
        </div>
      </div>

      {/* ── MAIN CONTENT: PROFILE INFO & STATS ── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">

        {/* 1. DATA PENTING SISWA (Left - 2 Cols) */}
        <div className="md:col-span-2 space-y-4">
          <div className="rounded-2xl border border-slate-800/60 bg-slate-900/60 p-6 backdrop-blur-sm space-y-5">
            <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
              <div className="w-8 h-8 rounded-lg bg-indigo-500/10 flex items-center justify-center">
                <User size={16} className="text-indigo-400" />
              </div>
              <h2 className="text-base font-bold text-white">Informasi Penting Siswa</h2>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4">
              {/* Nama Orang Tua / Wali */}
              <div className="space-y-1">
                <span className="text-xs text-slate-500 block">Nama Orang Tua / Wali</span>
                <span className="text-sm font-semibold text-white block">
                  {student.namaWali || <span className="text-slate-600 font-normal italic">Belum diisi</span>}
                </span>
              </div>

              {/* No. HP / WhatsApp Wali */}
              <div className="space-y-1">
                <span className="text-xs text-slate-500 block">No. HP / WhatsApp Wali</span>
                <span className="text-sm font-semibold text-white flex items-center gap-1.5">
                  <Phone size={13} className="text-slate-500" />
                  {student.noHp || <span className="text-slate-600 font-normal italic">Belum diisi</span>}
                </span>
              </div>

              {/* Tempat & Tanggal Lahir */}
              <div className="space-y-1">
                <span className="text-xs text-slate-500 block">Tempat & Tanggal Lahir</span>
                <span className="text-sm font-semibold text-white flex items-center gap-1.5">
                  <Calendar size={13} className="text-slate-500" />
                  {student.tempatLahir && student.tanggalLahir ? (
                    `${student.tempatLahir}, ${student.tanggalLahir}`
                  ) : student.tempatLahir || student.tanggalLahir ? (
                    student.tempatLahir || student.tanggalLahir
                  ) : (
                    <span className="text-slate-600 font-normal italic">Belum diisi</span>
                  )}
                </span>
              </div>

              {/* Jenis Kelamin */}
              <div className="space-y-1">
                <span className="text-xs text-slate-500 block">Jenis Kelamin</span>
                <span className="text-sm font-semibold text-white flex items-center gap-1.5">
                  <Heart size={13} className="text-slate-500" />
                  {student.jenisKelamin || <span className="text-slate-600 font-normal italic">Belum diisi</span>}
                </span>
              </div>

              {/* Alamat Lengkap */}
              <div className="space-y-1 sm:col-span-2">
                <span className="text-xs text-slate-500 block">Alamat Lengkap</span>
                <span className="text-sm font-semibold text-white flex items-start gap-1.5 leading-relaxed">
                  <MapPin size={13} className="text-slate-500 mt-1 shrink-0" />
                  {student.alamat || <span className="text-slate-600 font-normal italic">Belum diisi</span>}
                </span>
              </div>
            </div>
          </div>

          {/* KEHADIRAN (ATTENDANCE CARD) */}
          <div className="rounded-2xl border border-slate-800/60 bg-slate-900/60 p-6 backdrop-blur-sm">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-sky-500/10 flex items-center justify-center">
                  <CalendarCheck size={20} className="text-sky-400" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">Kehadiran Siswa</h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {attendance 
                      ? `Siswa hadir ${attendance.totalHadir} kali, tidak hadir ${attendance.totalTidakHadir} kali` 
                      : "Belum ada rekap kehadiran semester ini"}
                  </p>
                </div>
              </div>
              <div className="text-right shrink-0">
                <p className="text-3xl font-extrabold text-sky-400">
                  {attendance ? `${attendance.persentaseHadir}%` : "—"}
                </p>
                <span className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider block mt-0.5">Persentase</span>
              </div>
            </div>
          </div>
        </div>

        {/* 2. CATATAN GURU (Right - 1 Col) */}
        <div className="rounded-2xl border border-slate-800/60 bg-slate-900/60 p-6 backdrop-blur-sm flex flex-col justify-between space-y-4">
          <div className="space-y-4">
            <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
              <MessageSquare size={16} className="text-indigo-400" />
              <h3 className="text-sm font-bold text-white uppercase tracking-wider">Catatan & Evaluasi Guru</h3>
            </div>

            <div className="space-y-4 max-h-[22rem] overflow-y-auto pr-1">
              {student.notes.length === 0 ? (
                <div className="text-center py-12">
                  <p className="text-xs text-slate-500 leading-relaxed">
                    Belum ada catatan atau evaluasi perkembangan dari guru saat ini.
                  </p>
                </div>
              ) : (
                student.notes.map((note) => (
                  <div key={note.id} className="rounded-xl border border-slate-800 bg-slate-950/40 p-3.5 space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-xs font-bold text-slate-200 truncate max-w-[70%]">
                        {note.judulProyek || "Kegiatan / Evaluasi"}
                      </span>
                      <span className="text-[9px] text-slate-500 shrink-0">
                        {new Date(note.createdAt).toLocaleDateString("id-ID", { day: "numeric", month: "short" })}
                      </span>
                    </div>
                    <p className="text-xs text-slate-400 leading-relaxed whitespace-pre-line">
                      {note.catatan}
                    </p>
                    <div className="text-[10px] text-slate-500 pt-1.5 border-t border-slate-800/40">
                      Oleh: <span className="font-semibold text-slate-400">{note.teacher.nama}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {student.notes.length > 0 && (
            <div className="pt-3 border-t border-slate-800/60 text-center">
              <Link
                href="/siswa/catatan"
                className="text-xs font-semibold text-indigo-400 hover:text-indigo-300 transition-colors"
              >
                Lihat Seluruh Catatan Guru &rarr;
              </Link>
            </div>
          )}
        </div>
      </div>

    </div>
  );
}
