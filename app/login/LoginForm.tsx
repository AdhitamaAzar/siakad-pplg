// =============================================================================
// FILE: app/login/LoginForm.tsx
// TUJUAN: Form login Client Component.
//         Menangani state, validasi sisi client, dan memanggil NextAuth signIn.
//         Menampilkan error message dan loading state.
// =============================================================================

"use client";

import { useState, useTransition } from "react";
import { signIn }                  from "next-auth/react";
import { useRouter }               from "next/navigation";
import { Eye, EyeOff, LogIn, Loader2, AlertCircle, User, Lock } from "lucide-react";

// ─── TYPE ─────────────────────────────────────────────────────────────────────

interface FormState {
  username: string;
  password: string;
  showPassword: boolean;
  error: string;
}

// ─── DEMO CREDENTIALS (visible hints — sistem internal, bukan produksi publik) ─

const DEMO_HINTS = [
  { role: "Admin",   username: "admin",           color: "text-rose-400",   dot: "bg-rose-400" },
  { role: "Guru",    username: "fandik.ariyanto",  color: "text-indigo-400", dot: "bg-indigo-400" },
  { role: "Siswa",   username: "NIS siswa",         color: "text-emerald-400",dot: "bg-emerald-400" },
];

// ─── MAIN COMPONENT ───────────────────────────────────────────────────────────

/**
 * Form login interaktif dengan:
 * - Controlled inputs (username + password)
 * - Toggle show/hide password
 * - Error message dari NextAuth
 * - Loading state saat submit
 * - Role-based redirect
 */
export default function LoginForm() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [form, setForm] = useState<FormState>({
    username:     "",
    password:     "",
    showPassword: false,
    error:        "",
  });

  // ── Handlers ────────────────────────────────────────────────────────────

  function handleChange(field: keyof Pick<FormState, "username" | "password">) {
    return (e: React.ChangeEvent<HTMLInputElement>) =>
      setForm((prev) => ({ ...prev, [field]: e.target.value, error: "" }));
  }

  function togglePassword() {
    setForm((prev) => ({ ...prev, showPassword: !prev.showPassword }));
  }

  /**
   * Submit handler: panggil NextAuth signIn lalu redirect manual
   * berdasarkan role dari session.
   */
  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    if (!form.username.trim() || !form.password) {
      setForm((prev) => ({ ...prev, error: "Username dan password wajib diisi." }));
      return;
    }

    startTransition(async () => {
      const result = await signIn("credentials", {
        username: form.username.trim(),
        password: form.password,
        redirect: false,
      });

      if (result?.error) {
        // Pesan error yang user-friendly
        const msg =
          result.error === "CredentialsSignin"
            ? "Username atau password salah. Silakan coba lagi."
            : result.error;
        setForm((prev) => ({ ...prev, error: msg }));
        return;
      }

      // Login berhasil — refresh agar server components re-render dengan session
      router.refresh();
      router.push("/");
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4" noValidate>

      {/* ── Error Alert ─────────────────────────────────────────────── */}
      {form.error && (
        <div className="
          flex items-start gap-2.5 px-4 py-3 rounded-xl
          bg-rose-500/10 border border-rose-500/30
          text-rose-300 text-sm
          animate-[slideDown_0.2s_ease-out]
        ">
          <AlertCircle size={16} className="mt-0.5 shrink-0 text-rose-400" />
          <p>{form.error}</p>
        </div>
      )}

      {/* ── Username Field ──────────────────────────────────────────── */}
      <div className="space-y-1.5">
        <label
          htmlFor="login-username"
          className="text-xs font-semibold text-slate-400 uppercase tracking-wider"
        >
          Username
        </label>
        <div className="relative group">
          <User
            size={15}
            className="
              absolute left-3.5 top-1/2 -translate-y-1/2
              text-slate-600 group-focus-within:text-indigo-400
              transition-colors duration-200
            "
          />
          <input
            id="login-username"
            type="text"
            value={form.username}
            onChange={handleChange("username")}
            placeholder="Masukkan username..."
            autoComplete="username"
            autoFocus
            disabled={isPending}
            className="
              w-full pl-10 pr-4 py-3 rounded-xl
              bg-slate-800/60 border border-slate-700/60
              text-white placeholder-slate-600 text-sm
              focus:outline-none focus:border-indigo-500/60 focus:bg-slate-800/80
              focus:ring-2 focus:ring-indigo-500/20
              disabled:opacity-50 disabled:cursor-not-allowed
              transition-all duration-200
            "
          />
        </div>
      </div>

      {/* ── Password Field ──────────────────────────────────────────── */}
      <div className="space-y-1.5">
        <label
          htmlFor="login-password"
          className="text-xs font-semibold text-slate-400 uppercase tracking-wider"
        >
          Password
        </label>
        <div className="relative group">
          <Lock
            size={15}
            className="
              absolute left-3.5 top-1/2 -translate-y-1/2
              text-slate-600 group-focus-within:text-indigo-400
              transition-colors duration-200
            "
          />
          <input
            id="login-password"
            type={form.showPassword ? "text" : "password"}
            value={form.password}
            onChange={handleChange("password")}
            placeholder="Masukkan password..."
            autoComplete="current-password"
            disabled={isPending}
            className="
              w-full pl-10 pr-12 py-3 rounded-xl
              bg-slate-800/60 border border-slate-700/60
              text-white placeholder-slate-600 text-sm
              focus:outline-none focus:border-indigo-500/60 focus:bg-slate-800/80
              focus:ring-2 focus:ring-indigo-500/20
              disabled:opacity-50 disabled:cursor-not-allowed
              transition-all duration-200
            "
          />
          <button
            type="button"
            onClick={togglePassword}
            disabled={isPending}
            className="
              absolute right-3.5 top-1/2 -translate-y-1/2
              text-slate-600 hover:text-slate-300
              transition-colors duration-200
              disabled:opacity-50
            "
            aria-label={form.showPassword ? "Sembunyikan password" : "Tampilkan password"}
          >
            {form.showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
          </button>
        </div>
      </div>

      {/* ── Submit Button ────────────────────────────────────────────── */}
      <button
        id="login-submit-btn"
        type="submit"
        disabled={isPending}
        className="
          w-full py-3 px-6 rounded-xl font-semibold text-sm
          flex items-center justify-center gap-2
          transition-all duration-200
          disabled:opacity-60 disabled:cursor-not-allowed
          active:scale-[0.98]
        "
        style={{
          background: isPending
            ? "rgba(99,102,241,0.4)"
            : "linear-gradient(135deg, #6366f1, #4f46e5)",
          boxShadow: isPending ? "none" : "0 4px 24px rgba(99,102,241,0.35)",
          color: "white",
        }}
      >
        {isPending ? (
          <>
            <Loader2 size={16} className="animate-spin" />
            Memverifikasi...
          </>
        ) : (
          <>
            <LogIn size={16} />
            Masuk ke SIAKAD
          </>
        )}
      </button>

      {/* ── Role hints ──────────────────────────────────────────────── */}
      <div className="pt-2">
        <p className="text-[10px] text-slate-700 text-center mb-2 uppercase tracking-wider">
          Akun tersedia
        </p>
        <div className="flex items-center justify-center gap-4">
          {DEMO_HINTS.map((h) => (
            <div key={h.role} className="flex items-center gap-1.5">
              <span className={`w-1.5 h-1.5 rounded-full ${h.dot}`} />
              <span className={`text-[11px] font-medium ${h.color}`}>{h.role}</span>
            </div>
          ))}
        </div>
      </div>

    </form>
  );
}
