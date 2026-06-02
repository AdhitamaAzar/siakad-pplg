// =============================================================================
// FILE: app/admin/import/log/LogClientPage.tsx
// TUJUAN: Client Component untuk menampilkan log import Excel di panel admin.
//         - Tampilkan tabel detail log dengan format premium
//         - Detail dialog/collapse untuk melihat detail log error jika status PARTIAL/FAILED
//         - Counter ringkasan di bagian atas
// =============================================================================

"use client";

import { useState } from "react";
import { FileSpreadsheet, Calendar, User, CheckCircle2, AlertTriangle, XCircle, Info, ChevronDown, ChevronUp } from "lucide-react";

interface Log {
  id:            number;
  namaFile:      String;
  status:        string; // "SUCCESS" | "PARTIAL" | "FAILED"
  totalBerhasil: number;
  totalDiskip:   number;
  totalGagal:    number;
  errorDetails:  string | null;
  createdAt:     string;
  operator:      string;
}

interface LogClientPageProps {
  logs: Log[];
}

function StatusBadge({ status }: { status: string }) {
  const cfg: Record<string, { cls: string, label: string, icon: any }> = {
    SUCCESS: {
      cls: "bg-emerald-500/15 text-emerald-400 border-emerald-500/20",
      label: "Sukses",
      icon: CheckCircle2
    },
    PARTIAL: {
      cls: "bg-amber-500/15 text-amber-400 border-amber-500/20",
      label: "Sebagian",
      icon: AlertTriangle
    },
    FAILED: {
      cls: "bg-rose-500/15 text-rose-400 border-rose-500/20",
      label: "Gagal",
      icon: XCircle
    }
  };
  const item = cfg[status] ?? { cls: "bg-slate-800 text-slate-400 border-slate-700", label: status, icon: Info };
  const Icon = item.icon;
  return (
    <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold border ${item.cls}`}>
      <Icon size={12} />
      {item.label}
    </span>
  );
}

export default function LogClientPage({ logs }: LogClientPageProps) {
  const [expandedLogId, setExpandedLogId] = useState<number | null>(null);

  // Kalkulasi statistik
  const totalImports = logs.length;
  const successCount = logs.filter((l) => l.status === "SUCCESS").length;
  const partialCount = logs.filter((l) => l.status === "PARTIAL").length;
  const failedCount  = logs.filter((l) => l.status === "FAILED").length;

  return (
    <div className="space-y-6 max-w-5xl">
      {/* ── HEADER ────────────────────────────────────────────────────────── */}
      <div className="flex items-center gap-3">
        <FileSpreadsheet size={20} className="text-indigo-400" />
        <div>
          <h1 className="text-xl font-bold text-white">Log Import Data</h1>
          <p className="text-slate-500 text-sm">Riwayat audit aktivitas import data akademik dari Excel.</p>
        </div>
      </div>

      {/* ── STATS ROW ─────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="rounded-2xl border border-slate-800/60 bg-slate-900/60 p-4 text-center">
          <span className="text-2xl font-black text-white">{totalImports}</span>
          <p className="text-[10px] uppercase font-bold text-slate-500 mt-1">Total Import</p>
        </div>
        <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-4 text-center">
          <span className="text-2xl font-black text-emerald-400">{successCount}</span>
          <p className="text-[10px] uppercase font-bold text-emerald-500 mt-1">Sukses Penuh</p>
        </div>
        <div className="rounded-2xl border border-amber-500/20 bg-amber-500/5 p-4 text-center">
          <span className="text-2xl font-black text-amber-400">{partialCount}</span>
          <p className="text-[10px] uppercase font-bold text-amber-500 mt-1">Sukses Sebagian</p>
        </div>
        <div className="rounded-2xl border border-rose-500/20 bg-rose-500/5 p-4 text-center">
          <span className="text-2xl font-black text-rose-400">{failedCount}</span>
          <p className="text-[10px] uppercase font-bold text-rose-500 mt-1">Gagal</p>
        </div>
      </div>

      {/* ── TABEL LOG ─────────────────────────────────────────────────────── */}
      <div className="rounded-2xl border border-slate-800/60 bg-slate-900/60 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-800/60 bg-slate-900/40 text-slate-500">
                <th className="px-4 py-3.5 text-left text-[11px] font-semibold uppercase tracking-wider">Tanggal</th>
                <th className="px-4 py-3.5 text-left text-[11px] font-semibold uppercase tracking-wider">Nama File</th>
                <th className="px-4 py-3.5 text-left text-[11px] font-semibold uppercase tracking-wider">Status</th>
                <th className="px-4 py-3.5 text-center text-[11px] font-semibold uppercase tracking-wider">Berhasil</th>
                <th className="px-4 py-3.5 text-center text-[11px] font-semibold uppercase tracking-wider">Skip/Gagal</th>
                <th className="px-4 py-3.5 text-left text-[11px] font-semibold uppercase tracking-wider">Operator</th>
                <th className="px-4 py-3.5 w-10"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/40 text-slate-300">
              {logs.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-5 py-12 text-center text-sm text-slate-500">
                    Belum ada riwayat aktivitas import.
                  </td>
                </tr>
              ) : (
                logs.map((log) => {
                  const isExpanded = expandedLogId === log.id;
                  const hasErrors = !!log.errorDetails;

                  return (
                    <>
                      <tr key={log.id} className="hover:bg-white/[0.01] transition-colors">
                        <td className="px-4 py-3.5 text-xs text-slate-500 whitespace-nowrap">
                          <span className="flex items-center gap-1.5">
                            <Calendar size={13} />
                            {new Date(log.createdAt).toLocaleString("id-ID", { dateStyle: "short", timeStyle: "short" })}
                          </span>
                        </td>
                        <td className="px-4 py-3.5 font-medium text-slate-200 truncate max-w-[200px]" title={String(log.namaFile)}>
                          {log.namaFile}
                        </td>
                        <td className="px-4 py-3.5 whitespace-nowrap">
                          <StatusBadge status={log.status} />
                        </td>
                        <td className="px-4 py-3.5 text-center font-bold text-emerald-400 tabular-nums">
                          {log.totalBerhasil}
                        </td>
                        <td className="px-4 py-3.5 text-center font-semibold tabular-nums text-slate-400">
                          <span className="text-amber-500">{log.totalDiskip}</span>
                          <span className="text-slate-600"> / </span>
                          <span className="text-rose-500">{log.totalGagal}</span>
                        </td>
                        <td className="px-4 py-3.5 text-xs text-slate-400">
                          <span className="flex items-center gap-1.5">
                            <User size={13} className="text-slate-600" />
                            {log.operator}
                          </span>
                        </td>
                        <td className="px-4 py-3.5 text-center">
                          {hasErrors && (
                            <button
                              onClick={() => setExpandedLogId(isExpanded ? null : log.id)}
                              className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-400 transition-colors"
                              title="Tampilkan detail error"
                            >
                              {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                            </button>
                          )}
                        </td>
                      </tr>
                      {/* Collapse Error Details */}
                      {isExpanded && hasErrors && (
                        <tr className="bg-slate-950/40">
                          <td colSpan={7} className="px-5 py-3">
                            <div className="rounded-lg border border-rose-500/20 bg-rose-500/5 p-4 space-y-2">
                              <p className="text-xs font-bold text-rose-300 flex items-center gap-1">
                                <AlertTriangle size={14} />
                                Laporan Log Error Validasi Excel:
                              </p>
                              <div className="max-h-40 overflow-y-auto text-xs font-mono text-rose-300/80 space-y-1 pl-5 list-disc leading-relaxed">
                                {(() => {
                                  try {
                                    const errs = JSON.parse(log.errorDetails!);
                                    return Array.isArray(errs) ? (
                                      errs.map((e, idx) => <p key={idx}>• {e}</p>)
                                    ) : (
                                      <p>{log.errorDetails}</p>
                                    );
                                  } catch {
                                    return <p>{log.errorDetails}</p>;
                                  }
                                })()}
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
