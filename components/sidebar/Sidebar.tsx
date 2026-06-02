// =============================================================================
// FILE: components/sidebar/Sidebar.tsx
// TUJUAN: Komponen sidebar utama yang responsif dan role-aware.
//
//         FITUR:
//         - Collapsible (expanded 260px / collapsed 72px) di desktop
//         - Drawer slide-in di mobile dengan overlay
//         - Navigasi berbeda per role (admin / guru / siswa)
//         - User info card di bagian bawah dengan avatar, nama, role badge
//         - Tombol logout terintegrasi
//         - Persist state collapsed ke localStorage
//         - Animasi smooth semua transisi
// =============================================================================

"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import {
  PanelLeftClose,
  PanelLeftOpen,
  LogOut,
  BookOpenCheck,
  X,
} from "lucide-react";

import SidebarItem from "./SidebarItem";
import { getNavConfigByRole, getRoleLabel } from "./nav-config";

// ─── TYPE DEFINITIONS ─────────────────────────────────────────────────────────

interface SidebarProps {
  /** Nama lengkap pengguna dari session */
  userName: string;
  /** Username dari session */
  username: string;
  /** Role pengguna: "admin" | "guru" | "siswa" */
  role: string;
  /** Mobile: apakah drawer sidebar terbuka (dikontrol parent) */
  mobileOpen?: boolean;
  /** Callback saat mobile overlay diklik / tombol tutup ditekan */
  onMobileClose?: () => void;
  /** Daftar kelas aktif untuk menu */
  classes?: { id: number; namaKelas: string }[];
}

// ─── AVATAR COMPONENT ─────────────────────────────────────────────────────────

/**
 * Avatar inisial - menampilkan 1-2 huruf pertama dari nama
 *
 * @param name - Nama lengkap pengguna
 * @param role - Role untuk warna avatar
 * @param size - Ukuran avatar dalam pixel
 */
function UserAvatar({
  name,
  role,
  size = 36,
}: {
  name: string;
  role: string;
  size?: number;
}) {
  const initials = name
    .split(" ")
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase();

  const colorMap: Record<string, string> = {
    admin: "from-indigo-500 to-purple-600",
    guru:  "from-emerald-500 to-teal-600",
    siswa: "from-amber-400 to-orange-500",
  };

  const gradient = colorMap[role] ?? "from-slate-500 to-slate-700";

  return (
    <div
      className={`
        shrink-0 rounded-xl flex items-center justify-center
        bg-gradient-to-br ${gradient}
        font-bold text-white shadow-lg
      `}
      style={{ width: size, height: size, fontSize: size * 0.38 }}
      aria-label={`Avatar ${name}`}
    >
      {initials}
    </div>
  );
}

// ─── MAIN SIDEBAR ─────────────────────────────────────────────────────────────

/**
 * Sidebar navigasi utama — role-aware, collapsible, responsif.
 *
 * @example
 * ```tsx
 * // Di dashboard layout:
 * <Sidebar
 *   userName={session.user.nama}
 *   username={session.user.username}
 *   role={session.user.role}
 *   mobileOpen={isMobileOpen}
 *   onMobileClose={() => setMobileOpen(false)}
 * />
 * ```
 */
