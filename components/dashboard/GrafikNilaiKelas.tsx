// =============================================================================
// FILE: components/dashboard/GrafikNilaiKelas.tsx
// TUJUAN: Grafik interaktif perbandingan nilai dan kehadiran antar kelas.
//         Menggunakan Recharts (client component karena butuh browser API).
//         Menampilkan:
//         - Bar chart: rata-rata nilai per kelas
//         - Bar chart: jumlah siswa tuntas vs belum tuntas
//         - Line chart: persentase kehadiran per kelas
//         Dapat di-toggle antar tipe chart.
// =============================================================================

"use client";

import { useState } from "react";
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Cell,
  ReferenceLine,
} from "recharts";
import type { GrafikKelasData } from "@/lib/queries/dashboard";

// ─── TYPE DEFINITIONS ─────────────────────────────────────────────────────────

interface GrafikNilaiKelasProps {
  /** Data grafik per kelas dari server */
  data: GrafikKelasData[];
  type?: "academic" | "attendance" | "all";
}

type ChartTab = "nilai" | "ketuntasan" | "kehadiran";

// ─── CUSTOM TOOLTIP ───────────────────────────────────────────────────────────

/** Custom tooltip yang stylish untuk semua chart */
function CustomTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: Array<{ name: string; value: number; color: string }>;
  label?: string;
}) {
  if (!active || !payload?.length) return null;

  return (
    <div className="
      bg-slate-800/95 border border-slate-700/80
      rounded-xl shadow-2xl p-3 text-sm
      backdrop-blur-sm
     border-white/5">
      <p className="font-semibold text-white mb-2 text-xs uppercase tracking-wide">
        {label}
      </p>
      {payload.map((entry, i) => (
        <div key={i} className="flex items-center gap-2 py-0.5">
          <span
            className="w-2.5 h-2.5 rounded-full shrink-0"
            style={{ background: entry.color }}
          />
          <span className="text-slate-400 text-xs">{entry.name}:</span>
          <span className="font-semibold text-white text-xs">
            {typeof entry.value === "number"
              ? entry.name.includes("%") || entry.name.includes("Hadir")
                ? `${entry.value.toFixed(1)}%`
                : entry.value
              : entry.value}
          </span>
        </div>
      ))}
    </div>
  );
}

// ─── TAB BUTTON ───────────────────────────────────────────────────────────────

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`
        px-3 py-1.5 rounded-lg text-xs font-semibold
        transition-all duration-200
        ${active
          ? "bg-indigo-500/20 text-indigo-300 border border-indigo-500/30"
          : "text-slate-500 hover:text-slate-300 hover:bg-white/5"
        }
      `}
    >
      {children}
    </button>
  );
}

// ─── WARNA KELAS ─────────────────────────────────────────────────────────────

const KELAS_COLORS = ["#6366f1", "#10b981", "#f59e0b"];

// ─── MAIN COMPONENT ───────────────────────────────────────────────────────────

/**
 * Grafik interaktif multi-tab untuk perbandingan statistik antar kelas.
 *
 * @param data - Array data per kelas dari server query
 */
