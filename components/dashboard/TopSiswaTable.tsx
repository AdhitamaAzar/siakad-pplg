// =============================================================================
// FILE: components/dashboard/TopSiswaTable.tsx
// TUJUAN: Tabel Top 10 siswa berdasarkan nilaiRaport.
//         Menampilkan ranking, nama, NIS, kelas, nilai, predikat,
//         status tuntas, dan persentase kehadiran.
//         Server Component — tidak ada interaktivitas, murni display.
// =============================================================================

import { Trophy, Medal, Award } from "lucide-react";
import type { TopSiswaRow } from "@/lib/queries/dashboard";

// ─── TYPE DEFINITIONS ─────────────────────────────────────────────────────────

interface TopSiswaTableProps {
  /** Data top 10 siswa dari server query */
  data: TopSiswaRow[];
}

// ─── HELPER COMPONENTS ────────────────────────────────────────────────────────

/** Icon ranking untuk top 3 */
function RankIcon({ rank }: { rank: number }) {
  if (rank === 1)
    return <Trophy size={16} className="text-amber-400" />;
  if (rank === 2)
    return <Medal size={16} className="text-slate-300" />;
  if (rank === 3)
    return <Award size={16} className="text-amber-600" />;
  return (
    <span className="text-slate-500 font-mono text-sm font-semibold">
      {rank}
    </span>
  );
}

/** Badge predikat nilai */
function PredikatBadge({ predikat }: { predikat: string }) {
  const config: Record<string, string> = {
    "Sangat Baik":    "bg-emerald-500/15 text-emerald-300 border-emerald-500/30",
    "Baik":           "bg-indigo-500/15 text-indigo-300 border-indigo-500/30",
    "Cukup":          "bg-amber-500/15 text-amber-300 border-amber-500/30",
    "Perlu Bimbingan":"bg-rose-500/15 text-rose-300 border-rose-500/30",
  };
  const cls = config[predikat] ?? "bg-slate-500/15 text-slate-300 border-slate-500/30";
  return (
    <span className={`
      inline-flex items-center px-2 py-0.5 rounded-full
      text-[10px] font-semibold border ${cls}
      whitespace-nowrap
    `}>
      {predikat}
    </span>
  );
}

/** Badge status tuntas */
function TuntasBadge({ status }: { status: string }) {
  const isTuntas = status === "TUNTAS";
  return (
    <span className={`
      inline-flex items-center gap-1 px-2 py-0.5 rounded-full
      text-[10px] font-semibold
      ${isTuntas
        ? "bg-emerald-500/15 text-emerald-300"
        : "bg-rose-500/15 text-rose-300"
      }
    `}>
      <span className={`w-1.5 h-1.5 rounded-full ${isTuntas ? "bg-emerald-400" : "bg-rose-400"}`} />
      {isTuntas ? "Tuntas" : "Belum"}
    </span>
  );
}

/** Progress bar sederhana untuk nilai raport */
function NilaiBar({ nilai }: { nilai: number }) {
  const color =
    nilai >= 90 ? "#10b981" :
    nilai >= 75 ? "#6366f1" :
    nilai >= 60 ? "#f59e0b" : "#ef4444";

  return (
    <div className="flex items-center gap-2">
      <span className="text-sm font-bold text-white tabular-nums w-8">
        {nilai}
      </span>
      <div className="flex-1 h-1.5 bg-slate-800 rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{ width: `${nilai}%`, background: color }}
        />
      </div>
    </div>
  );
}

// ─── KELAS COLOR DOT ──────────────────────────────────────────────────────────

const KELAS_DOT: Record<string, string> = {
  "XI PPLG 1": "bg-indigo-400",
  "XI PPLG 2": "bg-emerald-400",
  "XI PPLG 3": "bg-amber-400",
};

// ─── MAIN TABLE ───────────────────────────────────────────────────────────────

/**
 * Tabel Top 10 siswa berprestasi berdasarkan nilai raport.
 * Menampilkan medal untuk peringkat 1-3, progress bar nilai,
 * badge predikat dan status ketuntasan.
 *
 * @param data - Array top siswa dari server
 */
