// =============================================================================
// FILE: app/admin/layout.tsx
// TUJUAN: Layout Server Component untuk semua halaman di /admin/*.
// =============================================================================

import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import DashboardShell from "@/components/sidebar/DashboardShell";

export const metadata = {
  title: {
    template: "%s — SIAKAD PPLG Admin",
    default: "Dashboard Admin — SIAKAD PPLG",
  },
  description: "Panel administrator sistem informasi akademik SMK PPLG",
};

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  if (!session?.user) {
    redirect("/login");
  }

  if (session.user.role !== "admin") {
    redirect(`/${session.user.role}/dashboard`);
  }

  return (
    <DashboardShell
      userName={session.user.nama}
      username={session.user.username}
      role="admin"
    >
      {children}
    </DashboardShell>
  );
}
