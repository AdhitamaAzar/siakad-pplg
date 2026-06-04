"use client";

// =============================================================================
// FILE: app/guru/nilai/BobotModal.tsx
// TUJUAN: Modal component untuk konfigurasi bobot penilaian & status aktif kolom.
// =============================================================================

import { useState, useTransition } from "react";
import { X, Save, Loader2, CheckCircle2, AlertCircle, ToggleLeft, ToggleRight } from "lucide-react";

interface SubjectWithWeights {
  id: number;
  namaMapel: string;
  kodeMapel: string;
  weightGithub: number;
  weightApi: number;
  weightAdminPanel: number;
  weightLandingPage: number;
  weightKagglePython: number;
  weightKaggleSql: number;
  weightKaggleMl: number;
  weightUjianMl: number;
  weightUjianSql: number;
  activeGithub: boolean;
  activeApi: boolean;
  activeAdminPanel: boolean;
  activeLandingPage: boolean;
  activeKagglePython: boolean;
  activeKaggleSql: boolean;
  activeKaggleMl: boolean;
  activeUjianMl: boolean;
  activeUjianSql: boolean;
}

interface Props {
  subject: SubjectWithWeights;
  isRpl: boolean;
  onClose: () => void;
  onSaved: (updatedSubject: SubjectWithWeights) => void;
}

const getKomponenMetadata = (isRpl: boolean) => [
  { key: "Github" as const,      label: isRpl ? "Github" : "Tugas 1",        desc: isRpl ? "Portfolio / Link GitHub" : "Tugas 1" },
  { key: "Api" as const,         label: isRpl ? "Tugas API" : "Tugas 2",     desc: isRpl ? "Tugas pembuatan API" : "Tugas 2" },
  { key: "AdminPanel" as const,  label: isRpl ? "Admin Panel" : "Tugas 3",   desc: isRpl ? "Tugas Admin Panel" : "Tugas 3" },
  { key: "LandingPage" as const, label: isRpl ? "Landing Page" : "Tugas 4",  desc: isRpl ? "Link Landing Page" : "Tugas 4" },
  { key: "KagglePython" as const,label: isRpl ? "Kaggle Python" : "Tugas 5", desc: isRpl ? "Kaggle Intro to Python" : "Tugas 5" },
  { key: "KaggleSql" as const,   label: isRpl ? "Kaggle SQL" : "Tugas 6",    desc: isRpl ? "Kaggle Intro to SQL" : "Tugas 6" },
  { key: "KaggleMl" as const,    label: isRpl ? "Kaggle ML" : "Tugas 7",     desc: isRpl ? "Kaggle Machine Learning" : "Tugas 7" },
  { key: "UjianMl" as const,     label: isRpl ? "Ujian ML" : "Ujian 1",      desc: isRpl ? "Ujian Online Machine Learning" : "Ujian 1" },
  { key: "UjianSql" as const,    label: isRpl ? "Ujian SQL" : "Ujian 2",     desc: isRpl ? "Ujian Online SQL" : "Ujian 2" },
] as const;

export default function BobotModal({ subject, isRpl, onClose, onSaved }: Props) {
  const metadata = getKomponenMetadata(isRpl);

  // States
  const [form, setForm] = useState(() => {
    const initial: Record<string, any> = {};
    for (const item of metadata) {
      const activeKey = `active${item.key}`;
      const weightKey = `weight${item.key}`;
      initial[activeKey] = subject[activeKey as keyof SubjectWithWeights];
      initial[weightKey] = subject[weightKey as keyof SubjectWithWeights];
    }
    return initial;
  });

  const [isPending, startTransition] = useTransition();
  const [status, setStatus] = useState<"idle" | "ok" | "err">("idle");
  const [errMsg, setErrMsg] = useState("");

  // Hitung total bobot kolom aktif
  const totalBobot = metadata.reduce((sum, item) => {
    const activeKey = `active${item.key}`;
    const weightKey = `weight${item.key}`;
    return form[activeKey] ? sum + (Number(form[weightKey]) || 0) : sum;
  }, 0);

  const isValid = totalBobot === 100;

  function handleToggle(key: string) {
    const activeKey = `active${key}`;
    const weightKey = `weight${key}`;
    setForm((prev) => {
      const nextActive = !prev[activeKey];
      return {
        ...prev,
        [activeKey]: nextActive,
        // Jika dinonaktifkan, set bobot ke 0, jika diaktifkan set default ke 10 atau pertahankan bobot lama
        [weightKey]: nextActive ? (prev[weightKey] || 10) : 0,
      };
    });
    if (status !== "idle") setStatus("idle");
  }

  function handleWeightChange(key: string, value: string) {
    const weightKey = `weight${key}`;
    const num = Number(value);
    if (value !== "" && (isNaN(num) || num < 0 || num > 100)) return;
    setForm((prev) => ({
      ...prev,
      [weightKey]: value === "" ? "" : num,
    }));
    if (status !== "idle") setStatus("idle");
  }

  function handleSave() {
    if (!isValid) return;
    startTransition(async () => {
      try {
        const payload = {
          subjectId: subject.id,
          ...form,
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
        onSaved(json.subject);
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
            Aktifkan kolom nilai yang Anda gunakan semester ini dan tentukan persentase bobotnya. 
            Averages, reports, and grades will automatically recalculate. 
            <span className="text-indigo-400 font-semibold block mt-1">Total bobot kolom aktif harus tepat 100%.</span>
          </p>

          <div className="space-y-2 border border-slate-800 rounded-xl p-2 bg-slate-950/40">
            {metadata.map((item) => {
              const activeKey = `active${item.key}`;
              const weightKey = `weight${item.key}`;
              const isActive = form[activeKey];

              return (
                <div 
                  key={item.key} 
                  className={`flex items-center justify-between p-3 rounded-xl border transition-all ${
                    isActive 
                      ? "bg-slate-800/40 border-slate-700/60" 
                      : "bg-slate-900/20 border-slate-800/40 opacity-60"
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <button
                      type="button"
                      onClick={() => handleToggle(item.key)}
                      className="text-slate-400 hover:text-indigo-400 transition-colors mt-0.5 focus:outline-none"
                    >
                      {isActive ? (
                        <ToggleRight size={28} className="text-indigo-400" />
                      ) : (
                        <ToggleLeft size={28} className="text-slate-600" />
                      )}
                    </button>
                    <div>
                      <span className="text-slate-200 font-semibold text-sm block">
                        {item.label}
                      </span>
                      <span className="text-slate-500 text-xs block">
                        {item.desc}
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
                        disabled={!isActive}
                        value={form[weightKey]}
                        onChange={(e) => handleWeightChange(item.key, e.target.value)}
                        className={`w-full px-2 py-1.5 bg-slate-950 border rounded-lg text-sm text-center font-semibold tabular-nums focus:outline-none transition-all ${
                          isActive
                            ? "border-slate-700 text-white focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/20"
                            : "border-slate-800 text-slate-600 cursor-not-allowed"
                        }`}
                      />
                      <span className="absolute right-2 text-xs text-slate-500">%</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Real-time Indicator & Alerts */}
        <div className="px-6 py-3 border-t border-slate-800 bg-slate-950/20 flex-shrink-0 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-slate-400 text-xs font-semibold">Total Bobot Kolom Aktif:</span>
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
