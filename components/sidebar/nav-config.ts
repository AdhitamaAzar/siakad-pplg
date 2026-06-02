// =============================================================================
// FILE: components/sidebar/nav-config.ts
// TUJUAN: Konfigurasi navigasi sidebar berdasarkan role pengguna.
//         Setiap role memiliki menu yang berbeda sesuai haknya.
//         Menggunakan icon dari Lucide React (sudah bundled dengan Next.js).
// =============================================================================

import type { LucideIcon } from "lucide-react";
import {
  LayoutDashboard,
  Users,
  GraduationCap,
  BookOpen,
  Upload,
  FileSpreadsheet,
  BarChart3,
  Settings,
  ClipboardList,
  CalendarCheck,
  MessageSquare,
  TrendingUp,
  Award,
  UserCircle,
  School,
  ChevronRight,
} from "lucide-react";

// ─── TYPE DEFINITIONS ─────────────────────────────────────────────────────────

/** Satu item navigasi dalam sidebar */
export interface NavItem {
  /** Label yang ditampilkan */
  label: string;
  /** URL path tujuan */
  href: string;
  /** Icon Lucide */
  icon: LucideIcon;
  /** Badge notifikasi (opsional) */
  badge?: string | number;
  /** Warna badge: "brand" | "success" | "warning" | "danger" */
  badgeVariant?: "brand" | "success" | "warning" | "danger";
  /** Sub-menu items (opsional) */
  children?: Omit<NavItem, "children" | "icon">[];
}

/** Grup navigasi dengan header label */
export interface NavGroup {
  /** Label grup (ditampilkan sebagai divider) */
  group: string;
  /** Daftar item navigasi */
  items: NavItem[];
}

/** Konfigurasi lengkap sidebar per role */
export interface SidebarConfig {
  /** Label judul aplikasi */
  appName: string;
  /** Tagline di bawah nama aplikasi */
  appTagline: string;
  /** Grup navigasi */
  navGroups: NavGroup[];
  /** Navigasi di bagian bawah sidebar (settings, profil, dll) */
  bottomItems: NavItem[];
}

// ─── NAVIGASI ADMIN ───────────────────────────────────────────────────────────

/**
 * Konfigurasi sidebar untuk role ADMIN
 * Akses penuh ke semua fitur manajemen sistem
 */
export const adminNav: SidebarConfig = {
  appName: "SIAKAD PPLG",
  appTagline: "Panel Administrator",
  navGroups: [
    {
      group: "Utama",
      items: [
        {
          label: "Dashboard",
          href: "/admin/dashboard",
          icon: LayoutDashboard,
        },
      ],
    },
    {
      group: "Manajemen",
      items: [
        {
          label: "Pengguna",
          href: "/admin/pengguna",
          icon: Users,
          badge: "Baru",
          badgeVariant: "brand",
        },
        {
          label: "Kelas",
          href: "/admin/kelas",
          icon: School,
        },
        {
          label: "Mata Pelajaran",
          href: "/admin/mapel",
          icon: ClipboardList,
        },
        {
          label: "Guru",
          href: "/admin/guru",
          icon: GraduationCap,
        },
        {
          label: "Siswa",
          href: "/admin/siswa",
          icon: BookOpen,
        },
      ],
    },
    {
      group: "Data & Laporan",
      items: [
        {
          label: "Import Data",
          href: "/admin/import",
          icon: Upload,
        },
        {
          label: "Log Import",
          href: "/admin/import/log",
          icon: FileSpreadsheet,
        },
        {
          label: "Laporan Akademik",
          href: "/admin/laporan",
          icon: BarChart3,
        },
      ],
    },
  ],
  bottomItems: [
    {
      label: "Pengaturan Sistem",
      href: "/admin/pengaturan",
      icon: Settings,
    },
  ],
};

// ─── NAVIGASI GURU ────────────────────────────────────────────────────────────

/**
 * Konfigurasi sidebar untuk role GURU
 * Akses ke data kelas, nilai, absensi, dan import Excel
 */
