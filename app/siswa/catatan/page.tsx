// =============================================================================
// FILE: app/siswa/catatan/page.tsx
// TUJUAN: Halaman catatan guru dan masukan proyek/kegiatan untuk siswa/orang tua yang login.
//         Server Component: mengambil data Note milik siswa dari database.
//         Menyembunyikan detail nilai/skor agar fokus pada evaluasi kualitatif.
// =============================================================================

import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { MessageSquare, Heart, Calendar, User, BookOpen } from "lucide-react";

export const metadata: Metadata = { title: "Catatan Evaluasi Guru — Portal Siswa" };

export default async function CatatanSiswaPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  // Cari data siswa berdasarkan userId dari session
  const student = await prisma.student.findUnique({
    where: { userId: Number(session.user.id) },
  });

  if (!student) {
    return (
      <div className="rounded-2xl border border-slate-800/60 bg-slate-900/40 p-8 text-center bg-slate-950">
        <p className="text-slate-400">Data siswa tidak ditemukan.</p>
      </div>
    );
  }

  // Tarik catatan dari guru untuk siswa ini
  const notes = await prisma.note.findMany({
    where: { studentId: student.id },
    include: {
      teacher: {
        select: { nama: true },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="space-y-6 max-w-3xl bg-slate-950 px-2 py-4">
      {/* ── HEADER ── */}
      <div>
        <div className="flex items-center gap-2 mb-1">
          <MessageSquare className="h-6 w-6 text-amber-400" />
          <h1 className="text-xl font-bold text-white">Catatan & Evaluasi Guru</h1>
        </div>
        <p className="text-slate-500 text-sm">
          Saran, bimbingan, dan evaluasi masukan dari bapak/ibu guru pengajar.
        </p>
      </div>

      {/* ── LOG LIST ── */}
      {notes.length === 0 ? (
        <div className="rounded-2xl border border-slate-800/60 bg-slate-900/40 p-10 flex flex-col items-center justify-center text-center min-h-[300px]">
          <div className="w-16 h-16 rounded-full bg-slate-850 flex items-center justify-center text-3xl mb-4 border border-slate-800/30">
            💌
          </div>
          <h2 className="text-lg font-semibold text-white mb-2">Belum ada catatan dari guru</h2>
          <p className="text-sm text-slate-400 max-w-md">
            Guru pengajar belum mengirimkan catatan atau feedback khusus untuk Anda saat ini.
          </p>
          <div className="mt-6 flex items-center gap-2 px-3 py-1.5 rounded-full bg-amber-500/10 text-[11px] text-amber-400 border border-amber-500/20">
            <Heart className="h-3.5 w-3.5 shrink-0 fill-current" />
            <span>Tetap semangat belajar!</span>
          </div>
        </div>
      ) : (
        <div className="space-y-5">
          {notes.map((note) => (
            <div
              key={note.id}
              className="rounded-2xl border border-slate-800/60 bg-slate-900/40 p-5 space-y-4"
            >
              {/* Info Header */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800/40 pb-3">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 bg-amber-500/10 text-amber-400 rounded-xl border border-amber-500/20 shrink-0">
                    <BookOpen size={16} />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-slate-200 leading-tight">
                      {note.judulProyek || "Kegiatan / Evaluasi"}
                    </h3>
                    <div className="flex items-center gap-2 mt-1 text-[11px] text-slate-500 flex-wrap">
                      <span className="flex items-center gap-1">
                        <User size={12} className="text-slate-600" />
                        Guru: <span className="text-slate-400 font-semibold">{note.teacher.nama}</span>
                      </span>
                      <span>·</span>
                      <span className="flex items-center gap-1">
                        <Calendar size={12} className="text-slate-600" />
                        {note.createdAt.toLocaleDateString("id-ID", { dateStyle: "long" })}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Catatan / Feedback */}
              <div className="text-sm text-slate-350 leading-relaxed whitespace-pre-line p-4 rounded-xl border border-white/5 bg-slate-950/20">
                {note.catatan}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
