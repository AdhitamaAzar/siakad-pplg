// =============================================================================
// FILE: components/dashboard/GrafikAnalytics.tsx
// TUJUAN: Menampilkan grafik analitik lanjutan menggunakan Recharts.
//         Mencakup:
//         - Bar Chart: Rata-rata nilai per mapel (mata pelajaran)
//         - Pie Chart: Distribusi predikat nilai (Sangat Baik, Baik, dll.)
//         - Pie Chart / Donut: Statistik ketuntasan (Tuntas vs Belum Tuntas)
//         - Area Chart: Trend rata-rata nilai vs Kehadiran per Kelas
// =============================================================================

"use client";

import { useState } from "react";
import {
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";
import type { SubjectStats, GradeDistribution, GrafikKelasData } from "@/lib/queries/dashboard";

interface GrafikAnalyticsProps {
  mapelStats: SubjectStats[];
  distribusiNilai: GradeDistribution[];
  grafikKelasData: GrafikKelasData[];
  totalSiswa: number;
  totalBelumTuntas: number;
}

// ─── CUSTOM TOOLTIP ───────────────────────────────────────────────────────────
function CustomTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: Array<{ name: string; value: number; color: string; payload?: any }>;
  label?: string;
}) {
  if (!active || !payload?.length) return null;

  return (
    <div className="bg-slate-900/95 border border-slate-800 rounded-xl shadow-2xl p-3 text-xs backdrop-blur-sm">
      {label && <p className="font-bold text-white mb-1.5 uppercase tracking-wider">{label}</p>}
      {payload.map((entry, i) => (
        <div key={i} className="flex items-center gap-2 py-0.5">
          <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: entry.color }} />
          <span className="text-slate-400">{entry.name}:</span>
          <span className="font-semibold text-white">
            {typeof entry.value === "number"
              ? entry.name.includes("%") || entry.name.includes("Persentase") || entry.name.includes("Kehadiran")
                ? `${entry.value.toFixed(1)}%`
                : entry.value
              : entry.value}
          </span>
        </div>
      ))}
    </div>
  );
}

