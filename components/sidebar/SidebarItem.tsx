// =============================================================================
// FILE: components/sidebar/SidebarItem.tsx
// TUJUAN: Komponen satu item navigasi dalam sidebar.
//         Mendukung:
//         - State aktif otomatis berdasarkan URL (usePathname)
//         - Sub-menu yang bisa di-expand/collapse
//         - Badge notifikasi dengan warna berbeda
//         - Tooltip saat sidebar dalam mode collapsed
//         - Smooth animation saat expand/collapse
// =============================================================================

"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { useState, useEffect } from "react";
import { ChevronRight } from "lucide-react";
import type { NavItem } from "./nav-config";

// ─── TYPE DEFINITIONS ─────────────────────────────────────────────────────────

interface SidebarItemProps {
  /** Data item navigasi */
  item: NavItem;
  /** Apakah sidebar sedang dalam mode collapsed */
  isCollapsed: boolean;
}

// ─── BADGE COMPONENT ──────────────────────────────────────────────────────────

/**
 * Komponen badge kecil untuk notifikasi di item navigasi
 *
 * @param value - Teks atau angka yang ditampilkan di badge
 * @param variant - Varian warna badge
 */
function NavBadge({
  value,
  variant = "brand",
}: {
  value: string | number;
  variant?: NavItem["badgeVariant"];
}) {
  const variantClass = {
    brand:   "bg-indigo-500/20 text-indigo-300 border border-indigo-500/30",
    success: "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30",
    warning: "bg-amber-500/20 text-amber-300 border border-amber-500/30",
    danger:  "bg-rose-500/20 text-rose-300 border border-rose-500/30",
  }[variant ?? "brand"];

  return (
    <span
      className={`
        ml-auto text-[10px] font-semibold px-1.5 py-0.5
        rounded-full leading-none shrink-0
        ${variantClass}
      `}
    >
      {value}
    </span>
  );
}

// ─── MAIN SIDEBAR ITEM ────────────────────────────────────────────────────────

/**
 * Komponen item navigasi sidebar dengan dukungan sub-menu, badge, dan tooltip.
 *
 * @param item - Data konfigurasi item navigasi
 * @param isCollapsed - Status sidebar (collapsed atau expanded)
 */
