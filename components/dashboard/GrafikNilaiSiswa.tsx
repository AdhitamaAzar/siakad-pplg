// =============================================================================
// FILE: components/dashboard/GrafikNilaiSiswa.tsx
// TUJUAN: Grafik visual perkembangan 9 komponen nilai milik siswa.
//         Menggunakan Recharts untuk rendering area/bar chart yang responsive.
// =============================================================================

"use client";

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

interface Props {
  nilaiData: {
    name: string;
    nilai: number | null;
  }[];
}

export default function GrafikNilaiSiswa({ nilaiData }: Props) {
  // Filter only component grades that are filled
  const chartData = nilaiData.map((d) => ({
    name: d.name,
    Nilai: d.nilai ?? 0,
  }));

  return (
    <div className="rounded-2xl border border-slate-800/60 bg-slate-900/60 p-5">
      <div className="mb-5">
        <h3 className="text-base font-bold text-white">Visualisasi Perkembangan Tugas</h3>
        <p className="text-xs text-slate-500 mt-0.5">Grafik nilai dari 9 komponen tugas semester ini</p>
      </div>

      <div className="h-60">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData} margin={{ left: -20, right: 10 }}>
            <defs>
              <linearGradient id="colorNilai" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#1e2841" vertical={false} />
            <XAxis
              dataKey="name"
              tick={{ fill: "#64748b", fontSize: 10 }}
              axisLine={{ stroke: "#1e2841" }}
              tickLine={false}
            />
            <YAxis
              domain={[0, 100]}
              tick={{ fill: "#64748b", fontSize: 10 }}
              axisLine={false}
              tickLine={false}
            />
            <Tooltip
              contentStyle={{ background: "#1e293b", borderColor: "#334155", borderRadius: "12px" }}
              itemStyle={{ color: "#fff", fontSize: "12px" }}
              labelStyle={{ color: "#94a3b8", fontWeight: "bold", fontSize: "11px" }}
            />
            <Area
              type="monotone"
              dataKey="Nilai"
              stroke="#6366f1"
              strokeWidth={2}
              fillOpacity={1}
              fill="url(#colorNilai)"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
