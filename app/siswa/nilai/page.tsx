// =============================================================================
// FILE: app/siswa/nilai/page.tsx
// TUJUAN: Halaman nilai pribadi siswa yang sedang login.
//         Menampilkan 9 komponen nilai dalam card grid dengan color coding,
//         serta nilai raport dan predikat di bagian atas.
// SEMESTER: Genap 2025/2026
// =============================================================================

import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";
import {
  BookOpen,
  Code2,
  LayoutDashboard,
  Globe,
  FlaskConical,
  Database,
  BrainCircuit,
  ClipboardList,
  GitBranch,
  Award,
  Star,
} from "lucide-react";

export const metadata: Metadata = { title: "Nilai Saya" };

const SEMESTER     = "Genap";
const TAHUN_AJARAN = "2025/2026";

// ─── KOMPONEN NILAI ──────────────────────────────────────────────────────────

const KOMPONEN = [
  {
    key:   "nilaiGithub"      as const,
    label: "Portfolio / Github",
    sub:   "Tugas proyek & repositori",
    icon:  GitBranch,
    color: "indigo",
  },
  {
    key:   "nilaiApi"         as const,
    label: "Tugas API",
    sub:   "REST API development",
    icon:  Code2,
    color: "violet",
  },
  {
    key:   "nilaiAdminPanel"  as const,
    label: "Admin Panel",
    sub:   "Dashboard administration",
    icon:  LayoutDashboard,
    color: "sky",
  },
  {
    key:   "nilaiLandingPage" as const,
    label: "Landing Page",
    sub:   "Web design & frontend",
    icon:  Globe,
    color: "cyan",
  },
  {
    key:   "nilaiKagglePython" as const,
    label: "Kaggle Python",
    sub:   "Python programming",
    icon:  FlaskConical,
    color: "amber",
  },
  {
    key:   "nilaiKaggleSql"   as const,
    label: "Kaggle SQL",
    sub:   "Intro to SQL",
    icon:  Database,
    color: "orange",
  },
  {
    key:   "nilaiKaggleMl"    as const,
    label: "Kaggle ML",
    sub:   "Machine Learning intro",
    icon:  BrainCircuit,
    color: "pink",
  },
  {
    key:   "nilaiUjianMl"     as const,
    label: "Ujian ML",
    sub:   "Ujian Online Machine Learning",
    icon:  ClipboardList,
    color: "rose",
  },
  {
    key:   "nilaiUjianSql"    as const,
    label: "Ujian SQL",
    sub:   "Ujian Online SQL",
    icon:  BookOpen,
    color: "teal",
  },
] as const;

type KomponenKey = typeof KOMPONEN[number]["key"];

// ─── HELPERS ─────────────────────────────────────────────────────────────────

function getNilaiColor(nilai: number | null): string {
  if (nilai === null) return "text-slate-600";
  if (nilai >= 90)   return "text-emerald-400";
  if (nilai >= 75)   return "text-indigo-400";
  if (nilai >= 60)   return "text-amber-400";
  return "text-rose-400";
}

function getNilaiBg(nilai: number | null): string {
  if (nilai === null) return "border-slate-800/60 bg-slate-900/40";
  if (nilai >= 90)   return "border-emerald-500/30 bg-emerald-500/5";
  if (nilai >= 75)   return "border-indigo-500/30 bg-indigo-500/5";
  if (nilai >= 60)   return "border-amber-500/30 bg-amber-500/5";
  return "border-rose-500/30 bg-rose-500/5";
}

function getPredikatStyle(predikat: string | null | undefined) {
  switch (predikat) {
    case "Sangat Baik":      return "bg-emerald-500/15 text-emerald-300 border-emerald-500/30";
    case "Baik":             return "bg-indigo-500/15 text-indigo-300 border-indigo-500/30";
    case "Cukup":            return "bg-amber-500/15 text-amber-300 border-amber-500/30";
    case "Perlu Bimbingan":  return "bg-rose-500/15 text-rose-300 border-rose-500/30";
    default:                 return "bg-slate-800/60 text-slate-500 border-slate-700/40";
  }
}

const ICON_COLOR: Record<string, string> = {
  indigo:  "text-indigo-400",
  violet:  "text-violet-400",
  sky:     "text-sky-400",
  cyan:    "text-cyan-400",
  amber:   "text-amber-400",
  orange:  "text-orange-400",
  pink:    "text-pink-400",
  rose:    "text-rose-400",
  teal:    "text-teal-400",
};

// ─── PAGE ─────────────────────────────────────────────────────────────────────

