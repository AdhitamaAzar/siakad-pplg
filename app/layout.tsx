// =============================================================================
// FILE: app/layout.tsx
// TUJUAN: Root layout Next.js — wrapper paling luar yang membungkus semua page.
//         Mengatur font, metadata global, dan session provider NextAuth.
// =============================================================================

// Semua halaman di app ini membutuhkan autentikasi dan data realtime dari database.
// Dengan force-dynamic, Next.js tidak akan mencoba prerender halaman saat build.
export const dynamic = "force-dynamic";

import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    template: "%s — SIAKAD PPLG",
    default: "SIAKAD PPLG — Sistem Informasi Akademik SMK PPLG",
  },
  description:
    "Sistem Informasi Akademik untuk SMK jurusan Pengembangan Perangkat Lunak dan Gim (PPLG). Semester Genap 2025/2026.",
  keywords: ["SIAKAD", "SMK PPLG", "akademik", "nilai siswa", "absensi"],
  authors: [{ name: "Fandik Ariyanto, S.ST" }],
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#0a0d14",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="id"
      className={`${inter.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <body className="h-full font-sans" suppressHydrationWarning>{children}</body>
    </html>
  );
}
