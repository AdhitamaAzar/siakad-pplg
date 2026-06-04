// =============================================================================
// FILE: app/guru/profil/page.tsx
// TUJUAN: Halaman profil guru — menampilkan info profil secara dinamis.
// =============================================================================

import type { Metadata } from "next";
import { auth }          from "@/lib/auth";
import { redirect }      from "next/navigation";
import { UserCircle, Key, GraduationCap, BookOpen, Mail } from "lucide-react";
import prisma            from "@/lib/prisma";
import { getActiveAcademicConfig } from "@/lib/academicConfig";

export const metadata: Metadata = { title: "Profil Saya — Guru" };

export default async function GuruProfilPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const { tahunAjaran, semester } = await getActiveAcademicConfig();

  // Fetch teacher profile
  const teacher = await prisma.teacher.findUnique({
    where: { userId: Number(session.user.id) },
    include: {
      classSubjects: {
        include: {
          kelas: true,
          subject: true,
        },
      },
    },
  });

  const subjectNames = Array.from(
    new Set(teacher?.classSubjects.map((cs) => cs.subject.namaMapel) ?? [])
  ).join(", ") || "Belum ditentukan";

  const classNames = Array.from(
    new Set(teacher?.classSubjects.map((cs) => cs.kelas.namaKelas) ?? [])
  ).join(", ") || "Belum ditentukan";

  const teacherName = teacher?.nama ?? session.user.nama ?? "Guru";
  const teacherNip = teacher?.nip ?? "—";
  const teacherEmail = teacher?.email ?? `${session.user.username}@smk.sch.id`;

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
          <GraduationCap size={36} className="text-indigo-300" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-white">{teacherName}</h2>
          <p className="text-slate-400 text-sm mt-0.5">NIP: {teacherNip}</p>
          <div className="mt-2 flex items-center gap-1.5 bg-indigo-500/10 border border-indigo-500/20 rounded-full px-3 py-1 w-fit">
            <span className="w-1.5 h-1.5 rounded-full bg-indigo-400" />
            <span className="text-xs text-indigo-300 font-medium">Guru</span>
          </div>
        </div>
      </div>

      {/* Info */}
      <div className="rounded-2xl border border-slate-800/60 bg-slate-900/60 divide-y divide-slate-800/60">
        {[
          { icon: Key,           label: "Username",       value: session.user.username },
          { icon: UserCircle,    label: "Nama Lengkap",   value: teacherName },
          { icon: GraduationCap, label: "NIP",            value: teacherNip },
          { icon: Mail,          label: "Email",          value: teacherEmail },
          { icon: BookOpen,      label: "Mata Pelajaran", value: subjectNames },
          { icon: BookOpen,      label: "Kelas Diampu",   value: classNames },
          { icon: BookOpen,      label: "Tahun Ajaran",   value: `${tahunAjaran} (Semester ${semester})` },
        ].map(({ icon: Icon, label, value }) => (
          <div key={label} className="px-5 py-3.5 flex items-center gap-3">
            <Icon size={14} className="text-slate-600 shrink-0" />
            <span className="text-xs text-slate-500 w-32 shrink-0">{label}</span>
            <span className="text-sm font-medium text-slate-300">{value}</span>
          </div>
        ))}
      </div>

      <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-4 text-center">
        <p className="text-xs text-slate-500">
          Untuk mengubah data profil atau password, hubungi administrator sistem.
        </p>
      </div>
    </div>
  );
}
