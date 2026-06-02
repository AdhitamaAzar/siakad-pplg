// =============================================================================
// FILE: app/guru/layout.tsx
// TUJUAN: Layout Server Component untuk semua halaman di /guru/*.
//         Membaca session dari server, memvalidasi role, dan meneruskan
//         data user ke DashboardShell (client component).
// =============================================================================

import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import DashboardShell from "@/components/sidebar/DashboardShell";
import prisma from "@/lib/prisma";

export const metadata = {
  title: {
    template: "%s — SIAKAD PPLG Guru",
    default: "Dashboard Guru — SIAKAD PPLG",
  },
  description: "Panel guru sistem informasi akademik SMK PPLG",
};

/**
 * Layout untuk semua halaman guru.
 * Memproteksi route: redirect ke /login jika tidak ada session,
 * redirect ke dashboard sendiri jika role bukan "guru".
 */
export default async function GuruLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  if (!session?.user) {
    redirect("/login");
  }

  if (session.user.role !== "guru") {
    redirect(`/${session.user.role}/dashboard`);
  }

  // Ambil data kelas yang diajar oleh guru ini
  const teacherRecord = await prisma.teacher.findUnique({
    where: { userId: Number(session.user.id) },
  });

  const classes = await prisma.class.findMany({
    where: {
      tahunAjaran: "2025/2026",
      classSubjects: {
        some: {
          teacherId: teacherRecord?.id,
        },
      },
    },
    select: { id: true, namaKelas: true },
    orderBy: { namaKelas: "asc" },
  });

  return (
    <DashboardShell
      userName={session.user.nama}
      username={session.user.username}
      role="guru"
      classes={classes}
    >
      {children}
    </DashboardShell>
  );
}