export default function Sidebar({
  userName,
  username,
  role,
  mobileOpen = false,
  onMobileClose,
  classes,
}: SidebarProps) {
  const pathname = usePathname();

  // ── State: collapsed desktop ─────────────────────────────────────────────
  const [isCollapsed, setIsCollapsed] = useState(false);

  // Persist collapsed state ke localStorage
  useEffect(() => {
    const stored = localStorage.getItem("sidebar-collapsed");
    if (stored !== null) setIsCollapsed(stored === "true");
  }, []);

  const toggleCollapsed = useCallback(() => {
    setIsCollapsed((prev) => {
      const next = !prev;
      localStorage.setItem("sidebar-collapsed", String(next));
      return next;
    });
  }, []);

  // ── Tutup mobile drawer saat navigasi ───────────────────────────────────
  useEffect(() => {
    onMobileClose?.();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  // ── Ambil konfigurasi nav berdasarkan role ───────────────────────────────
  const baseNavConfig = getNavConfigByRole(role);
  const roleLabel = getRoleLabel(role);

  // Update children secara dinamis dengan spread operator agar icon Lucide tetap utuh
  const navConfig = {
    ...baseNavConfig,
    navGroups: baseNavConfig.navGroups.map((group) => ({
      ...group,
      items: group.items.map((item) => {
        if (item.label === "Daftar Siswa" && role === "guru" && classes && classes.length > 0) {
          return {
            ...item,
            children: classes.map((c) => ({
              label: c.namaKelas,
              href: `/guru/siswa?kelas=${c.id}`,
            })),
          };
        }
        return item;
      }),
    })),
  };

  // ── Handler logout ───────────────────────────────────────────────────────
  const handleLogout = useCallback(async () => {
    await signOut({ callbackUrl: "/login" });
  }, []);

  // ─── RENDER SIDEBAR CONTENT ─────────────────────────────────────────────
  const sidebarContent = (
    <aside
      id="main-sidebar"
      aria-label="Navigasi utama"
      style={{
        width: isCollapsed ? "72px" : "260px",
        transition: "width 300ms cubic-bezier(0.4, 0, 0.2, 1)",
      }}
      className={`
        relative flex flex-col h-full
        border-r border-slate-800/60
        overflow-hidden
      `}
      /* Dark glassmorphism background */
    >
      {/* ── Background gradient ─────────────────────────────────────── */}
      <div
        className="absolute inset-0 -z-10"
        style={{
          background:
            "linear-gradient(180deg, #0d1117 0%, #0f1320 50%, #0d1117 100%)",
        }}
      />
      {/* Subtle top glow */}
      <div
        className="absolute top-0 left-0 right-0 h-px"
        style={{
          background:
            "linear-gradient(90deg, transparent, rgba(99,102,241,0.4), transparent)",
        }}
      />

      {/* ── HEADER: Logo + App Name ─────────────────────────────────── */}
      <div
        className={`
          flex items-center gap-3 px-4 py-5 shrink-0
          border-b border-slate-800/60
          ${isCollapsed ? "justify-center px-2" : ""}
        `}
      >
        {/* Logo icon */}
        <Link
          href={`/${role}/dashboard`}
          className="
            flex items-center justify-center
            w-9 h-9 rounded-xl shrink-0
            bg-indigo-500/20 border border-indigo-500/30
            text-indigo-400 hover:bg-indigo-500/30
            transition-colors duration-200
          "
          aria-label="Ke dashboard"
        >
          <BookOpenCheck size={18} />
        </Link>

        {/* App name + tagline */}
        {!isCollapsed && (
          <div className="min-w-0 flex-1">
            <h1 className="text-sm font-bold text-white tracking-tight leading-none">
              SIAKAD PPLG
            </h1>
            <p className="text-[10px] text-slate-500 mt-0.5 truncate">
              {navConfig.appTagline}
            </p>
          </div>
        )}

        {/* Tombol tutup (mobile) */}
        {!isCollapsed && onMobileClose && (
          <button
            onClick={onMobileClose}
            className="
              ml-auto lg:hidden p-1.5 rounded-lg
              text-slate-500 hover:text-slate-300 hover:bg-white/5
              transition-colors duration-200
            "
            aria-label="Tutup sidebar"
          >
            <X size={16} />
          </button>
        )}
      </div>

      {/* ── NAVIGATION GROUPS ───────────────────────────────────────── */}
      <nav
        className="flex-1 overflow-y-auto overflow-x-hidden py-3 px-2 space-y-1"
        aria-label="Menu navigasi"
      >
        {navConfig.navGroups.map((group) => (
          <div key={group.group} className="mb-2">
            {/* Group label — tersembunyi saat collapsed */}
            {!isCollapsed && (
              <p className="
                px-3 mb-1.5 text-[10px] font-semibold uppercase tracking-widest
                text-slate-600 select-none
              ">
                {group.group}
              </p>
            )}

            {/* Divider saat collapsed */}
            {isCollapsed && (
              <div className="mx-auto mb-2 w-6 h-px bg-slate-800" />
            )}

            {/* Nav items */}
            <div className="space-y-0.5">
              {group.items.map((item) => (
                <SidebarItem
                  key={item.href}
                  item={item}
                  isCollapsed={isCollapsed}
                />
              ))}
            </div>
          </div>
        ))}
      </nav>

      {/* ── BOTTOM SECTION ──────────────────────────────────────────── */}
      <div className="shrink-0 border-t border-slate-800/60 px-2 pt-2 pb-3 space-y-0.5">
        {/* Bottom nav items */}
        {navConfig.bottomItems.map((item) => (
          <SidebarItem
            key={item.href}
            item={item}
            isCollapsed={isCollapsed}
          />
        ))}

        {/* Logout button */}
        <button
          onClick={handleLogout}
          className={`
            group relative w-full flex items-center gap-3
            px-3 py-2.5 rounded-lg text-sm font-medium
            text-slate-500 hover:text-rose-300 hover:bg-rose-500/10
            transition-all duration-200 cursor-pointer
            ${isCollapsed ? "justify-center px-0 mx-auto w-10 h-10 rounded-xl" : ""}
          `}
          aria-label="Keluar dari sistem"
        >
          <LogOut size={18} className="shrink-0 group-hover:text-rose-400 transition-colors" />
          {!isCollapsed && <span>Keluar</span>}
          {isCollapsed && (
            <span className="sidebar-tooltip group-hover:opacity-100">Keluar</span>
          )}
        </button>
      </div>

      {/* ── USER INFO CARD ───────────────────────────────────────────── */}
      <div
        className={`
          shrink-0 mx-2 mb-3 p-3 rounded-xl
          border border-slate-800/80
          bg-slate-900/50
          ${isCollapsed ? "flex justify-center" : ""}
        `}
      >
        {isCollapsed ? (
          /* Collapsed: hanya avatar */
          <UserAvatar name={userName} role={role} size={36} />
        ) : (
          /* Expanded: avatar + info lengkap */
          <div className="flex items-center gap-3 min-w-0">
            <UserAvatar name={userName} role={role} size={36} />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-slate-200 truncate leading-tight">
                {userName}
              </p>
              <p className="text-xs text-slate-500 truncate leading-tight mt-0.5">
                @{username}
              </p>
            </div>
            {/* Role badge */}
            <span
              className={`
                shrink-0 text-[10px] font-semibold px-2 py-0.5 rounded-full
                ${{
                  admin:  "badge-admin",
                  guru:   "badge-guru",
                  siswa:  "badge-siswa",
                }[role] ?? "badge-siswa"}
              `}
            >
              {roleLabel}
            </span>
          </div>
        )}
      </div>

      {/* ── TOGGLE COLLAPSE BUTTON (Desktop only) ───────────────────── */}
      <button
        onClick={toggleCollapsed}
        className="
          hidden lg:flex
          absolute bottom-[116px] -right-3
          w-6 h-6 rounded-full
          items-center justify-center
          bg-slate-800 border border-slate-700
          text-slate-400 hover:text-slate-200 hover:bg-slate-700
          transition-all duration-200 shadow-md
          z-10
        "
        aria-label={isCollapsed ? "Perlebar sidebar" : "Perkecil sidebar"}
        title={isCollapsed ? "Perlebar sidebar" : "Perkecil sidebar"}
      >
        {isCollapsed ? (
          <PanelLeftOpen size={12} />
        ) : (
          <PanelLeftClose size={12} />
        )}
      </button>
    </aside>
  );

  return (
    <>
      {/* ── DESKTOP SIDEBAR (selalu tampil) ───────────────────────────── */}
      <div className="hidden lg:flex h-full">
        {sidebarContent}
      </div>

      {/* ── MOBILE DRAWER ────────────────────────────────────────────── */}
      {mobileOpen && (
        <>
          {/* Overlay */}
          <div
            className="sidebar-overlay lg:hidden"
            onClick={onMobileClose}
            aria-hidden="true"
          />
          {/* Drawer */}
          <div
            className="
              fixed left-0 top-0 h-full z-50
              lg:hidden sidebar-slide-in
            "
            style={{ width: "260px" }}
          >
            {/* Re-render dengan isCollapsed=false untuk mobile */}
            <div className="h-full" style={{ width: "260px" }}>
              {/* Gunakan isCollapsed=false paksa di mobile */}
              <MobileSidebarContent
                userName={userName}
                username={username}
                role={role}
                onClose={onMobileClose}
                onLogout={handleLogout}
                classes={classes}
              />
            </div>
          </div>
        </>
      )}
    </>
  );
}

// ─── MOBILE SIDEBAR CONTENT ───────────────────────────────────────────────────

/**
 * Versi mobile sidebar — selalu expanded (tidak collapsible)
 * Dipisah sebagai komponen sendiri agar tidak ada konflik state collapsed
 */
function MobileSidebarContent({
  userName,
  username,
  role,
  onClose,
  onLogout,
  classes,
}: {
  userName: string;
  username: string;
  role: string;
  onClose?: () => void;
  onLogout: () => void;
  classes?: { id: number; namaKelas: string }[];
}) {
  const baseNavConfig = getNavConfigByRole(role);
  const roleLabel = getRoleLabel(role);

  // Update children secara dinamis dengan spread operator agar icon Lucide tetap utuh
  const navConfig = {
    ...baseNavConfig,
    navGroups: baseNavConfig.navGroups.map((group) => ({
      ...group,
      items: group.items.map((item) => {
        if (item.label === "Daftar Siswa" && role === "guru" && classes && classes.length > 0) {
          return {
            ...item,
            children: classes.map((c) => ({
              label: c.namaKelas,
              href: `/guru/siswa?kelas=${c.id}`,
            })),
          };
        }
        return item;
      }),
    })),
  };

  return (
    <aside
      className="flex flex-col h-full border-r border-slate-800/60"
      style={{
        background: "linear-gradient(180deg, #0d1117 0%, #0f1320 50%, #0d1117 100%)",
      }}
    >
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-5 border-b border-slate-800/60">
        <div className="
          flex items-center justify-center w-9 h-9 rounded-xl shrink-0
          bg-indigo-500/20 border border-indigo-500/30 text-indigo-400
        ">
          <BookOpenCheck size={18} />
        </div>
        <div className="flex-1 min-w-0">
          <h1 className="text-sm font-bold text-white tracking-tight leading-none">SIAKAD PPLG</h1>
          <p className="text-[10px] text-slate-500 mt-0.5">{navConfig.appTagline}</p>
        </div>
        <button
          onClick={onClose}
          className="p-1.5 rounded-lg text-slate-500 hover:text-slate-300 hover:bg-white/5 transition-colors"
          aria-label="Tutup sidebar"
        >
          <X size={16} />
        </button>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-1">
        {navConfig.navGroups.map((group) => (
          <div key={group.group} className="mb-2">
            <p className="px-3 mb-1.5 text-[10px] font-semibold uppercase tracking-widest text-slate-600 select-none">
              {group.group}
            </p>
            <div className="space-y-0.5">
              {group.items.map((item) => (
                <SidebarItem key={item.href} item={item} isCollapsed={false} />
              ))}
            </div>
          </div>
        ))}
      </nav>

      {/* Bottom */}
      <div className="shrink-0 border-t border-slate-800/60 px-2 pt-2 pb-3 space-y-0.5">
        {navConfig.bottomItems.map((item) => (
          <SidebarItem key={item.href} item={item} isCollapsed={false} />
        ))}
        <button
          onClick={onLogout}
          className="
            group w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium
            text-slate-500 hover:text-rose-300 hover:bg-rose-500/10 transition-all duration-200
          "
        >
          <LogOut size={18} className="shrink-0" />
          <span>Keluar</span>
        </button>
      </div>

      {/* User card */}
      <div className="mx-2 mb-3 p-3 rounded-xl border border-slate-800/80 bg-slate-900/50">
        <div className="flex items-center gap-3 min-w-0">
          <UserAvatar name={userName} role={role} size={36} />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-slate-200 truncate leading-tight">{userName}</p>
            <p className="text-xs text-slate-500 truncate leading-tight mt-0.5">@{username}</p>
          </div>
          <span className={`
            shrink-0 text-[10px] font-semibold px-2 py-0.5 rounded-full
            ${{ admin: "badge-admin", guru: "badge-guru", siswa: "badge-siswa" }[role] ?? "badge-siswa"}
          `}>
            {roleLabel}
          </span>
        </div>
      </div>
    </aside>
  );
}

// Re-export UserAvatar for use in other components
export { UserAvatar };
