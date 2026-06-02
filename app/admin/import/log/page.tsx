// =============================================================================
// FILE: app/admin/import/log/page.tsx
// TUJUAN: Halaman log audit aktivitas import Excel untuk admin.
//         Server Component: mengambil data log & operator dari PostgreSQL.
// =============================================================================

import type { Metadata } from "next";
import prisma from "@/lib/prisma";
import LogClientPage from "./LogClientPage";

export const metadata: Metadata = { title: "Log Import — Admin" };

export default async function AdminImportLogPage() {
  // Fetch semua log audit dari database
  const logsRaw = await prisma.importLog.findMany({
    orderBy: { createdAt: "desc" },
  });

  // Cari operator (username user) pengunggah file
  const userIds = Array.from(new Set(logsRaw.map((l) => l.importedById)));
  const users = await prisma.user.findMany({
    where: { id: { in: userIds } },
    select: { id: true, username: true },
  });

  const logs = logsRaw.map((log) => {
    const user = users.find((u) => u.id === log.importedById);
    return {
      id:            log.id,
      namaFile:      log.namaFile,
      status:        log.status,
      totalBerhasil: log.totalBerhasil,
      totalDiskip:   log.totalDiskip,
      totalGagal:    log.totalGagal,
      errorDetails:  log.errorDetails,
      createdAt:     log.createdAt.toISOString(),
      operator:      user ? `@${user.username}` : "Operator",
    };
  });

  return <LogClientPage logs={logs} />;
}
