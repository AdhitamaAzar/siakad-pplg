// =============================================================================
// FILE: app/siswa/perkembangan/page.tsx
// TUJUAN: Halaman perkembangan nilai siswa — progress bar per komponen.
// =============================================================================

import type { Metadata } from "next";
import { auth }          from "@/lib/auth";
import { redirect }      from "next/navigation";
import prisma            from "@/lib/prisma";
import { TrendingUp }    from "lucide-react";
import SubjectSelect     from "../nilai/SubjectSelect";

export const metadata: Metadata = { title: "Perkembangan Nilai — Siswa" };

const SEMESTER     = "Genap";
const TAHUN_AJARAN = "2025/2026";

const getKomponen = (isRpl: boolean) => [
  { key: "nilaiGithub" as const,      label: isRpl ? "Portfolio / Github" : "Tugas 1", emoji: "🐱" },
  { key: "nilaiApi" as const,         label: isRpl ? "Tugas API" : "Tugas 2",           emoji: "🔌" },
  { key: "nilaiAdminPanel" as const,  label: isRpl ? "Admin Panel" : "Tugas 3",         emoji: "🖥️" },
  { key: "nilaiLandingPage" as const, label: isRpl ? "Landing Page" : "Tugas 4",        emoji: "🌐" },
  { key: "nilaiKagglePython" as const,label: isRpl ? "Kaggle Python" : "Tugas 5",       emoji: "🐍" },
  { key: "nilaiKaggleSql" as const,   label: isRpl ? "Kaggle SQL" : "Tugas 6",          emoji: "🗄️" },
  { key: "nilaiKaggleMl" as const,    label: isRpl ? "Kaggle ML" : "Tugas 7",           emoji: "🤖" },
  { key: "nilaiUjianMl" as const,     label: isRpl ? "Ujian ML" : "Ujian 1",            emoji: "📝" },
  { key: "nilaiUjianSql" as const,    label: isRpl ? "Ujian SQL" : "Ujian 2",           emoji: "📋" },
] as const;

type GradeKey = ReturnType<typeof getKomponen>[number]["key"];

interface PageProps {
  searchParams: Promise<{ mapel?: string }>;
}

export default async function SiswaPerkembanganPage({ searchParams }: PageProps) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const sp = await searchParams;

  const subjectsList = await prisma.subject.findMany({
    orderBy: { namaMapel: "asc" },
    select: { id: true, namaMapel: true, kodeMapel: true },
  });

  const activeSubjectId = sp.mapel ? Number(sp.mapel) : (subjectsList[0]?.id || 1);

  const student = await prisma.student.findUnique({
    where:   { userId: Number(session.user.id) },
    include: {
      kelas:  true,
      grades: {
        where: { semester: SEMESTER, tahunAjaran: TAHUN_AJARAN, subjectId: activeSubjectId },
        take: 1
      },
    },
  });

  if (!student) {
    return (
      <div className="rounded-2xl border border-slate-800/60 bg-slate-900/40 p-8 text-center">
        <p className="text-slate-400">Data siswa tidak ditemukan.</p>
      </div>
    );
  }

  const activeSubject = subjectsList.find((s) => s.id === activeSubjectId);
  const isRpl = activeSubject ? activeSubject.kodeMapel.toLowerCase().includes("pplg") : true;
  const komponen = getKomponen(isRpl);

  const grade = student.grades[0] ?? null;
  const nilaiList = grade
    ? komponen.map((k) => ({ ...k, nilai: grade[k.key as keyof typeof grade] as number | null }))
    : komponen.map((k) => ({ ...k, nilai: null }));

  const done    = nilaiList.filter((k) => k.nilai !== null).length;
  const total   = komponen.length;
  const persen  = Math.round((done / total) * 100);

  return (
    <div className="space-y-6 max-w-[800px]">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <TrendingUp size={20} className="text-indigo-400" />
          <div>
            <h1 className="text-xl font-bold text-white">Perkembangan Nilai</h1>
            <p className="text-slate-500 text-sm">{SEMESTER} {TAHUN_AJARAN} · {student.kelas.namaKelas}</p>
          </div>
        </div>
        <SubjectSelect subjects={subjectsList} activeSubjectId={activeSubjectId} />
      </div>

      {/* Overall progress */}
      <div className="rounded-2xl border border-indigo-500/20 bg-indigo-500/5 p-5">
        <div className="flex items-center justify-between mb-3">
          <p className="text-sm font-semibold text-slate-300">Progress Keseluruhan</p>
          <span className="text-indigo-300 font-bold text-sm">{done}/{total} komponen</span>
        </div>
        <div className="h-3 bg-slate-800 rounded-full overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-700"
            style={{
              width: `${persen}%`,
              background: "linear-gradient(90deg, #6366f1, #818cf8)",
            }}
          />
        </div>
        <p className="text-xs text-slate-500 mt-2">{persen}% tugas telah selesai dikerjakan</p>
      </div>

      {/* Per-komponen progress bars */}
      <div className="space-y-3">
        {nilaiList.map(({ key, label, emoji, nilai }) => {
          const barColor =
            nilai === null ? "#334155" :
            nilai >= 90 ? "#10b981" :
            nilai >= 75 ? "#6366f1" :
            nilai >= 60 ? "#f59e0b" : "#ef4444";

          return (
            <div
              key={key}
              className="rounded-xl border border-slate-800/60 bg-slate-900/60 p-4"
            >
              <div className="flex items-center justify-between mb-2.5">
                <div className="flex items-center gap-2">
                  <span className="text-base">{emoji}</span>
                  <span className="text-sm font-medium text-slate-300">{label}</span>
                </div>
                <span className={`text-sm font-bold tabular-nums ${
                  nilai === null ? "text-slate-600" :
                  nilai >= 90 ? "text-emerald-400" :
                  nilai >= 75 ? "text-indigo-400" :
                  nilai >= 60 ? "text-amber-400" : "text-rose-400"
                }`}>
                  {nilai ?? "Belum"}
                </span>
              </div>
              <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{ width: nilai !== null ? `${nilai}%` : "0%", background: barColor }}
                />
              </div>
            </div>
          );
        })}
      </div>

      {!grade && (
        <div className="rounded-2xl border border-slate-800/60 bg-slate-900/40 p-6 text-center">
          <p className="text-slate-500 text-sm">Belum ada data nilai untuk semester ini.</p>
        </div>
      )}
    </div>
  );
}