export default function TopSiswaTable({ data }: TopSiswaTableProps) {
  if (data.length === 0) {
    return (
      <div className="rounded-2xl border border-slate-800/60 bg-slate-900/60 p-8 text-center">
        <p className="text-slate-500 text-sm">
          Belum ada data nilai. Import file Excel terlebih dahulu.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-slate-800/60 bg-slate-900/60 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800/60">
        <div>
          <h3 className="text-base font-bold text-white">
            Top 10 Siswa Berprestasi
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Berdasarkan nilai raport tertinggi — Semester Genap 2025/2026
          </p>
        </div>
        <div className="flex items-center gap-1.5 text-xs text-amber-400">
          <Trophy size={14} />
          <span className="font-semibold">Peringkat Nilai</span>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-800/60">
              {["#", "Nama Siswa", "Kelas", "Nilai Raport", "Predikat", "Status", "Kehadiran"].map(
                (h) => (
                  <th
                    key={h}
                    className="
                      px-4 py-3 text-left
                      text-[11px] font-semibold uppercase tracking-wider
                      text-slate-500
                    "
                  >
                    {h}
                  </th>
                )
              )}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/40">
            {data.map((siswa, i) => (
              <tr
                key={siswa.id}
                className={`
                  transition-colors duration-150
                  hover:bg-white/[0.02]
                  ${i < 3 ? "bg-white/[0.01]" : ""}
                `}
              >
                {/* Rank */}
                <td className="px-4 py-3.5 w-12">
                  <div className="flex items-center justify-center w-7 h-7">
                    <RankIcon rank={siswa.rank} />
                  </div>
                </td>

                {/* Nama + NIS */}
                <td className="px-4 py-3.5">
                  <div>
                    <p className={`
                      font-semibold leading-tight
                      ${i < 3 ? "text-white" : "text-slate-200"}
                    `}>
                      {siswa.nama}
                    </p>
                    <p className="text-xs text-slate-500 mt-0.5 font-mono">
                      {siswa.nis}
                    </p>
                  </div>
                </td>

                {/* Kelas */}
                <td className="px-4 py-3.5">
                  <div className="flex items-center gap-1.5">
                    <span
                      className={`
                        w-2 h-2 rounded-full shrink-0
                        ${KELAS_DOT[siswa.namaKelas] ?? "bg-slate-500"}
                      `}
                    />
                    <span className="text-slate-300 text-xs whitespace-nowrap">
                      {siswa.namaKelas}
                    </span>
                  </div>
                </td>

                {/* Nilai Raport */}
                <td className="px-4 py-3.5 min-w-[140px]">
                  <NilaiBar nilai={siswa.nilaiRaport} />
                </td>

                {/* Predikat */}
                <td className="px-4 py-3.5">
                  <PredikatBadge predikat={siswa.predikat} />
                </td>

                {/* Status */}
                <td className="px-4 py-3.5">
                  <TuntasBadge status={siswa.statusTuntas} />
                </td>

                {/* Kehadiran */}
                <td className="px-4 py-3.5">
                  {siswa.persentaseHadir !== null ? (
                    <span className={`
                      text-xs font-semibold tabular-nums
                      ${siswa.persentaseHadir >= 80
                        ? "text-emerald-400"
                        : "text-rose-400"
                      }
                    `}>
                      {siswa.persentaseHadir}%
                    </span>
                  ) : (
                    <span className="text-slate-600 text-xs">—</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Footer */}
      <div className="px-5 py-3 border-t border-slate-800/60 flex items-center justify-between">
        <p className="text-xs text-slate-600">
          Menampilkan {data.length} dari total siswa
        </p>
        <div className="flex items-center gap-3 text-[10px] text-slate-600">
          {Object.entries(KELAS_DOT).map(([kelas, dot]) => (
            <div key={kelas} className="flex items-center gap-1">
              <span className={`w-2 h-2 rounded-full ${dot}`} />
              {kelas}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
