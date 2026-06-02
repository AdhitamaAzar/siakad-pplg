// =============================================================================
// FILE: prisma.config.ts
// TUJUAN: Konfigurasi koneksi database untuk Prisma v7+.
//         Di Prisma v7, konfigurasi datasource URL dipindah dari schema.prisma
//         ke file ini. Menggunakan adapter @prisma/adapter-pg untuk koneksi
//         runtime, dan url langsung untuk perintah migrate/db push.
// REFERENSI: https://pris.ly/d/config-datasource
// =============================================================================

import path from "node:path";
import { defineConfig } from "prisma/config";

// Muat .env secara manual agar tersedia saat prisma CLI berjalan
import * as dotenv from "dotenv";
dotenv.config();

const DATABASE_URL =
  process.env.DATABASE_URL ??
  "postgresql://postgres:postgres@localhost:5432/siakad_pplg";

// ─── KONFIGURASI PRISMA ───────────────────────────────────────────────────────

/**
 * Konfigurasi Prisma v7 untuk koneksi database PostgreSQL.
 *
 * - `migrate.adapter`   → digunakan oleh `prisma migrate` dan `prisma db push`
 * - `datasource.url`    → digunakan oleh Prisma CLI untuk inspeksi schema
 *
 * Format DATABASE_URL: postgresql://USER:PASSWORD@HOST:PORT/DATABASE
 * Contoh lokal Laragon: postgresql://root:@localhost:5432/siakad_pplg
 */
export default defineConfig({
  schema: path.join("prisma", "schema.prisma"),

  datasource: {
    url: DATABASE_URL,
  },

  migrations: {
    seed: "ts-node --compiler-options {\"module\":\"CommonJS\"} prisma/seed.ts",
  },
});
