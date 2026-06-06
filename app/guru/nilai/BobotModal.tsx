"use client";

// =============================================================================
// FILE: app/guru/nilai/BobotModal.tsx
// TUJUAN: Modal component untuk konfigurasi bobot penilaian & status aktif Task per Subject.
//         Sepenuhnya dinamis berdasarkan data Task di DB.
// =============================================================================

import { useState, useTransition } from "react";
import { X, Save, Loader2, CheckCircle2, AlertCircle, ToggleLeft, ToggleRight } from "lucide-react";

interface TaskItem {
  id: number;
  nama: string;
  bobot: number;
  isActive: boolean;
  urutan: number;
}

interface SubjectWithWeights {
  id: number;
  namaMapel: string;
  kodeMapel: string;
  tingkat: number;
  tasks: TaskItem[];
}

interface Props {
  subject: SubjectWithWeights;
  onClose: () => void;
  onSaved: (updatedSubject: SubjectWithWeights) => void;
}

export default function BobotModal({ subject, onClose, onSaved }: Props) {
  // Local state for tasks list
  const [tasks, setTasks] = useState<TaskItem[]>(() => [...subject.tasks]);

  const [isPending, startTransition] = useTransition();
  const [status, setStatus] = useState<"idle" | "ok" | "err">("idle");
  const [errMsg, setErrMsg] = useState("");

  // Hitung total bobot dari task yang aktif saja
  const totalBobot = tasks.reduce((sum, t) => {
    return t.isActive ? sum + t.bobot : sum;
  }, 0);

  const isValid = Math.round(totalBobot) === 100;

  function handleToggle(taskId: number) {
    setTasks((prev) =>
      prev.map((t) => {
        if (t.id === taskId) {
          const nextActive = !t.isActive;
          return {
            ...t,
            isActive: nextActive,
            bobot: nextActive ? (t.bobot || 10) : 0,
          };
        }
        return t;
      })
    );
    if (status !== "idle") setStatus("idle");
  }

  function handleWeightChange(taskId: number, value: string) {
    const num = Number(value);
    if (value !== "" && (isNaN(num) || num < 0 || num > 100)) return;
    setTasks((prev) =>
      prev.map((t) => {
        if (t.id === taskId) {
          return {
            ...t,
            bobot: value === "" ? 0 : num,
          };
        }
        return t;
      })
    );
    if (status !== "idle") setStatus("idle");
  }

  function handleSave() {
    if (!isValid) return;
    startTransition(async () => {
      try {
        const payload = {
          subjectId: subject.id,
          tasks: tasks.map((t) => ({
            id: t.id,
            bobot: t.bobot,
            isActive: t.isActive,
          })),
        };

        const res = await fetch("/api/guru/bobot", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });

        const json = await res.json();
        if (!res.ok || !json.ok) {
          throw new Error(json.error ?? "Gagal menyimpan bobot.");
        }

        setStatus("ok");
        // Reconstruct the updated subject structure
        const updatedSubject: SubjectWithWeights = {
          ...subject,
          tasks: json.tasks,
        };
        onSaved(updatedSubject);
        setTimeout(onClose, 800);
      } catch (err: any) {
        setStatus("err");
        setErrMsg(err.message);
      }
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />

      {/* Modal */}
      <div className="relative z-10 w-full max-w-xl bg-slate-900 border border-slate-700/60 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 flex-shrink-0">
          <div>
            <h2 className="text-white font-bold text-base">Konfigurasi Bobot Penilaian</h2>
            <p className="text-slate-400 text-xs mt-0.5">{subject.namaMapel} ({subject.kodeMapel})</p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-500 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        {/* Content */}
        <div className="px-6 py-4 overflow-y-auto space-y-4 flex-1">
          <p className="text-slate-400 text-xs leading-relaxed">
            Aktifkan komponen nilai yang digunakan semester ini dan tentukan persentase bobotnya.
            Rata-rata, raport, dan predikat nilai siswa akan otomatis dihitung ulang.
            <span className="text-indigo-400 font-semibold block mt-1">Total bobot komponen aktif harus tepat 100%.</span>
          </p>

          <div className="space-y-2 border border-slate-800 rounded-xl p-2 bg-slate-950/40">
            {tasks.map((t) => (
              <div
                key={t.id}
                className={`flex items-center justify-between p-3 rounded-xl border transition-all ${
                  t.isActive
                    ? "bg-slate-800/40 border-slate-700/60"
                    : "bg-slate-900/20 border-slate-800/40 opacity-60"
                }`}
              >
                <div className="flex items-start gap-3">
                  <button
                    type="button"
                    onClick={() => handleToggle(t.id)}
                    className="text-slate-400 hover:text-indigo-400 transition-colors mt-0.5 focus:outline-none"
                  >
                    {t.isActive ? (
                      <ToggleRight size={28} className="text-indigo-400" />
                    ) : (
                      <ToggleLeft size={28} className="text-slate-600" />
                    )}
                  </button>
                  <div>
                    <span className="text-slate-200 font-semibold text-sm block">
                      {t.nama}
                    </span>
                    <span className="text-slate-500 text-xs block">
                      Komponen Penilaian {t.nama}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-500 font-medium">Bobot:</span>
                  <div className="relative flex items-center w-20">
                    <input
                      type="number"
                      min={0}
                      max={100}
                      placeholder="0"
                      disabled={!t.isActive}
                      value={t.bobot === 0 ? "" : t.bobot}
                      onChange={(e) => handleWeightChange(t.id, e.target.value)}
                      className={`w-full px-2 py-1.5 bg-slate-950 border rounded-lg text-sm text-center font-semibold tabular-nums focus:outline-none transition-all ${
                        t.isActive
                          ? "border-slate-700 text-white focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/20"
                          : "border-slate-800 text-slate-600 cursor-not-allowed"
                      }`}
                    />
                    <span className="absolute right-2 text-xs text-slate-500">%</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Real-time Indicator & Alerts */}
        <div className="px-6 py-3 border-t border-slate-800 bg-slate-950/20 flex-shrink-0 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-slate-400 text-xs font-semibold">Total Bobot Komponen Aktif:</span>
            <span className={`text-base font-extrabold tabular-nums ${isValid ? "text-emerald-400" : "text-amber-400"}`}>
              {totalBobot}%
            </span>
          </div>

          {/* Status Message */}
          {status === "err" && (
            <div className="flex items-center gap-2 text-rose-400 text-xs bg-rose-500/10 border border-rose-500/20 rounded-xl px-3 py-2">
              <AlertCircle size={13} className="flex-shrink-0" />
              <span>{errMsg}</span>
            </div>
          )}
          {status === "ok" && (
            <div className="flex items-center gap-2 text-emerald-400 text-xs bg-emerald-500/10 border border-emerald-500/20 rounded-xl px-3 py-2">
              <CheckCircle2 size={13} className="flex-shrink-0" />
              <span>Bobot berhasil diperbarui & nilai siswa sedang dihitung ulang!</span>
            </div>
          )}
          {!isValid && status === "idle" && (
            <div className="flex items-center gap-2 text-amber-400 text-xs bg-amber-500/10 border border-amber-500/20 rounded-xl px-3 py-2">
              <AlertCircle size={13} className="flex-shrink-0" />
              <span>Total bobot harus 100% untuk menyimpan. Selisih: {100 - totalBobot}%</span>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-slate-800 bg-slate-900/80 flex-shrink-0">
          <button
            onClick={onClose}
            disabled={isPending}
            className="px-4 py-2 rounded-xl text-sm font-medium text-slate-400 hover:text-white border border-slate-700 hover:border-slate-600 transition-all disabled:opacity-50"
          >
            Batal
          </button>
          <button
            onClick={handleSave}
            disabled={isPending || !isValid || status === "ok"}
            className="px-5 py-2 rounded-xl text-sm font-semibold bg-indigo-600 hover:bg-indigo-500 text-white
              transition-all flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isPending ? (
              <><Loader2 size={14} className="animate-spin" /> Menyimpan...</>
            ) : status === "ok" ? (
              <><CheckCircle2 size={14} /> Tersimpan</>
            ) : (
              <><Save size={14} /> Simpan & Re-kalkulasi</>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
