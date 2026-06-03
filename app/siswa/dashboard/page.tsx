// =============================================================================
// FILE: app/siswa/dashboard/page.tsx
// TUJUAN: Dashboard siswa — ringkasan nilai, grafik progress, absensi,
//         catatan guru terbaru, dan perkembangan akademik.
//         Server Component dengan data Prisma berdasarkan session siswa.
// =============================================================================

import type { Metadata } from "next";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { TrendingUp, CalendarCheck, Award, BookOpen, Star, MessageSquare } from "lucide-react";
import prisma from "@/lib/prisma";
import Link from "next/link";
import GrafikNilaiSiswa from "@/components/dashboard/GrafikNilaiSiswa";
import SubjectSelect from "../nilai/SubjectSelect";

export const metadata: Metadata = { title: "Dashboard Siswa" };
export const revalidate = 300;

const SEMESTER     = "Genap";
const TAHUN_AJARAN = "2025/2026";

/** Badge predikat */
function PredikatBadge({ predikat }: { predikat: string | null }) {
  if (!predikat) return <span className="text-slate-600 text-xs">—</span>;
  const cfg: Record<string, string> = {
    "Sangat Baik": "bg-emerald-500/15 text-emerald-300 border-emerald-500/30",
    "Baik":        "bg-indigo-500/15 text-indigo-300 border-indigo-500/30",
    "Cukup":       "bg-amber-500/15 text-amber-300 border-amber-500/30",
    "Perlu Bimbingan": "bg-rose-500/15 text-rose-300 border-rose-500/30",
  };
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${cfg[predikat] ?? "bg-slate-500/15 text-slate-300"}`}>
      {predikat}
    </span>
  );
}

interface PageProps {
  searchParams: Promise<{ mapel?: string }>;
}

export default async function SiswaDashboardPage({ searchParams }: PageProps) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const sp = await searchParams;

  const subjectsList = await prisma.subject.findMany({
    orderBy: { namaMapel: "asc" },
    select: { id: true, namaMapel: true, kodeMapel: true },
  });

  const activeSubjectId = sp.mapel ? Number(sp.mapel) : (subjectsList[0]?.id || 1);

  // Cari data siswa berdasarkan userId dari session
  const student = await prisma.student.findUnique({
    where: { userId: Number(session.user.id) },
    include: {
      kelas:  true,
      grades: {
        where: { semester: SEMESTER, tahunAjaran: TAHUN_AJARAN, subjectId: activeSubjectId },
        take: 1,
      },
      attendances: {
        where: { semester: SEMESTER, tahunAjaran: TAHUN_AJARAN },
        take: 1,
      },
      notes: {
        orderBy: { createdAt: "desc" },
        take: 3,
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
      <div className="rounded-2xl border border-slate-800/60 bg-slate-900/40 p-8 text-center">
        <p className="text-slate-400">Data siswa tidak ditemukan.</p>
      </div>
    );
  }

  const grade      = student.grades[0]      ?? null;
  const attendance = student.attendances[0] ?? null;

  // Hitung ranking kelas (berdasarkan nilaiRaport)
  let ranking: number | null = null;
  if (grade?.nilaiRaport) {
    const lebihTinggi = await prisma.grade.count({
      where: {
        semester:    SEMESTER,
        tahunAjaran: TAHUN_AJARAN,
        subjectId:   activeSubjectId,
        nilaiRaport: { gt: grade.nilaiRaport },
        student:     { kelasId: student.kelasId },
      },
    });
    ranking = lebihTinggi + 1;
  }

  const jam  = new Date().getHours();
  const sapa = jam < 11 ? "Selamat Pagi" : jam < 15 ? "Selamat Siang" : jam < 18 ? "Selamat Sore" : "Selamat Malam";

  const activeSubject = subjectsList.find((s) => s.id === activeSubjectId);
  const isRpl = activeSubject ? activeSubject.kodeMapel.toLowerCase().includes("pplg") : true;

  const componentsData = [
    { name: isRpl ? "Github" : "Tugas 1", nilai: grade?.nilaiGithub ?? null },
    { name: isRpl ? "API" : "Tugas 2", nilai: grade?.nilaiApi ?? null },
    { name: isRpl ? "Admin" : "Tugas 3", nilai: grade?.nilaiAdminPanel ?? null },
    { name: isRpl ? "Landing" : "Tugas 4", nilai: grade?.nilaiLandingPage ?? null },
    { name: isRpl ? "Py" : "Tugas 5", nilai: grade?.nilaiKagglePython ?? null },
    { name: isRpl ? "SQL" : "Tugas 6", nilai: grade?.nilaiKaggleSql ?? null },
    { name: isRpl ? "ML" : "Tugas 7", nilai: grade?.nilaiKaggleMl ?? null },
    { name: isRpl ? "U.ML" : "Ujian 1", nilai: grade?.nilaiUjianMl ?? null },
    { name: isRpl ? "U.SQL" : "Ujian 2", nilai: grade?.nilaiUjianSql ?? null },
  ];

  return (
    <div className="space-y-6 max-w-[1000px]">

      {/* ── GREETING ──────────────────────────────────────────────────── */}
      <div
        className="rounded-2xl p-6 border border-indigo-500/20 relative overflow-hidden"
        style={{ background: "linear-gradient(135deg, rgba(99,102,241,0.08), rgba(79,70,229,0.04))" }}
      >
        <div className="absolute right-6 top-1/2 -translate-y-1/2 opacity-5">
          <Star size={100} />
        </div>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10">
          <div>
            <p className="text-indigo-300 text-sm font-medium mb-1">{sapa},</p>
            <h1 className="text-2xl font-bold text-white">{student.nama} 👋</h1>
            <div className="flex items-center gap-3 mt-2 flex-wrap">
              <span className="text-slate-400 text-sm">{student.kelas.namaKelas}</span>
              <span className="text-slate-700">·</span>
              <span className="text-slate-400 text-sm font-mono text-xs">{student.nis}</span>
              <span className="text-slate-700">·</span>
              <span className="text-slate-400 text-sm">{SEMESTER} {TAHUN_AJARAN}</span>
            </div>
          </div>
          <SubjectSelect subjects={subjectsList} activeSubjectId={activeSubjectId} />
        </div>
      </div>

      {/* ── STAT CARDS ────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {/* Nilai Raport */}
        <div className="rounded-2xl border border-slate-800/60 bg-slate-900/60 p-4 col-span-1">
          <div className="w-9 h-9 rounded-xl bg-indigo-500/10 flex items-center justify-center mb-3">
            <TrendingUp size={18} className="text-indigo-400" />
          </div>
          <p className="text-2xl font-bold text-white">
            {grade?.nilaiRaport ?? "—"}
          </p>
          <p className="text-xs font-semibold text-slate-300 mt-0.5">Nilai Raport</p>
          <div className="mt-1">
            <PredikatBadge predikat={grade?.predikat ?? null} />
          </div>
        </div>

        {/* Rata-rata */}
        <div className="rounded-2xl border border-slate-800/60 bg-slate-900/60 p-4">
          <div className="w-9 h-9 rounded-xl bg-emerald-500/10 flex items-center justify-center mb-3">
            <BookOpen size={18} className="text-emerald-400" />
          </div>
          <p className="text-2xl font-bold text-white">
            {grade?.rataRata?.toFixed(1) ?? "—"}
          </p>
          <p className="text-xs font-semibold text-slate-300 mt-0.5">Rata-rata Tugas</p>
          <p className="text-xs text-slate-600 mt-0.5">9 komponen</p>
        </div>

        {/* Kehadiran */}
        <div className="rounded-2xl border border-slate-800/60 bg-slate-900/60 p-4">
          <div className="w-9 h-9 rounded-xl bg-sky-500/10 flex items-center justify-center mb-3">
            <CalendarCheck size={18} className="text-sky-400" />
          </div>
          <p className="text-2xl font-bold text-white">
            {attendance ? `${attendance.persentaseHadir}%` : "—"}
          </p>
          <p className="text-xs font-semibold text-slate-300 mt-0.5">Kehadiran</p>
          <p className="text-xs text-slate-600 mt-0.5 truncate">
            {attendance ? `${attendance.totalHadir} / ${attendance.totalHadir + attendance.totalTidakHadir} hadir` : "Belum ada data"}
          </p>
        </div>

        {/* Ranking */}
        <div className="rounded-2xl border border-slate-800/60 bg-slate-900/60 p-4">
          <div className="w-9 h-9 rounded-xl bg-amber-500/10 flex items-center justify-center mb-3">
            <Award size={18} className="text-amber-400" />
          </div>
          <p className="text-2xl font-bold text-white">
            {ranking ? `#${ranking}` : "—"}
          </p>
          <p className="text-xs font-semibold text-slate-300 mt-0.5">Ranking Kelas</p>
          <p className="text-xs text-slate-600 mt-0.5">{student.kelas.namaKelas}</p>
        </div>
      </div>

      {/* ── GRAFIK PERKEMBANGAN & CATATAN TERBARU ──────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <GrafikNilaiSiswa nilaiData={componentsData} />
        </div>

        {/* Catatan Terbaru */}
        <div className="rounded-2xl border border-slate-800/60 bg-slate-900/60 p-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 mb-4">
              <MessageSquare size={16} className="text-indigo-400" />
              <h3 className="text-sm font-bold text-white uppercase tracking-wider">Catatan Guru</h3>
            </div>
            
            <div className="space-y-4 max-h-[17rem] overflow-y-auto pr-1">
              {student.notes.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-xs text-slate-600">Belum ada catatan dari guru.</p>
                </div>
              ) : (
                student.notes.map((note) => (
                  <div key={note.id} className="rounded-xl border border-slate-800 bg-slate-950/40 p-3 space-y-1.5">
                    <div className="flex justify-between items-center">
                      <span className="text-xs font-bold text-slate-200 truncate max-w-[70%]">
                        {note.judulProyek || "Evaluasi"}
                      </span>
                      <span className="text-[9px] text-slate-600 shrink-0">
                        {new Date(note.createdAt).toLocaleDateString("id-ID", { day: "numeric", month: "short" })}
                      </span>
                    </div>
                    <p className="text-xs text-slate-400 leading-relaxed line-clamp-3">
                      {note.catatan}
                    </p>
                    <div className="flex justify-between items-center text-[10px] text-slate-500 pt-1 border-t border-slate-850">
                      <span>Oleh: {note.teacher.nama}</span>
                      {note.nilaiTotal !== null && (
                        <span className="font-bold text-indigo-400">Skor: {note.nilaiTotal}</span>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-800/60 text-center">
            <Link
              href="/siswa/catatan"
              className="text-xs font-semibold text-indigo-400 hover:text-indigo-300 transition-colors"
            >
              Lihat Semua Catatan &rarr;
            </Link>
          </div>
        </div>
      </div>

      {/* ── DETAIL NILAI KOMPONEN ─────────────────────────────────────── */}
      {grade && (
        <div>
          <div className="flex items-center gap-2 mb-3">
            <div className="w-1 h-4 rounded-full bg-indigo-500" />
            <h2 className="text-sm font-semibold text-slate-300">Detail Nilai Komponen</h2>
          </div>

          <div className="rounded-2xl border border-slate-800/60 bg-slate-900/60 overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-800/60">
                  <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-500">Komponen</th>
                  <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-500">Nilai</th>
                  <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-500">Progress</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/40">
                {[
                  { label: isRpl ? "Portfolio / Github" : "Tugas 1",  nilai: grade.nilaiGithub },
                  { label: isRpl ? "Tugas API" : "Tugas 2",            nilai: grade.nilaiApi },
                  { label: isRpl ? "Admin Panel" : "Tugas 3",          nilai: grade.nilaiAdminPanel },
                  { label: isRpl ? "Landing Page" : "Tugas 4",         nilai: grade.nilaiLandingPage },
                  { label: isRpl ? "Kaggle Python" : "Tugas 5",        nilai: grade.nilaiKagglePython },
                  { label: isRpl ? "Kaggle SQL" : "Tugas 6",           nilai: grade.nilaiKaggleSql },
                  { label: isRpl ? "Kaggle ML" : "Tugas 7",            nilai: grade.nilaiKaggleMl },
                  { label: isRpl ? "Ujian ML" : "Ujian 1",             nilai: grade.nilaiUjianMl },
                  { label: isRpl ? "Ujian SQL" : "Ujian 2",            nilai: grade.nilaiUjianSql },
                ].map(({ label, nilai }) => (
                  <tr key={label} className="hover:bg-white/[0.02]">
                    <td className="px-4 py-2.5 text-slate-300 text-xs">{label}</td>
                    <td className="px-4 py-2.5">
                      <span className={`text-xs font-bold tabular-nums ${
                        nilai === null ? "text-slate-600" :
                        nilai >= 90 ? "text-emerald-400" :
                        nilai >= 75 ? "text-indigo-400" :
                        nilai >= 60 ? "text-amber-400" : "text-rose-400"
                      }`}>
                        {nilai ?? "—"}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 w-40">
                      {nilai !== null ? (
                        <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden">
                          <div
                            className="h-full rounded-full"
                            style={{
                              width: `${nilai}%`,
                              background: nilai >= 90 ? "#10b981" : nilai >= 75 ? "#6366f1" : nilai >= 60 ? "#f59e0b" : "#ef4444",
                            }}
                          />
                        </div>
                      ) : (
                        <span className="text-[10px] text-slate-700">Belum dikerjakan</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Footer summary */}
            <div className="px-4 py-3 border-t border-slate-800/60 flex items-center justify-between">
              <span className="text-xs text-slate-500">
                {grade.jumlahNilaiKosong ?? 0} komponen belum diisi
              </span>
              <span className={`text-xs font-semibold px-2 py-0.5 rounded-full
                ${grade.statusTuntas === "TUNTAS"
                  ? "bg-emerald-500/15 text-emerald-300"
                  : "bg-rose-500/15 text-rose-300"
                }`}
              >
                {grade.statusTuntas ?? "—"}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Belum ada data nilai */}
      {!grade && (
        <div className="rounded-2xl border border-slate-800/60 bg-slate-900/40 p-8 text-center">
          <p className="text-slate-500 text-sm">Belum ada data nilai untuk semester ini.</p>
          <p className="text-slate-600 text-xs mt-1">Hubungi guru untuk memastikan data sudah diimport.</p>
        </div>
      )}

    </div>
  );
}