export default function GrafikAnalytics({
  mapelStats,
  distribusiNilai,
  grafikKelasData,
  totalSiswa,
  totalBelumTuntas,
}: GrafikAnalyticsProps) {
  const [activeTab, setActiveTab] = useState<"mapel" | "distribusi" | "ketuntasan" | "performa">("mapel");

  // Data Ketuntasan untuk Pie Chart
  const tuntasCount = totalSiswa - totalBelumTuntas;
  const ketuntasanData = [
    { name: "Tuntas (≥75)", value: tuntasCount, color: "#10b981" },
    { name: "Belum Tuntas (<75)", value: totalBelumTuntas, color: "#f43f5e" },
  ];

  return (
    <div className="rounded-2xl border border-slate-800/60 bg-slate-900/60 p-5 backdrop-blur-sm">
      {/* Header & Tabs */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div>
          <h3 className="text-base font-bold text-white tracking-tight">Grafik Analisis Akademik</h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Analisis detail nilai kompetensi, ketuntasan, dan persebaran prestasi siswa.
          </p>
        </div>

        {/* Tab Selector */}
        <div className="flex flex-wrap gap-1 bg-slate-950/80 p-1 rounded-xl border border-slate-800/40">
          {[
            { id: "mapel", label: "Nilai Mapel" },
            { id: "distribusi", label: "Distribusi Nilai" },
            { id: "ketuntasan", label: "Ketuntasan" },
            { id: "performa", label: "Korelasi Kelas" },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all duration-200 ${
                activeTab === tab.id
                  ? "bg-indigo-500/20 text-indigo-300 border border-indigo-500/20"
                  : "text-slate-500 hover:text-slate-300"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Chart Area */}
      <div className="h-80 w-full relative">
        <ResponsiveContainer width="100%" height="100%">
          {activeTab === "mapel" ? (
            // ── Tab 1: Rata-rata per Mapel (Bar Chart) ──
            <BarChart data={mapelStats} margin={{ top: 10, right: 10, left: -20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
              <XAxis
                dataKey="namaMapel"
                tick={{ fill: "#64748b", fontSize: 11 }}
                tickLine={false}
                axisLine={false}
              />
              <YAxis domain={[0, 100]} tick={{ fill: "#64748b", fontSize: 11 }} tickLine={false} axisLine={false} />
              <Tooltip content={<CustomTooltip />} cursor={{ fill: "rgba(255,255,255,0.02)" }} />
              <ReferenceLine
                y={75}
                stroke="#f59e0b"
                strokeDasharray="4 4"
                strokeWidth={1.5}
                label={{
                  value: "KKM 75",
                  fill: "#f59e0b",
                  fontSize: 10,
                  position: "insideBottomRight",
                }}
              />
              <Bar dataKey="rataRataNilai" name="Rata-rata Nilai" radius={[6, 6, 0, 0]}>
                {mapelStats.map((entry, index) => {
                  const colors = ["#6366f1", "#10b981", "#3b82f6", "#f59e0b"];
                  return <Cell key={`cell-${index}`} fill={colors[index % colors.length]} fillOpacity={0.85} />;
                })}
              </Bar>
            </BarChart>
          ) : activeTab === "distribusi" ? (
            // ── Tab 2: Distribusi Nilai (Pie Chart) ──
            <PieChart>
              <Pie
                data={distribusiNilai.filter((d) => d.value > 0)}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={90}
                paddingAngle={4}
                dataKey="value"
                nameKey="name"
              >
                {distribusiNilai.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} stroke="#0f172a" strokeWidth={2} />
                ))}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
              <Legend
                verticalAlign="bottom"
                height={36}
                iconType="circle"
                iconSize={8}
                wrapperStyle={{ fontSize: "11px", color: "#94a3b8" }}
              />
            </PieChart>
          ) : activeTab === "ketuntasan" ? (
            // ── Tab 3: Statistik Ketuntasan (Donut/Pie Chart) ──
            <PieChart>
              <Pie
                data={ketuntasanData.filter((d) => d.value > 0)}
                cx="50%"
                cy="50%"
                innerRadius={70}
                outerRadius={95}
                paddingAngle={3}
                dataKey="value"
                nameKey="name"
              >
                {ketuntasanData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} stroke="#0f172a" strokeWidth={2} />
                ))}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
              <Legend
                verticalAlign="bottom"
                height={36}
                iconType="circle"
                iconSize={8}
                wrapperStyle={{ fontSize: "11px", color: "#94a3b8" }}
              />
            </PieChart>
          ) : (
            // ── Tab 4: Korelasi Nilai vs Kehadiran per Kelas (Area + Line Chart) ──
            <AreaChart data={grafikKelasData} margin={{ top: 10, right: 10, left: -20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
              <XAxis dataKey="kelas" tick={{ fill: "#64748b", fontSize: 11 }} tickLine={false} axisLine={false} />
              <YAxis domain={[50, 100]} tick={{ fill: "#64748b", fontSize: 11 }} tickLine={false} axisLine={false} />
              <Tooltip content={<CustomTooltip />} />
              <Legend wrapperStyle={{ fontSize: "11px", color: "#94a3b8" }} iconType="circle" iconSize={8} />
              {/* Area untuk Nilai Rata-rata */}
              <defs>
                <linearGradient id="colorRataRata" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                </linearGradient>
              </defs>
              <Area
                type="monotone"
                dataKey="rataRata"
                name="Rata-rata Nilai"
                stroke="#6366f1"
                fillOpacity={1}
                fill="url(#colorRataRata)"
                strokeWidth={2.5}
              />
              {/* Line untuk Kehadiran */}
              <Line
                type="monotone"
                dataKey="persentaseHadir"
                name="Kehadiran (%)"
                stroke="#10b981"
                strokeWidth={2.5}
                dot={{ fill: "#10b981", r: 4 }}
                activeDot={{ r: 6 }}
              />
            </AreaChart>
          )}
        </ResponsiveContainer>
      </div>

      {/* Info ringkasan di bawah grafik */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6 pt-5 border-t border-slate-800/40">
        <div>
          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Persentase Ketuntasan</p>
          <p className="text-lg font-bold text-emerald-400 mt-0.5">
            {totalSiswa > 0 ? `${((tuntasCount / totalSiswa) * 100).toFixed(1)}%` : "0%"}
          </p>
        </div>
        <div>
          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Siswa Tuntas</p>
          <p className="text-lg font-bold text-white mt-0.5">
            {tuntasCount} <span className="text-xs text-slate-400">/ {totalSiswa} siswa</span>
          </p>
        </div>
        <div>
          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Belum Tuntas</p>
          <p className="text-lg font-bold text-rose-400 mt-0.5">
            {totalBelumTuntas} <span className="text-xs text-slate-400">siswa</span>
          </p>
        </div>
        <div>
          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Mata Pelajaran Aktif</p>
          <p className="text-lg font-bold text-indigo-400 mt-0.5">{mapelStats.length}</p>
        </div>
      </div>
    </div>
  );
}