export default async function SiswaNilaiPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  // Ambil data siswa beserta nilai semester ini
  const student = await prisma.student.findUnique({
    where: { userId: Number(session.user.id) },
    include: {
      grades: {
        where: { semester: SEMESTER, tahunAjaran: TAHUN_AJARAN },
        take: 1,
      },
      kelas: true,
    },
  });

  if (!student) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-slate-500">Data siswa tidak ditemukan.</p>
      </div>
    );
  }

  const grade = student.grades[0] ?? null;

  // Hitung nilai yang sudah diisi
  const diisi = KOMPONEN.filter((k) => grade && grade[k.key] !== null).length;

  return (
    <div className="space-y-6 max-w-5xl">

      {/* ── Header ─────────────────────────────────────────────────────── */}
      <div>
        <h1 className="text-xl font-bold text-white flex items-center gap-2">
          <Star size={18} className="text-amber-400" />
          Nilai Saya
        </h1>
        <p className="text-slate-500 text-sm mt-1">
          Semester {SEMESTER} {TAHUN_AJARAN} · {student.kelas.namaKelas}
        </p>
      </div>

      {/* ── Summary card: Nilai Raport + Predikat ──────────────────────── */}
      <div className="rounded-2xl border border-slate-800/60 bg-slate-900/60 p-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6">

          {/* Nilai Raport */}
          <div className="flex items-center gap-4">
            <div className="flex flex-col">
              <span className="text-xs text-slate-500 uppercase tracking-wider mb-1">
                Nilai Raport
              </span>
              <span
                className={`text-5xl font-black tabular-nums leading-none ${getNilaiColor(grade?.nilaiRaport ?? null)}`}
              >
                {grade?.nilaiRaport ?? "—"}
              </span>
            </div>
            {grade?.nilaiRaport && (
              <div className="w-px h-14 bg-slate-800/60 hidden sm:block" />
            )}
          </div>

          {/* Predikat + Rata-rata */}
          <div className="flex flex-col gap-2">
            <div>
              <span className="text-xs text-slate-500 uppercase tracking-wider block mb-1">
                Predikat
              </span>
              <span
                className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-semibold border ${getPredikatStyle(grade?.predikat)}`}
              >
                <Award size={13} />
                {grade?.predikat ?? "Belum dinilai"}
              </span>
            </div>
            <div className="flex items-center gap-3 text-xs text-slate-500">
              <span>
                Rata-rata komponen:{" "}
                <span className="text-slate-300 font-semibold">
                  {grade?.rataRata?.toFixed(1) ?? "—"}
                </span>
              </span>
              <span>·</span>
              <span>
                Nilai terisi:{" "}
                <span className="text-slate-300 font-semibold">
                  {diisi}/9
                </span>
              </span>
            </div>
          </div>

          {/* Status Tuntas */}
          <div className="sm:ml-auto">
            {grade?.statusTuntas ? (
              <span
                className={`px-4 py-2 rounded-xl text-sm font-bold ${
                  grade.statusTuntas === "TUNTAS"
                    ? "bg-emerald-500/15 text-emerald-300 border border-emerald-500/30"
                    : "bg-rose-500/15 text-rose-300 border border-rose-500/30"
                }`}
              >
                {grade.statusTuntas}
              </span>
            ) : (
              <span className="px-4 py-2 rounded-xl text-sm text-slate-600 bg-slate-800/40 border border-slate-800/60">
                Belum ada nilai
              </span>
            )}
          </div>
        </div>

        {/* Progress bar nilai terisi */}
        <div className="mt-5 pt-5 border-t border-slate-800/40">
          <div className="flex items-center justify-between text-xs text-slate-500 mb-2">
            <span>Progress Pengerjaan Tugas</span>
            <span className="font-semibold text-slate-400">{diisi}/9 komponen</span>
          </div>
          <div className="h-2 rounded-full bg-slate-800">
            <div
              className="h-2 rounded-full bg-gradient-to-r from-indigo-500 to-indigo-400 transition-all"
              style={{ width: `${(diisi / 9) * 100}%` }}
            />
          </div>
        </div>
      </div>

      {/* ── Card grid 9 komponen nilai ────────────────────────────────── */}
      <div>
        <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-3">
          Komponen Nilai (9 Tugas)
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {KOMPONEN.map((k, idx) => {
            const nilai = grade ? (grade[k.key as KomponenKey] as number | null) : null;
            const Icon  = k.icon;

            return (
              <div
                key={k.key}
                className={`
                  relative rounded-2xl border p-5 transition-all
                  hover:border-opacity-60 hover:shadow-lg hover:shadow-black/20
                  ${getNilaiBg(nilai)}
                `}
              >
                {/* Nomor komponen */}
                <span className="absolute top-3 right-4 text-[11px] font-mono text-slate-700">
                  {String(idx + 1).padStart(2, "0")}
                </span>

                {/* Icon */}
                <div className={`mb-3 ${ICON_COLOR[k.color] ?? "text-slate-400"}`}>
                  <Icon size={20} />
                </div>

                {/* Label */}
                <p className="text-sm font-semibold text-slate-200 leading-tight">
                  {k.label}
                </p>
                <p className="text-xs text-slate-600 mt-0.5 mb-4">{k.sub}</p>

                {/* Nilai besar */}
                <div className="flex items-end gap-2">
                  <span
                    className={`text-4xl font-black tabular-nums leading-none ${getNilaiColor(nilai)}`}
                  >
                    {nilai ?? "—"}
                  </span>
                  {nilai !== null && (
                    <span className="text-xs text-slate-600 mb-1">/ 100</span>
                  )}
                </div>

                {/* Mini badge status */}
                {nilai !== null && (
                  <div className="mt-3 pt-3 border-t border-slate-800/40">
                    <span
                      className={`text-[11px] font-semibold tabular-nums ${getNilaiColor(nilai)}`}
                    >
                      {nilai >= 90
                        ? "✓ Sangat Baik"
                        : nilai >= 75
                        ? "✓ Baik"
                        : nilai >= 60
                        ? "△ Cukup"
                        : "✗ Perlu Bimbingan"}
                    </span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Footer note ───────────────────────────────────────────────── */}
      <p className="text-xs text-slate-700 text-center pb-2">
        Data nilai diperbarui oleh guru · Hubungi guru jika ada ketidaksesuaian
      </p>
    </div>
  );
}
