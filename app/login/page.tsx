// =============================================================================
// FILE: app/login/page.tsx
// TUJUAN: Halaman login SIAKAD PPLG.
//         - Form username + password dengan validasi
//         - Autentikasi via NextAuth v5 signIn("credentials")
//         - Role-based redirect setelah login berhasil
//         - Tampil pesan error jika kredensial salah
//         - Design premium dark dengan glassmorphism
// =============================================================================

import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { auth }       from "@/lib/auth";
import LoginForm      from "./LoginForm";

export const metadata: Metadata = {
  title: "Login — SIAKAD PPLG",
  description: "Masuk ke Sistem Informasi Akademik SMK PPLG Semester Genap 2025/2026",
};

/**
 * Halaman login — Server Component.
 * Jika sudah login, redirect langsung ke dashboard role masing-masing.
 */
export default async function LoginPage() {
  // Cek session — jika sudah login, redirect ke dashboard
  const session = await auth();
  if (session?.user?.role) {
    const roleMap: Record<string, string> = {
      admin: "/admin/dashboard",
      guru:  "/guru/dashboard",
      siswa: "/siswa/dashboard",
    };
    redirect(roleMap[session.user.role] ?? "/");
  }

  return (
    <main className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden bg-[#080c14]">

      {/* ── Animated background blobs ─────────────────────────────────── */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {/* Blob kiri atas */}
        <div
          className="absolute -top-32 -left-32 w-96 h-96 rounded-full opacity-20 blur-3xl"
          style={{
            background: "radial-gradient(circle, #6366f1 0%, transparent 70%)",
            animation: "float 8s ease-in-out infinite",
          }}
        />
        {/* Blob kanan bawah */}
        <div
          className="absolute -bottom-32 -right-32 w-96 h-96 rounded-full opacity-15 blur-3xl"
          style={{
            background: "radial-gradient(circle, #4f46e5 0%, transparent 70%)",
            animation: "float 10s ease-in-out infinite reverse",
          }}
        />
        {/* Blob tengah */}
        <div
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[400px] rounded-full opacity-5 blur-3xl"
          style={{ background: "radial-gradient(circle, #818cf8 0%, transparent 60%)" }}
        />

        {/* Grid pattern */}
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage: `
              linear-gradient(rgba(99,102,241,0.5) 1px, transparent 1px),
              linear-gradient(90deg, rgba(99,102,241,0.5) 1px, transparent 1px)
            `,
            backgroundSize: "60px 60px",
          }}
        />
      </div>

      {/* ── Login Card ────────────────────────────────────────────────── */}
      <div className="relative w-full max-w-md">
        {/* Glow ring behind card */}
        <div
          className="absolute -inset-0.5 rounded-3xl opacity-30 blur-lg"
          style={{ background: "linear-gradient(135deg, #6366f1, #4f46e5, #312e81)" }}
        />

        {/* Card */}
        <div
          className="relative rounded-3xl p-8 border border-white/10"
          style={{
            background: "rgba(13, 17, 35, 0.85)",
            backdropFilter: "blur(24px)",
            WebkitBackdropFilter: "blur(24px)",
          }}
        >
          {/* Logo + App Name */}
          <div className="flex flex-col items-center mb-8">
            <div
              className="
                w-16 h-16 rounded-2xl mb-4 flex items-center justify-center
                border border-indigo-500/30
                shadow-lg shadow-indigo-500/20
              "
              style={{
                background: "linear-gradient(135deg, rgba(99,102,241,0.2), rgba(79,70,229,0.3))",
              }}
            >
              {/* Icon buku + kode */}
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none">
                <path
                  d="M12 2L2 7l10 5 10-5-10-5z"
                  fill="#818cf8"
                  opacity="0.8"
                />
                <path
                  d="M2 17l10 5 10-5M2 12l10 5 10-5"
                  stroke="#6366f1"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </div>

            <h1 className="text-2xl font-bold text-white tracking-tight text-center">
              SIAKAD PPLG
            </h1>
            <p className="text-slate-400 text-sm mt-1 text-center">
              Sistem Informasi Akademik
            </p>
            <div
              className="
                mt-3 px-3 py-1 rounded-full text-xs font-medium
                bg-indigo-500/10 text-indigo-300 border border-indigo-500/20
              "
            >
              Semester Genap 2025/2026
            </div>
          </div>

          {/* Form — client component */}
          <LoginForm />

          {/* Footer info */}
          <div className="mt-6 pt-5 border-t border-white/5 text-center space-y-1">
            <p className="text-xs text-slate-600">
              SMK Pengembangan Perangkat Lunak dan Gim
            </p>
            <p className="text-xs text-slate-700">
              Guru: Fandik Ariyanto, S.ST
            </p>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes float {
          0%, 100% { transform: translateY(0px) scale(1); }
          50% { transform: translateY(-20px) scale(1.05); }
        }
      `}</style>
    </main>
  );
}
