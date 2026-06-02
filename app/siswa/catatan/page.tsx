// =============================================================================
// FILE: app/siswa/catatan/page.tsx
// TUJUAN: Halaman catatan guru dan masukan proyek untuk siswa yang login.
//         Server Component: mengambil data Note milik siswa dari database.
// =============================================================================

import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { MessageSquare, Heart, Award, Calendar, User, BookOpen } from "lucide-react";

export const metadata: Metadata = { title: "Catatan Guru — Portal Siswa" };

function ScoreCard({ label, val }: { label: string; val: number | null }) {
  return (
    <div className="rounded-lg bg-slate-950 border border-slate-800/60 p-2.5 text-center">
      <p className="text-[10px] uppercase font-semibold text-slate-500 tracking-wider">{label}</p>
      <p className={`text-sm font-black mt-1 ${val ? "text-indigo-400" : "text-slate-700"}`}>
        {val ?? "—"}
      </p>
    </div>
  );
}

export default async function CatatanSiswaPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  // Cari data siswa berdasarkan userId dari session
  const student = await prisma.student.findUnique({
    where: { userId: Number(session.user.id) },
  });

  if (!student) {
    return (
      <div className="rounded-2xl border border-slate-800/60 bg-slate-900/40 p-8 text-center">
        <p className="text-slate-400">Data siswa tidak ditemukan.</p>
      </div>
    );
  }

  // Tarik catatan proyek dari guru untuk siswa ini
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
    <div className="space-y-6 max-w-3xl">
      {/* ── HEADER ────────────────────────────────────────────────────────── */}
      <div>
        <div className="flex items-center gap-2 mb-1">
          <MessageSquare className="h-6 w-6 text-amber-400" />
          <h1 className="text-xl font-bold text-white">Catatan Guru</h1>
        </div>
        <p className="text-slate-500 text-sm">
          Pantau saran proyek, bimbingan portofolio, dan penilaian komponen tugas akhir Anda.
        </p>
      </div>

      {/* ── LOG LIST ────────────────────────────────────────────────────── */}
      {notes.length === 0 ? (
        <div className="rounded-2xl border border-slate-800/60 bg-slate-900/40 p-10 flex flex-col items-center justify-center text-center min-h-[300px]">
          <div className="w-16 h-16 rounded-full bg-slate-850 flex items-center justify-center text-3xl mb-4 border border-slate-800/30">
            💌
          </div>
          <h2 className="text-lg font-semibold text-white mb-2">Belum ada catatan dari guru</h2>
          <p className="text-sm text-slate-400 max-w-md">
            Guru pengajar belum mengirimkan catatan atau feedback khusus untuk Anda saat ini. Terus tingkatkan portofolio dan performa belajar Anda!
          </p>
          <div className="mt-6 flex items-center gap-2 px-3 py-1.5 rounded-full bg-amber-500/10 text-[11px] text-amber-400 border border-amber-500/20">
            <Heart className="h-3.5 w-3.5 shrink-0 fill-current" />
            <span>Tetap semangat belajar PPLG!</span>
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
                      {note.judulProyek || "Proyek Mandiri"}
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

                {/* Score badge */}
                {note.nilaiTotal && (
                  <div className="self-start sm:self-center flex items-center gap-2 bg-indigo-500/10 border border-indigo-500/20 px-3 py-1 rounded-full text-indigo-300">
                    <Award size={13} />
                    <span className="text-xs font-black">Skor Total: {note.nilaiTotal}</span>
                  </div>
                )}
              </div>

              {/* Catatan / Feedback */}
              <div className="text-sm text-slate-300 leading-relaxed whitespace-pre-line p-4 rounded-xl border border-white/5 bg-slate-950/20">
                {note.catatan}
              </div>

              {/* Detail Komponen Skor */}
              <div className="space-y-2">
                <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-widest block">Skor Penilaian Proyek</span>
                <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-8 gap-2">
                  <ScoreCard label="Item" val={note.nilaiItem} />
                  <ScoreCard label="Data" val={note.nilaiData} />
                  <ScoreCard label="Alur" val={note.nilaiAlur} />
                  <ScoreCard label="Metode" val={note.nilaiMetode} />
                  <ScoreCard label="Inovasi" val={note.nilaiTambah} />
                  <ScoreCard label="Saji" val={note.nilaiUrutan} />
                  <ScoreCard label="TA1" val={note.nilaiTa1} />
                  <div className="rounded-lg bg-indigo-500/10 border border-indigo-500/20 p-2.5 text-center">
                    <p className="text-[10px] uppercase font-bold text-indigo-400 tracking-wider">Total</p>
                    <p className="text-sm font-black mt-1 text-indigo-300">
                      {note.nilaiTotal ?? "—"}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
