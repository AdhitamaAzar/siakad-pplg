// =============================================================================
// FILE: components/dashboard/StatCard.tsx
// TUJUAN: Kartu statistik premium untuk menampilkan metrik utama dashboard.
//         Mendukung icon, nilai utama, label, perubahan (naik/turun),
//         dan warna gradient berbeda per tipe metrik.
// =============================================================================

import type { LucideIcon } from "lucide-react";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";

// ─── TYPE DEFINITIONS ─────────────────────────────────────────────────────────

type CardVariant = "indigo" | "emerald" | "amber" | "rose" | "sky";

interface StatCardProps {
  /** Label/judul metrik */
  label: string;
  /** Nilai utama yang ditampilkan besar */
  value: string | number;
  /** Teks deskripsi di bawah nilai */
  description?: string;
  /** Icon Lucide */
  icon: LucideIcon;
  /** Varian warna */
  variant?: CardVariant;
  /** Persentase perubahan (positif = naik, negatif = turun) */
  change?: number;
  /** Satuan unit untuk nilai (contoh: "%", "siswa") */
  unit?: string;
}

// ─── VARIANT CONFIG ───────────────────────────────────────────────────────────

const variantConfig: Record<
  CardVariant,
  { icon: string; glow: string; border: string; badge: string }
> = {
  indigo: {
    icon:   "bg-indigo-500/20 text-indigo-400",
    glow:   "from-indigo-600/10 to-transparent",
    border: "border-indigo-500/20",
    badge:  "bg-indigo-500/15 text-indigo-300",
  },
  emerald: {
    icon:   "bg-emerald-500/20 text-emerald-400",
    glow:   "from-emerald-600/10 to-transparent",
    border: "border-emerald-500/20",
    badge:  "bg-emerald-500/15 text-emerald-300",
  },
  amber: {
    icon:   "bg-amber-500/20 text-amber-400",
    glow:   "from-amber-600/10 to-transparent",
    border: "border-amber-500/20",
    badge:  "bg-amber-500/15 text-amber-300",
  },
  rose: {
    icon:   "bg-rose-500/20 text-rose-400",
    glow:   "from-rose-600/10 to-transparent",
    border: "border-rose-500/20",
    badge:  "bg-rose-500/15 text-rose-300",
  },
  sky: {
    icon:   "bg-sky-500/20 text-sky-400",
    glow:   "from-sky-600/10 to-transparent",
    border: "border-sky-500/20",
    badge:  "bg-sky-500/15 text-sky-300",
  },
};

// ─── STAT CARD COMPONENT ──────────────────────────────────────────────────────

/**
 * Kartu statistik premium dengan gradient, icon, nilai, dan trend indicator.
 *
 * @example
 * ```tsx
 * <StatCard
 *   label="Total Siswa"
 *   value={84}
 *   unit="siswa"
 *   icon={Users}
 *   variant="indigo"
 *   description="3 kelas XI PPLG"
 * />
 * ```
 */
export default function StatCard({
  label,
  value,
  description,
  icon: Icon,
  variant = "indigo",
  change,
  unit,
}: StatCardProps) {
  const cfg = variantConfig[variant];

  const TrendIcon =
    change === undefined || change === 0
      ? Minus
      : change > 0
      ? TrendingUp
      : TrendingDown;

  const trendColor =
    change === undefined || change === 0
      ? "text-slate-500"
      : change > 0
      ? "text-emerald-400"
      : "text-rose-400";

  return (
    <div
      className={`
        relative overflow-hidden rounded-2xl
        border ${cfg.border}
        bg-slate-900/60
        p-5
        transition-all duration-300
        hover:bg-slate-900/80 hover:scale-[1.02] hover:shadow-xl
        group
      `}
    >
      {/* Gradient glow latar */}
      <div
        className={`
          absolute inset-0 bg-gradient-to-br ${cfg.glow}
          opacity-60 pointer-events-none
        `}
      />

      {/* Top row: Icon + trend badge */}
      <div className="relative flex items-start justify-between mb-4">
        {/* Icon */}
        <div className={`
          flex items-center justify-center
          w-11 h-11 rounded-xl
          ${cfg.icon}
          transition-transform duration-300 group-hover:scale-110
        `}>
          <Icon size={22} />
        </div>

        {/* Trend badge */}
        {change !== undefined && (
          <span className={`
            flex items-center gap-1
            px-2 py-0.5 rounded-full text-xs font-semibold
            ${cfg.badge}
          `}>
            <TrendIcon size={11} className={trendColor} />
            {Math.abs(change)}%
          </span>
        )}
      </div>

      {/* Value */}
      <div className="relative">
        <div className="flex items-baseline gap-1.5">
          <span className="text-3xl font-bold text-white tracking-tight">
            {value}
          </span>
          {unit && (
            <span className="text-sm text-slate-500 font-medium">{unit}</span>
          )}
        </div>

        {/* Label */}
        <p className="text-sm font-semibold text-slate-300 mt-0.5">{label}</p>

        {/* Description */}
        {description && (
          <p className="text-xs text-slate-500 mt-1">{description}</p>
        )}
      </div>

      {/* Bottom decorative line */}
      <div
        className={`
          absolute bottom-0 left-0 right-0 h-px
          bg-gradient-to-r from-transparent via-current to-transparent
          opacity-20
        `}
        style={{ color: "currentColor" }}
      />
    </div>
  );
}
