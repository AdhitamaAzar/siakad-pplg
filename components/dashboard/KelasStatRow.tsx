// =============================================================================
// FILE: components/dashboard/KelasStatRow.tsx
// TUJUAN: Baris ringkasan statistik per kelas dengan progress bar inline.
//         Digunakan di section "Ringkasan Per Kelas" di bawah stat cards.
//         Server Component — tidak perlu interaktivitas.
// =============================================================================

import { Users, TrendingUp, CalendarCheck, CheckCircle } from "lucide-react";
import type { KelasStats } from "@/lib/queries/dashboard";

// ─── TYPE DEFINITIONS ─────────────────────────────────────────────────────────

interface KelasStatRowProps {
  kelas: KelasStats;
  index: number;
}

// ─── WARNA PER KELAS ─────────────────────────────────────────────────────────

const KELAS_THEME = [
  { dot: "bg-indigo-400",  bar: "#6366f1", border: "border-indigo-500/20", bg: "bg-indigo-500/5" },
  { dot: "bg-emerald-400", bar: "#10b981", border: "border-emerald-500/20", bg: "bg-emerald-500/5" },
  { dot: "bg-amber-400",   bar: "#f59e0b", border: "border-amber-500/20",  bg: "bg-amber-500/5" },
];

// ─── MINI PROGRESS ────────────────────────────────────────────────────────────

function MiniProgress({
  value,
  max = 100,
  color,
  label,
}: {
  value: number;
  max?: number;
  color: string;
  label: string;
}) {
  const pct = Math.min((value / max) * 100, 100);
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between">
        <span className="text-[10px] text-slate-500">{label}</span>
        <span className="text-[10px] font-semibold text-slate-300">
          {value}{label.includes("%") || label === "Kehadiran" || label === "Ketuntasan" ? "%" : ""}
        </span>
      </div>
      <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden">
        <div
          className="h-full rounded-full"
          style={{ width: `${pct}%`, background: color }}
        />
      </div>
    </div>
  );
}

// ─── MAIN COMPONENT ───────────────────────────────────────────────────────────

/**
 * Kartu ringkasan per kelas dengan progress bars untuk
 * rata-rata nilai, ketuntasan, dan kehadiran.
 */
export default function KelasStatRow({ kelas, index }: KelasStatRowProps) {
  const theme = KELAS_THEME[index % KELAS_THEME.length];

  return (
    <div className={`
      rounded-2xl border ${theme.border}
      ${theme.bg} p-5
      transition-all duration-300 hover:scale-[1.01]
    `}>
      {/* Header kelas */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <span className={`w-3 h-3 rounded-full ${theme.dot}`} />
          <h4 className="font-bold text-white text-sm">{kelas.namaKelas}</h4>
        </div>
        <div className="flex items-center gap-1 text-slate-400">
          <Users size={13} />
          <span className="text-xs font-semibold text-slate-300">
            {kelas.totalSiswa} siswa
          </span>
        </div>
      </div>

      {/* Quick stats row */}
      <div className="grid grid-cols-3 gap-3 mb-4">
        {[
          { icon: TrendingUp,    label: "Rata-rata", value: kelas.rataRataNilai,    unit: "" },
          { icon: CheckCircle,   label: "Ketuntasan", value: kelas.persentaseTuntas, unit: "%" },
          { icon: CalendarCheck, label: "Kehadiran",  value: kelas.persentaseHadir,  unit: "%" },
        ].map(({ icon: Icon, label, value, unit }) => (
          <div key={label} className="text-center">
            <Icon size={14} className="text-slate-500 mx-auto mb-1" />
            <p className="text-base font-bold text-white">
              {value}{unit}
            </p>
            <p className="text-[10px] text-slate-500">{label}</p>
          </div>
        ))}
      </div>

      {/* Progress bars */}
      <div className="space-y-2.5">
        <MiniProgress
          value={kelas.rataRataNilai}
          max={100}
          color={theme.bar}
          label="Nilai"
        />
        <MiniProgress
          value={kelas.persentaseTuntas}
          max={100}
          color={theme.bar}
          label="Ketuntasan"
        />
        <MiniProgress
          value={kelas.persentaseHadir}
          max={100}
          color={theme.bar}
          label="Kehadiran"
        />
      </div>
    </div>
  );
}
