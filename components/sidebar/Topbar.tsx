// =============================================================================
// FILE: components/sidebar/Topbar.tsx
// TUJUAN: Topbar yang muncul di bagian atas halaman dashboard.
//         Berisi:
//         - Tombol toggle sidebar (mobile)
//         - Breadcrumb / judul halaman aktif
//         - Notifikasi bell (placeholder)
//         - Tanggal dan waktu realtime
// =============================================================================

"use client";

import { useState, useEffect, useCallback } from "react";
import { usePathname } from "next/navigation";
import { Menu, Bell, Calendar } from "lucide-react";

// ─── TYPE DEFINITIONS ─────────────────────────────────────────────────────────

interface TopbarProps {
  /** Callback untuk membuka sidebar di mobile */
  onMenuClick: () => void;
  /** Nama pengguna untuk greeting */
  userName: string;
}

// ─── BREADCRUMB HELPER ────────────────────────────────────────────────────────

/**
 * Mengkonversi path URL menjadi label breadcrumb yang readable
 *
 * @param pathname - Path URL aktif dari usePathname()
 * @returns Label halaman yang sudah diformat
 *
 * @example
 * ```typescript
 * getPageLabel("/guru/nilai") // → "Nilai Siswa"
 * getPageLabel("/guru/dashboard") // → "Dashboard"
 * ```
 */
function getPageLabel(pathname: string): string {
  const labelMap: Record<string, string> = {
    // Admin
    "/admin/dashboard":    "Dashboard",
    "/admin/pengguna":     "Manajemen Pengguna",
    "/admin/kelas":        "Manajemen Kelas",
    "/admin/guru":         "Data Guru",
    "/admin/siswa":        "Data Siswa",
    "/admin/import":       "Import Data",
    "/admin/import/log":   "Log Import",
    "/admin/laporan":      "Laporan Akademik",
    "/admin/pengaturan":   "Pengaturan Sistem",
    // Guru
    "/guru/dashboard":           "Dashboard",
    "/guru/siswa":               "Daftar Siswa",
    "/guru/siswa/xi-pplg-1":     "Siswa XI PPLG 1",
    "/guru/siswa/xi-pplg-2":     "Siswa XI PPLG 2",
    "/guru/siswa/xi-pplg-3":     "Siswa XI PPLG 3",
    "/guru/nilai":               "Nilai Siswa",
    "/guru/absensi":             "Absensi",
    "/guru/catatan":             "Catatan Guru",
    "/guru/laporan/nilai":       "Rekap Nilai",
    "/guru/laporan/akhir":       "Laporan Akhir",
    "/guru/import":              "Upload File Excel",
    "/guru/import/riwayat":      "Riwayat Import",
    "/guru/profil":              "Profil Saya",
    "/guru/pengaturan":          "Pengaturan",
    // Siswa
    "/siswa/dashboard":      "Dashboard",
    "/siswa/nilai":          "Nilai Saya",
    "/siswa/absensi":        "Absensi Saya",
    "/siswa/catatan":        "Catatan Guru",
    "/siswa/laporan":        "Laporan Akhir",
    "/siswa/perkembangan":   "Perkembangan Nilai",
    "/siswa/ranking":        "Ranking Kelas",
    "/siswa/profil":         "Profil Saya",
  };

  return labelMap[pathname] ?? "SIAKAD PPLG";
}

/**
 * Mendapatkan greeting berdasarkan jam
 * @returns "Selamat Pagi" | "Selamat Siang" | "Selamat Sore" | "Selamat Malam"
 */
function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 11) return "Selamat Pagi";
  if (hour < 15) return "Selamat Siang";
  if (hour < 18) return "Selamat Sore";
  return "Selamat Malam";
}

// ─── REALTIME CLOCK ───────────────────────────────────────────────────────────

/** Komponen jam realtime yang update setiap menit */
function RealtimeClock() {
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(timer);
  }, []);

  const dateStr = now.toLocaleDateString("id-ID", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  return (
    <div className="hidden sm:flex items-center gap-1.5 text-xs text-slate-500">
      <Calendar size={13} className="text-slate-600" />
      <span>{dateStr}</span>
    </div>
  );
}

// ─── TOPBAR COMPONENT ─────────────────────────────────────────────────────────

/**
 * Topbar navigasi atas untuk halaman dashboard.
 *
 * @param onMenuClick - Callback untuk toggle mobile drawer
 * @param userName - Nama pengguna untuk greeting
 */
export default function Topbar({ onMenuClick, userName }: TopbarProps) {
  const pathname = usePathname();
  const pageLabel = getPageLabel(pathname);
  const greeting = getGreeting();

  // Ambil nama pertama saja untuk greeting
  const firstName = userName.split(" ")[0];

  return (
    <header
      className="
        sticky top-0 z-30 flex items-center gap-4
        h-14 px-4 sm:px-6
        border-b border-slate-800/60
      "
      style={{
        background: "rgba(13, 17, 23, 0.85)",
        backdropFilter: "blur(12px)",
        WebkitBackdropFilter: "blur(12px)",
      }}
    >
      {/* ── Hamburger (mobile only) ──────────────────────────────── */}
      <button
        onClick={onMenuClick}
        className="
          lg:hidden flex items-center justify-center
          w-9 h-9 rounded-lg shrink-0
          text-slate-400 hover:text-slate-200 hover:bg-white/5
          transition-colors duration-200
        "
        aria-label="Buka menu navigasi"
        aria-controls="main-sidebar"
      >
        <Menu size={20} />
      </button>

      {/* ── Page title / Greeting ────────────────────────────────── */}
      <div className="flex-1 min-w-0">
        <h2 className="text-sm font-semibold text-slate-100 truncate">
          {pageLabel}
        </h2>
        <p className="text-xs text-slate-500 truncate hidden sm:block">
          {greeting}, <span className="text-slate-400">{firstName}</span>! 👋
        </p>
      </div>

      {/* ── Right side actions ───────────────────────────────────── */}
      <div className="flex items-center gap-3 shrink-0">
        {/* Tanggal realtime */}
        <RealtimeClock />

        {/* Notification bell (placeholder) */}
        <button
          className="
            relative flex items-center justify-center
            w-9 h-9 rounded-lg
            text-slate-400 hover:text-slate-200 hover:bg-white/5
            transition-colors duration-200
          "
          aria-label="Notifikasi"
        >
          <Bell size={18} />
          {/* Dot indikator ada notifikasi */}
          <span
            className="
              absolute top-1.5 right-1.5
              w-2 h-2 rounded-full bg-indigo-500
              border-2 border-slate-900
            "
            aria-hidden="true"
          />
        </button>

        {/* Divider */}
        <div className="w-px h-5 bg-slate-800 hidden sm:block" />

        {/* Semester badge */}
        <div
          className="
            hidden sm:flex items-center gap-1.5
            px-2.5 py-1 rounded-lg
            bg-indigo-500/10 border border-indigo-500/20
            text-xs font-medium text-indigo-300
          "
        >
          <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-pulse" />
          Genap 2025/2026
        </div>
      </div>
    </header>
  );
}
