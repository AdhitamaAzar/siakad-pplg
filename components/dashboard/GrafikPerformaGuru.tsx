// =============================================================================
// FILE: components/dashboard/GrafikPerformaGuru.tsx
// TUJUAN: Grafik visual performa kelas-kelas yang diampu oleh Guru.
//         Menampilkan rata-rata nilai, persentase ketuntasan, dan kehadiran.
// =============================================================================

"use client";

import { useState } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Cell,
  LineChart,
  Line,
} from "recharts";

interface ClassStat {
  id: number;
  namaKelas: string;
  totalSiswa: number;
  rataRataNilai: number;
  persentaseTuntas: number;
  persentaseHadir: number;
}

interface Props {
  data: ClassStat[];
}

const COLORS = ["#6366f1", "#10b981", "#f59e0b", "#ec4899", "#8b5cf6"];

export default function GrafikPerformaGuru({ data }: Props) {
  const [metric, setMetric] = useState<"nilai" | "kehadiran" | "tuntas">("nilai");

  // Transform data for chart
  const chartData = data.map((d) => ({
    kelas: d.namaKelas.replace("XI PPLG ", "PPLG "),
    "Rata-rata Nilai": d.rataRataNilai,
    "Kehadiran (%)": d.persentaseHadir,
    "Ketuntasan (%)": d.persentaseTuntas,
    raw: d,
  }));

  const valueKey =
    metric === "nilai"
      ? "Rata-rata Nilai"
      : metric === "kehadiran"
      ? "Kehadiran (%)"
      : "Ketuntasan (%)";

  const color = metric === "nilai" ? "#6366f1" : metric === "kehadiran" ? "#10b981" : "#f59e0b";

  return (
    <div className="rounded-2xl border border-slate-800/60 bg-slate-900/60 p-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
        <div>
          <h3 className="text-base font-bold text-white">Grafik Performa Kelas</h3>
          <p className="text-xs text-slate-500 mt-0.5">Statistik kelas yang Anda ampu</p>
        </div>

        {/* Tab Switcher */}
        <div className="flex items-center gap-1 bg-slate-800/60 rounded-xl p-1 shrink-0 self-start sm:self-auto">
          {[
            { id: "nilai", label: "Nilai" },
            { id: "kehadiran", label: "Kehadiran" },
            { id: "tuntas", label: "Ketuntasan" },
          ].map((t) => (
            <button
              key={t.id}
              onClick={() => setMetric(t.id as any)}
              className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
                metric === t.id
                  ? "bg-indigo-500/20 text-indigo-300 border border-indigo-500/30"
                  : "text-slate-500 hover:text-slate-300"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          {metric === "kehadiran" ? (
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e2841" vertical={false} />
              <XAxis dataKey="kelas" tick={{ fill: "#64748b", fontSize: 11 }} />
              <YAxis domain={[60, 100]} tick={{ fill: "#64748b", fontSize: 11 }} tickFormatter={(v) => `${v}%`} />
              <Tooltip
                contentStyle={{ background: "#1e293b", borderColor: "#334155", borderRadius: "12px" }}
                itemStyle={{ color: "#fff", fontSize: "12px" }}
                labelStyle={{ color: "#94a3b8", fontWeight: "bold", fontSize: "11px" }}
              />
              <Line
                type="monotone"
                dataKey="Kehadiran (%)"
                stroke={color}
                strokeWidth={2.5}
                dot={{ fill: color, r: 5, strokeWidth: 2, stroke: "#0f1320" }}
                activeDot={{ r: 7 }}
              />
            </LineChart>
          ) : (
            <BarChart data={chartData} barSize={40}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e2841" vertical={false} />
              <XAxis dataKey="kelas" tick={{ fill: "#64748b", fontSize: 11 }} />
              <YAxis domain={[0, 100]} tick={{ fill: "#64748b", fontSize: 11 }} />
              <Tooltip
                contentStyle={{ background: "#1e293b", borderColor: "#334155", borderRadius: "12px" }}
                itemStyle={{ color: "#fff", fontSize: "12px" }}
                labelStyle={{ color: "#94a3b8", fontWeight: "bold", fontSize: "11px" }}
              />
              <Bar dataKey={valueKey} fill={color} radius={[4, 4, 0, 0]}>
                {chartData.map((_, index) => (
                  <Cell key={index} fill={COLORS[index % COLORS.length]} fillOpacity={0.8} />
                ))}
              </Bar>
            </BarChart>
          )}
        </ResponsiveContainer>
      </div>
    </div>
  );
}