export default function SidebarItem({ item, isCollapsed }: SidebarItemProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const Icon = item.icon;

  // Helper untuk mencocokkan query params link aktif
  const isLinkActive = (href: string) => {
    const [itemPath, itemQuery] = href.split("?");
    const pathMatch = pathname === itemPath;
    if (!pathMatch) return false;

    if (itemQuery) {
      const linkParams = new URLSearchParams(itemQuery);
      let match = true;
      linkParams.forEach((value, key) => {
        if (searchParams.get(key) !== value) {
          match = false;
        }
      });
      return match;
    }
    // Jika path utama cocok dan URL tujuan tidak punya query params, tetapi URL sekarang punya query,
    // tetap anggap cocok jika rute utama sama.
    return true;
  };

  // Deteksi apakah item ini aktif
  const isActive = isLinkActive(item.href) || 
    (item.href !== "/" && pathname.startsWith(item.href) && !item.href.includes("?"));

  // Deteksi apakah salah satu child aktif
  const hasActiveChild = item.children?.some((child) => isLinkActive(child.href));

  // State untuk expand/collapse sub-menu
  const [isOpen, setIsOpen] = useState(hasActiveChild ?? false);

  // Auto-buka sub-menu jika child aktif
  useEffect(() => {
    if (hasActiveChild) setIsOpen(true);
  }, [hasActiveChild]);

  const hasChildren = item.children && item.children.length > 0;

  // ── Item dengan sub-menu ─────────────────────────────────────────────────
  if (hasChildren) {
    return (
      <div>
        {/* Tombol expand/collapse */}
        <button
          onClick={() => !isCollapsed && setIsOpen((prev) => !prev)}
          aria-expanded={isOpen}
          aria-label={`${item.label} submenu`}
          className={`
            group relative w-full flex items-center gap-3
            px-3 py-2.5 rounded-lg text-sm font-medium
            transition-all duration-200 cursor-pointer
            ${isActive || hasActiveChild
              ? "text-white bg-white/5 nav-active-glow"
              : "text-slate-400 hover:text-slate-200 hover:bg-white/5"
            }
            ${isCollapsed ? "justify-center px-0 mx-auto w-10 h-10 rounded-xl" : ""}
          `}
        >
          {/* Icon */}
          <span className={`shrink-0 transition-all duration-200
            ${isActive || hasActiveChild ? "text-indigo-400" : "text-slate-500 group-hover:text-slate-300"}
            ${isCollapsed ? "w-5 h-5" : "w-5 h-5"}
          `}>
            <Icon size={20} />
          </span>

          {/* Label (tersembunyi saat collapsed) */}
          {!isCollapsed && (
            <>
              <span className="flex-1 text-left truncate">{item.label}</span>
              {item.badge && (
                <NavBadge value={item.badge} variant={item.badgeVariant} />
              )}
              {/* Chevron expand/collapse */}
              <ChevronRight
                size={14}
                className={`
                  shrink-0 text-slate-500 transition-transform duration-200
                  ${isOpen ? "rotate-90" : "rotate-0"}
                `}
              />
            </>
          )}

          {/* Tooltip saat collapsed */}
          {isCollapsed && (
            <span className="sidebar-tooltip group-hover:opacity-100">
              {item.label}
            </span>
          )}
        </button>

        {/* Sub-menu items — animasi slide down */}
        {!isCollapsed && isOpen && (
          <div
            className="mt-1 ml-8 space-y-0.5 overflow-hidden"
            style={{
              animation: "slideDown 200ms cubic-bezier(0.4, 0, 0.2, 1) both",
            }}
          >
            {item.children!.map((child) => {
              const childActive =
                pathname === child.href || pathname.startsWith(child.href);
              return (
                <Link
                  key={child.href}
                  href={child.href}
                  className={`
                    flex items-center gap-2 px-3 py-2 rounded-lg text-sm
                    transition-all duration-200
                    ${childActive
                      ? "text-indigo-300 bg-indigo-500/10 font-medium"
                      : "text-slate-500 hover:text-slate-200 hover:bg-white/5"
                    }
                  `}
                >
                  <span className={`w-1.5 h-1.5 rounded-full shrink-0 transition-colors
                    ${childActive ? "bg-indigo-400" : "bg-slate-600"}
                  `} />
                  {child.label}
                  {child.badge && (
                    <NavBadge value={child.badge} variant={child.badgeVariant} />
                  )}
                </Link>
              );
            })}
          </div>
        )}
      </div>
    );
  }

  // ── Item biasa (tanpa sub-menu) ─────────────────────────────────────────
  return (
    <Link
      href={item.href}
      aria-current={isActive ? "page" : undefined}
      className={`
        group relative flex items-center gap-3
        px-3 py-2.5 rounded-lg text-sm font-medium
        transition-all duration-200
        ${isActive
          ? "text-white bg-indigo-500/10 nav-active-glow"
          : "text-slate-400 hover:text-slate-200 hover:bg-white/5"
        }
        ${isCollapsed ? "justify-center px-0 mx-auto w-10 h-10 rounded-xl" : ""}
      `}
    >
      {/* Icon */}
      <span className={`shrink-0 transition-colors duration-200
        ${isActive ? "text-indigo-400" : "text-slate-500 group-hover:text-slate-300"}
      `}>
        <Icon size={20} />
      </span>

      {/* Label + Badge */}
      {!isCollapsed && (
        <>
          <span className="flex-1 truncate">{item.label}</span>
          {item.badge && (
            <NavBadge value={item.badge} variant={item.badgeVariant} />
          )}
        </>
      )}

      {/* Tooltip saat collapsed */}
      {isCollapsed && (
        <span className="sidebar-tooltip group-hover:opacity-100">
          {item.label}
        </span>
      )}

      {/* Active indicator dot (hanya saat collapsed) */}
      {isCollapsed && isActive && (
        <span className="absolute right-1 top-1 w-1.5 h-1.5 rounded-full bg-indigo-400" />
      )}
    </Link>
  );
}