export default function GrafikNilaiKelas({ data, type = "all" }: GrafikNilaiKelasProps) {
  const [activeTab, setActiveTab] = useState<ChartTab>(
    type === "attendance" ? "kehadiran" : "nilai"
  );

  return (
    <div className="
      rounded-2xl border border-slate-800/60
      bg-slate-900/60 p-5
    ">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
        <div>
          <h3 className="text-base font-bold text-white">
            {type === "academic"
              ? "Grafik Nilai Akademik & Ketuntasan"
              : type === "attendance"
              ? "Grafik Kehadiran / Absensi Kelas"
              : "Perbandingan Statistik Kelas"}
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Semester Genap 2025/2026 — 3 kelas XI PPLG
          </p>
        </div>

        {/* Tab switcher */}
        {type !== "attendance" && (
          <div className="flex items-center gap-1 bg-slate-800/60 rounded-xl p-1">
            <TabButton
              active={activeTab === "nilai"}
              onClick={() => setActiveTab("nilai")}
            >
              Rata-rata Nilai
            </TabButton>
            <TabButton
              active={activeTab === "ketuntasan"}
              onClick={() => setActiveTab("ketuntasan")}
            >
              Ketuntasan
            </TabButton>
            {type === "all" && (
              <TabButton
                active={activeTab === "kehadiran"}
                onClick={() => setActiveTab("kehadiran")}
              >
                Kehadiran
              </TabButton>
            )}
          </div>
        )}
      </div>

      {/* Chart area */}
      <div className="h-72">
        <ResponsiveContainer width="100%" height="100%">
          {activeTab === "nilai" ? (
            // ── CHART 1: Rata-rata Nilai ──────────────────────────────────
            <BarChart data={data} barSize={52}>
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="#1e2841"
                vertical={false}
              />
              <XAxis
                dataKey="kelas"
                tick={{ fill: "#64748b", fontSize: 12 }}
                axisLine={{ stroke: "#1e2841" }}
                tickLine={false}
              />
              <YAxis
                domain={[0, 100]}
                tick={{ fill: "#64748b", fontSize: 11 }}
                axisLine={false}
                tickLine={false}
                tickFormatter={(v) => `${v}`}
              />
              <Tooltip content={<CustomTooltip />} cursor={{ fill: "rgba(255,255,255,0.03)" }} />
              {/* Garis KKM 75 */}
              <ReferenceLine
                y={75}
                stroke="#f59e0b"
                strokeDasharray="4 4"
                strokeWidth={1.5}
                label={{
                  value: "KKM 75",
                  fill: "#f59e0b",
                  fontSize: 10,
                  position: "right",
                }}
              />
              <Bar
                dataKey="rataRata"
                name="Rata-rata Nilai"
                radius={[6, 6, 0, 0]}
              >
                {data.map((_, index) => (
                  <Cell
                    key={index}
                    fill={KELAS_COLORS[index % KELAS_COLORS.length]}
                    fillOpacity={0.85}
                  />
                ))}
              </Bar>
            </BarChart>
          ) : activeTab === "ketuntasan" ? (
            // ── CHART 2: Ketuntasan (Stacked Bar) ───────────────────────
            <BarChart data={data} barSize={52}>
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="#1e2841"
                vertical={false}
              />
              <XAxis
                dataKey="kelas"
                tick={{ fill: "#64748b", fontSize: 12 }}
                axisLine={{ stroke: "#1e2841" }}
                tickLine={false}
              />
              <YAxis
                tick={{ fill: "#64748b", fontSize: 11 }}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip content={<CustomTooltip />} cursor={{ fill: "rgba(255,255,255,0.03)" }} />
              <Legend
                wrapperStyle={{ fontSize: "11px", paddingTop: "12px" }}
                iconType="circle"
                iconSize={8}
              />
              <Bar
                dataKey="tuntas"
                name="Tuntas"
                stackId="a"
                fill="#10b981"
                fillOpacity={0.85}
                radius={[0, 0, 0, 0]}
              />
              <Bar
                dataKey="belum"
                name="Belum Tuntas"
                stackId="a"
                fill="#ef4444"
                fillOpacity={0.75}
                radius={[6, 6, 0, 0]}
              />
            </BarChart>
          ) : (
            // ── CHART 3: Persentase Kehadiran (Line) ─────────────────────
            <LineChart data={data}>
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="#1e2841"
                vertical={false}
              />
              <XAxis
                dataKey="kelas"
                tick={{ fill: "#64748b", fontSize: 12 }}
                axisLine={{ stroke: "#1e2841" }}
                tickLine={false}
              />
              <YAxis
                domain={[70, 100]}
                tick={{ fill: "#64748b", fontSize: 11 }}
                axisLine={false}
                tickLine={false}
                tickFormatter={(v) => `${v}%`}
              />
              <Tooltip content={<CustomTooltip />} />
              <ReferenceLine
                y={80}
                stroke="#ef4444"
                strokeDasharray="4 4"
                strokeWidth={1.5}
                label={{
                  value: "Min 80%",
                  fill: "#ef4444",
                  fontSize: 10,
                  position: "right",
                }}
              />
              <Line
                type="monotone"
                dataKey="persentaseHadir"
                name="% Hadir"
                stroke="#6366f1"
                strokeWidth={2.5}
                dot={{ fill: "#6366f1", r: 5, strokeWidth: 2, stroke: "#0f1320" }}
                activeDot={{ r: 7, stroke: "#6366f1", strokeWidth: 2 }}
              />
            </LineChart>
          )}
        </ResponsiveContainer>
      </div>

      {/* Legend kelas berwarna (untuk chart nilai) */}
      {activeTab === "nilai" && (
        <div className="flex items-center gap-4 mt-4 justify-center">
          {data.map((d, i) => (
            <div key={d.kelas} className="flex items-center gap-1.5">
              <span
                className="w-3 h-3 rounded-full"
                style={{ background: KELAS_COLORS[i % KELAS_COLORS.length] }}
              />
              <span className="text-xs text-slate-400">{d.kelas}</span>
              <span
                className="text-xs font-bold"
                style={{ color: KELAS_COLORS[i % KELAS_COLORS.length] }}
              >
                {d.rataRata}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
