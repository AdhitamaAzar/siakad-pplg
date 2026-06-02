// =============================================================================
// FILE: lib/prisma.ts
// TUJUAN: Menyediakan singleton instance Prisma Client untuk seluruh aplikasi.
//         Mencegah pembuatan koneksi database yang berlebihan saat development
//         (hot reload Next.js akan membuat instance baru setiap kali jika tidak
//         menggunakan singleton pattern).
//         Di Prisma v7, koneksi database menggunakan @prisma/adapter-pg.
// REFERENSI: https://pris.ly/d/prisma7-client-config
// =============================================================================

import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

// ─── TYPE DECLARATION ─────────────────────────────────────────────────────────

declare global {
  // eslint-disable-next-line no-var
  var __prismaGlobal: PrismaClient | undefined;
}

// ─── SINGLETON FACTORY ────────────────────────────────────────────────────────

/**
 * Membuat instance PrismaClient dengan adapter PostgreSQL (Prisma v7).
 * Di development: log query, error, dan warning.
 * Di production: hanya log error.
 *
 * @returns Instance PrismaClient baru yang sudah dikonfigurasi
 * @throws Error jika DATABASE_URL tidak ditemukan di environment variables
 */
function createPrismaClient(): PrismaClient {
  const databaseUrl = process.env.DATABASE_URL;

  if (!databaseUrl) {
    console.warn(
      "[Prisma Warning] Environment variable DATABASE_URL tidak ditemukan! " +
      "Menggunakan fallback dummy URL untuk mencegah kegagalan build."
    );
  }

  const connectionString = databaseUrl || "postgresql://postgres:postgres@localhost:5432/siakad_pplg";
  const adapter = new PrismaPg({ connectionString });

  return new PrismaClient({
    adapter,
    log:
      process.env.NODE_ENV === "development"
        ? ["query", "error", "warn"]
        : ["error"],
  });
}

// ─── SINGLETON INSTANCE ───────────────────────────────────────────────────────

/**
 * Singleton instance Prisma Client dengan PostgreSQL adapter (Prisma v7).
 *
 * - Di PRODUCTION: selalu membuat instance baru (aman karena tidak ada hot reload)
 * - Di DEVELOPMENT: menggunakan instance yang disimpan di `global` untuk mencegah
 *   "too many connections" akibat hot reload Next.js
 *
 * @example
 * ```typescript
 * import prisma from "@/lib/prisma";
 *
 * const users = await prisma.user.findMany();
 * const siswa = await prisma.student.findFirst({ where: { nis: "14001/1662.063" } });
 * ```
 */
const prisma: PrismaClient =
  process.env.NODE_ENV === "production"
    ? createPrismaClient()
    : (global.__prismaGlobal ?? (global.__prismaGlobal = createPrismaClient()));

export default prisma;
