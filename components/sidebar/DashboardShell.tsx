// =============================================================================
// FILE: components/sidebar/DashboardShell.tsx
// TUJUAN: Client component wrapper untuk layout dashboard.
//         Menggabungkan Sidebar + Topbar + children content.
//         Dipisah sebagai client component karena butuh useState untuk
//         state mobile drawer (Server Component tidak bisa punya state).
//
//         Pola: Server Component (layout) → Client Component (shell) → children
// =============================================================================

"use client";

import { useState, useCallback } from "react";
import Sidebar from "./Sidebar";
import Topbar from "./Topbar";

// ─── TYPE DEFINITIONS ─────────────────────────────────────────────────────────

interface DashboardShellProps {
  /** Konten halaman */
  children: React.ReactNode;
  /** Nama lengkap dari session */
  userName: string;
  /** Username dari session */
  username: string;
  /** Role pengguna */
  role: string;
  /** Daftar kelas aktif untuk menu */
  classes?: { id: number; namaKelas: string }[];
  tahunAjaran?: string;
  semester?: string;
}

// ─── DASHBOARD SHELL ──────────────────────────────────────────────────────────

/**
 * Shell layout dashboard — mengatur posisi sidebar, topbar, dan konten.
 *
 * Struktur layout:
 * ```
 * ┌──────────────────────────────────────────────┐
 * │ [Sidebar] │ [Topbar]                          │
 * │           ├───────────────────────────────────│
 * │           │ [children / page content]         │
 * │           │                                   │
 * └──────────────────────────────────────────────┘
 * ```
 *
 * @param children - Konten halaman yang di-render
 * @param userName - Nama lengkap pengguna dari session
 * @param username - Username pengguna
 * @param role - Role pengguna untuk menentukan navigasi
 */
export default function DashboardShell({
  children,
  userName,
  username,
  role,
  classes,
  tahunAjaran,
  semester,
}: DashboardShellProps) {
  const [mobileOpen, setMobileOpen] = useState(false);

  const openMobile  = useCallback(() => setMobileOpen(true),  []);
  const closeMobile = useCallback(() => setMobileOpen(false), []);

  return (
    <div className="flex h-screen overflow-hidden bg-[#0a0d14]">
      {/* ── Sidebar ─────────────────────────────────────────────────── */}
      <Sidebar
        userName={userName}
        username={username}
        role={role}
        mobileOpen={mobileOpen}
        onMobileClose={closeMobile}
        classes={classes}
      />

      {/* ── Main area (Topbar + content) ────────────────────────────── */}
      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
        {/* Topbar */}
        <Topbar
          onMenuClick={openMobile}
          userName={userName}
          tahunAjaran={tahunAjaran}
          semester={semester}
        />

        {/* Page content */}
        <main
          id="main-content"
          className="flex-1 overflow-y-auto overflow-x-hidden p-4 sm:p-6"
          role="main"
          aria-label="Konten halaman"
        >
          {children}
        </main>
      </div>
    </div>
  );
}