export const guruNav: SidebarConfig = {
  appName: "SIAKAD PPLG",
  appTagline: "Panel Guru",
  navGroups: [
    {
      group: "Utama",
      items: [
        {
          label: "Dashboard",
          href: "/guru/dashboard",
          icon: LayoutDashboard,
        },
      ],
    },
    {
      group: "Data Kelas",
      items: [
        {
          label: "Daftar Siswa",
          href: "/guru/siswa",
          icon: Users,
          children: [
            { label: "XI PPLG 1", href: "/guru/siswa/xi-pplg-1" },
            { label: "XI PPLG 2", href: "/guru/siswa/xi-pplg-2" },
            { label: "XI PPLG 3", href: "/guru/siswa/xi-pplg-3" },
          ],
        },
        {
          label: "Nilai Siswa",
          href: "/guru/nilai",
          icon: ClipboardList,
        },
        {
          label: "Absensi",
          href: "/guru/absensi",
          icon: CalendarCheck,
        },
        {
          label: "Catatan Guru",
          href: "/guru/catatan",
          icon: MessageSquare,
        },
      ],
    },
    {
      group: "Laporan",
      items: [
        {
          label: "Rekap Nilai",
          href: "/guru/laporan/nilai",
          icon: TrendingUp,
        },
        {
          label: "Laporan Akhir",
          href: "/guru/laporan/akhir",
          icon: Award,
        },
      ],
    },
    {
      group: "Import Excel",
      items: [
        {
          label: "Upload File Excel",
          href: "/guru/import",
          icon: Upload,
          badge: "!", 
          badgeVariant: "warning",
        },
        {
          label: "Riwayat Import",
          href: "/guru/import/riwayat",
          icon: FileSpreadsheet,
        },
      ],
    },
  ],
  bottomItems: [
    {
      label: "Profil Saya",
      href: "/guru/profil",
      icon: UserCircle,
    },
    {
      label: "Pengaturan",
      href: "/guru/pengaturan",
      icon: Settings,
    },
  ],
};

// ─── NAVIGASI SISWA ───────────────────────────────────────────────────────────

/**
 * Konfigurasi sidebar untuk role SISWA
 * Akses read-only ke data akademik pribadi
 */
export const siswaNav: SidebarConfig = {
  appName: "SIAKAD PPLG",
  appTagline: "Portal Siswa",
  navGroups: [
    {
      group: "Utama",
      items: [
        {
          label: "Dashboard",
          href: "/siswa/dashboard",
          icon: LayoutDashboard,
        },
      ],
    },
    {
      group: "Akademik Saya",
      items: [
        {
          label: "Nilai Saya",
          href: "/siswa/nilai",
          icon: ClipboardList,
        },
        {
          label: "Absensi Saya",
          href: "/siswa/absensi",
          icon: CalendarCheck,
        },
        {
          label: "Catatan Guru",
          href: "/siswa/catatan",
          icon: MessageSquare,
        },
        {
          label: "Laporan Akhir",
          href: "/siswa/laporan",
          icon: Award,
        },
      ],
    },
    {
      group: "Informasi",
      items: [
        {
          label: "Perkembangan Nilai",
          href: "/siswa/perkembangan",
          icon: TrendingUp,
        },
        {
          label: "Ranking Kelas",
          href: "/siswa/ranking",
          icon: BarChart3,
        },
      ],
    },
  ],
  bottomItems: [
    {
      label: "Profil Saya",
      href: "/siswa/profil",
      icon: UserCircle,
    },
  ],
};

// ─── HELPER FUNCTIONS ─────────────────────────────────────────────────────────

/**
 * Mendapatkan konfigurasi navigasi berdasarkan role pengguna
 *
 * @param role - Role pengguna: "admin" | "guru" | "siswa"
 * @returns SidebarConfig yang sesuai dengan role
 * @throws Error jika role tidak dikenali
 *
 * @example
 * ```typescript
 * const config = getNavConfigByRole("guru");
 * // → guruNav
 * ```
 */
export function getNavConfigByRole(role: string): SidebarConfig {
  switch (role) {
    case "admin":
      return adminNav;
    case "guru":
      return guruNav;
    case "siswa":
      return siswaNav;
    default:
      return siswaNav;
  }
}

/**
 * Label teks badge untuk ditampilkan di badge role
 *
 * @param role - Role pengguna
 * @returns Label teks yang readable
 */
export function getRoleLabel(role: string): string {
  switch (role) {
    case "admin":  return "Admin";
    case "guru":   return "Guru";
    case "siswa":  return "Siswa";
    default:       return role;
  }
}

// Export icon helper untuk digunakan di komponen lain
export { ChevronRight };
