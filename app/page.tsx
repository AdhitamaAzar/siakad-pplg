// =============================================================================
// FILE: app/page.tsx
// TUJUAN: Root page — redirect ke /login jika belum login,
//         atau ke dashboard jika sudah login.
//         Menggunakan server-side redirect agar tidak ada flash of content.
// =============================================================================

import { redirect } from "next/navigation";
import { auth }     from "@/lib/auth";

export default async function RootPage() {
  const session = await auth();

  if (session?.user?.role) {
    const map: Record<string, string> = {
      admin: "/admin/dashboard",
      guru:  "/guru/dashboard",
      siswa: "/siswa/dashboard",
    };
    redirect(map[session.user.role] ?? "/login");
  }

  redirect("/login");
}
