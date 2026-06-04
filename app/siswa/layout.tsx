// =============================================================================
// FILE: app/siswa/layout.tsx
// TUJUAN: Layout Server Component untuk semua halaman di /siswa/*.
// =============================================================================

import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import DashboardShell from "@/components/sidebar/DashboardShell";
import { getActiveAcademicConfig } from "@/lib/academicConfig";

export const metadata = {
  title: {
    template: "%s — SIAKAD PPLG",
    default: "Dashboard — SIAKAD PPLG",
  },
  description: "Portal siswa sistem informasi akademik SMK PPLG",
};

export default async function SiswaLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  if (!session?.user) {
    redirect("/login");
  }

  if (session.user.role !== "siswa") {
    redirect(`/${session.user.role}/dashboard`);
  }

  const { tahunAjaran, semester } = await getActiveAcademicConfig();

  return (
    <DashboardShell
      userName={session.user.nama}
      username={session.user.username}
      role="siswa"
      tahunAjaran={tahunAjaran}
      semester={semester}
    >
      {children}
    </DashboardShell>
  );
}
