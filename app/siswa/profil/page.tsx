// =============================================================================
// FILE: app/siswa/profil/page.tsx
// TUJUAN: Halaman profil siswa — info akun & data diri.
// =============================================================================

import type { Metadata } from "next";
import { auth }          from "@/lib/auth";
import { redirect }      from "next/navigation";
import prisma            from "@/lib/prisma";
import { UserCircle, Key, BookOpen, School } from "lucide-react";

export const metadata: Metadata = { title: "Profil Saya — Siswa" };

export default async function SiswaProfilPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const student = await prisma.student.findUnique({
    where:   { userId: Number(session.user.id) },
    include: { kelas: true },
  });

  return (
    <div className="space-y-6 max-w-[600px]">
      <div className="flex items-center gap-3">
        <UserCircle size={20} className="text-indigo-400" />
        <h1 className="text-xl font-bold text-white">Profil Saya</h1>
      </div>

      {/* Avatar card */}
      <div
        className="rounded-2xl p-6 border border-indigo-500/20 flex items-center gap-5"
        style={{ background: "linear-gradient(135deg, rgba(99,102,241,0.08), rgba(79,70,229,0.04))" }}
      >
        <div className="w-20 h-20 rounded-2xl bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center shrink-0">
          <span className="text-3xl font-bold text-indigo-300">
            {(student?.nama ?? session.user.name ?? "?").charAt(0)}
          </span>
        </div>
        <div>
          <h2 className="text-xl font-bold text-white">{student?.nama ?? session.user.name}</h2>
          <p className="text-slate-400 text-sm mt-0.5">{student?.kelas?.namaKelas ?? "—"}</p>
          <p className="text-slate-600 text-xs mt-1 font-mono">{student?.nis ?? "—"}</p>
        </div>
      </div>

      {/* Info detail */}
      <div className="rounded-2xl border border-slate-800/60 bg-slate-900/60 divide-y divide-slate-800/60">
        {[
          { icon: Key,      label: "Username",    value: session.user.username ?? session.user.name ?? "—" },
          { icon: BookOpen, label: "NIS",         value: student?.nis ?? "—" },
          { icon: School,   label: "Kelas",       value: student?.kelas?.namaKelas ?? "—" },
          { icon: BookOpen, label: "Tahun Ajaran", value: "2025/2026" },
          { icon: BookOpen, label: "Semester",    value: "Genap" },
        ].map(({ icon: Icon, label, value }) => (
          <div key={label} className="px-5 py-3.5 flex items-center gap-3">
            <Icon size={14} className="text-slate-600 shrink-0" />
            <span className="text-xs text-slate-500 w-28 shrink-0">{label}</span>
            <span className="text-sm font-medium text-slate-300">{value}</span>
          </div>
        ))}
      </div>

      <div className="rounded-xl border border-indigo-500/20 bg-indigo-500/5 p-4 text-center">
        <p className="text-xs text-slate-500">
          Untuk mengubah password, hubungi guru atau administrator sistem.
        </p>
      </div>
    </div>
  );
}
