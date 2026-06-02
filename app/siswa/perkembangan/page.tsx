// =============================================================================
// FILE: app/siswa/perkembangan/page.tsx
// TUJUAN: Halaman perkembangan nilai siswa — progress bar per komponen.
// =============================================================================

import type { Metadata } from "next";
import { auth }          from "@/lib/auth";
import { redirect }      from "next/navigation";
import prisma            from "@/lib/prisma";
import { TrendingUp }    from "lucide-react";

export const metadata: Metadata = { title: "Perkembangan Nilai — Siswa" };

const SEMESTER     = "Genap";
const TAHUN_AJARAN = "2025/2026";

const KOMPONEN = [
  { key: "nilaiGithub",      label: "Portfolio / Github", emoji: "🐱" },
  { key: "nilaiApi",         label: "Tugas API",           emoji: "🔌" },
  { key: "nilaiAdminPanel",  label: "Admin Panel",         emoji: "🖥️" },
  { key: "nilaiLandingPage", label: "Landing Page",        emoji: "🌐" },
  { key: "nilaiKagglePython",label: "Kaggle Python",       emoji: "🐍" },
  { key: "nilaiKaggleSql",   label: "Kaggle SQL",          emoji: "🗄️" },
  { key: "nilaiKaggleMl",    label: "Kaggle ML",           emoji: "🤖" },
  { key: "nilaiUjianMl",     label: "Ujian ML",            emoji: "📝" },
  { key: "nilaiUjianSql",    label: "Ujian SQL",           emoji: "📋" },
] as const;

type GradeKey = typeof KOMPONEN[number]["key"];

export default async function SiswaPerkembanganPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const student = await prisma.student.findUnique({
    where:   { userId: Number(session.user.id) },
    include: {
      kelas:  true,
      grades: { where: { semester: SEMESTER, tahunAjaran: TAHUN_AJARAN }, take: 1 },
    },
  });

  if (!student) {
    return (
      <div className="rounded-2xl border border-slate-800/60 bg-slate-900/40 p-8 text-center">
        <p className="text-slate-400">Data siswa tidak ditemukan.</p>
      </div>
    );
  }

  const grade = student.grades[0] ?? null;
  const nilaiList = grade
    ? KOMPONEN.map((k) => ({ ...k, nilai: grade[k.key as GradeKey] as number | null }))
    : KOMPONEN.map((k) => ({ ...k, nilai: null }));

  const done    = nilaiList.filter((k) => k.nilai !== null).length;
  const total   = KOMPONEN.length;
  const persen  = Math.round((done / total) * 100);

  return (
    <div className="space-y-6 max-w-[800px]">
      <div className="flex items-center gap-3">
        <TrendingUp size={20} className="text-indigo-400" />
        <div>
          <h1 className="text-xl font-bold text-white">Perkembangan Nilai</h1>
          <p className="text-slate-500 text-sm">{SEMESTER} {TAHUN_AJARAN} · {student.kelas.namaKelas}</p>
        </div>
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
