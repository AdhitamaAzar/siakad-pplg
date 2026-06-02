// =============================================================================
// FILE: app/guru/import/riwayat/page.tsx
// TUJUAN: Halaman riwayat unggahan Excel guru yang sedang aktif.
//         Server Component: memuat log audit milik guru yang sedang login.
// =============================================================================

import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";
import LogClientPage from "@/app/admin/import/log/LogClientPage";

export const metadata: Metadata = { title: "Riwayat Import — Guru" };

export default async function RiwayatImportPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  // Ambil log yang diunggah oleh guru pengajar yang sedang login
  const logsRaw = await prisma.importLog.findMany({
    where: { importedById: Number(session.user.id) },
    orderBy: { createdAt: "desc" },
  });

  const logs = logsRaw.map((log) => ({
    id:            log.id,
    namaFile:      log.namaFile,
    status:        log.status,
    totalBerhasil: log.totalBerhasil,
    totalDiskip:   log.totalDiskip,
    totalGagal:    log.totalGagal,
    errorDetails:  log.errorDetails,
    createdAt:     log.createdAt.toISOString(),
    operator:      `@${session.user.username ?? "saya"}`,
  }));

  return <LogClientPage logs={logs} />;
}
