// =============================================================================
// FILE: proxy.ts  (dahulu: middleware.ts — diubah karena Next.js 16 convention)
// TUJUAN: Proxy Next.js untuk proteksi route berdasarkan role pengguna.
//         Setiap request diperiksa sebelum diteruskan ke halaman tujuan.
//         Aturan akses:
//         - /admin/**  → hanya role "admin"
//         - /guru/**   → hanya role "guru"
//         - /siswa/**  → hanya role "siswa"
//         - /login     → redirect ke dashboard jika sudah login
//         - /api/auth/**  → selalu diizinkan (NextAuth handlers)
// =============================================================================

import { auth } from "@/lib/auth";
import { NextResponse, type NextRequest } from "next/server";
import type { Session } from "next-auth";

// ─── ROUTE CONFIGURATION ──────────────────────────────────────────────────────

/**
 * Peta aturan akses: role → array path prefix yang diizinkan
 */
const ROLE_ACCESS_MAP: Record<string, string[]> = {
  admin: ["/admin"],
  guru:  ["/guru"],
  siswa: ["/siswa"],
};

/**
 * Route yang selalu bisa diakses tanpa autentikasi
 */
const PUBLIC_ROUTES = ["/login", "/api/auth"];

/**
 * Prefix yang selalu dilewati tanpa pengecekan (assets, NextAuth, dll)
 */
const ALWAYS_ALLOWED_PREFIXES = ["/api/auth", "/_next", "/favicon.ico", "/public"];

// ─── HELPER FUNCTIONS ─────────────────────────────────────────────────────────

/**
 * Memeriksa apakah path termasuk dalam daftar prefix yang diizinkan
 */
function matchesAnyPrefix(path: string, prefixes: string[]): boolean {
  return prefixes.some((prefix) => path.startsWith(prefix));
}

/**
 * Menentukan apakah pengguna berhak mengakses path tertentu berdasarkan role
 */
function isAuthorized(path: string, role: string): boolean {
  const allowedPaths = ROLE_ACCESS_MAP[role];
  if (!allowedPaths) return false;
  return matchesAnyPrefix(path, allowedPaths);
}

/**
 * Menentukan URL dashboard berdasarkan role pengguna
 */
function getDashboardUrl(role: string): string {
  switch (role) {
    case "admin": return "/admin/dashboard";
    case "guru":  return "/guru/dashboard";
    case "siswa": return "/siswa/dashboard";
    default:      return "/login";
  }
}

// ─── PROXY HANDLER ────────────────────────────────────────────────────────────

/**
 * Proxy utama yang dijalankan pada setiap request
 *
 * Alur logika:
 * 1. Lewati route yang selalu diizinkan (/_next, /api/auth, dll)
 * 2. Jika route publik (/login) dan sudah login → redirect ke dashboard
 * 3. Jika / → redirect ke /login
 * 4. Jika route protected dan belum login → redirect ke /login
 * 5. Jika role tidak sesuai dengan route → redirect ke dashboard sendiri
 * 6. Izinkan request
 */
export default auth(function proxy(request: NextRequest & { auth: Session | null }) {
  const { pathname } = request.nextUrl;
  const session = request.auth;

  // ── STEP 1: Lewati route yang selalu diizinkan ──────────────────────────
  if (matchesAnyPrefix(pathname, ALWAYS_ALLOWED_PREFIXES)) {
    return NextResponse.next();
  }

  // ── STEP 2: Handle halaman root / ───────────────────────────────────────
  if (pathname === "/") {
    if (session?.user?.role) {
      return NextResponse.redirect(new URL(getDashboardUrl(session.user.role), request.url));
    }
    return NextResponse.redirect(new URL("/login", request.url));
  }

  // ── STEP 3: Handle halaman login ────────────────────────────────────────
  if (pathname === "/login") {
    if (session?.user?.role) {
      return NextResponse.redirect(new URL(getDashboardUrl(session.user.role), request.url));
    }
    return NextResponse.next();
  }

  // ── STEP 4: Protected routes — cek autentikasi ──────────────────────────
  const isProtectedRoute = matchesAnyPrefix(pathname, ["/admin", "/guru", "/siswa"]);

  if (isProtectedRoute) {
    if (!session?.user) {
      const loginUrl = new URL("/login", request.url);
      loginUrl.searchParams.set("callbackUrl", pathname);
      return NextResponse.redirect(loginUrl);
    }

    // ── STEP 5: Cek otorisasi role ─────────────────────────────────────
    if (!isAuthorized(pathname, session.user.role)) {
      return NextResponse.redirect(
        new URL(getDashboardUrl(session.user.role), request.url)
      );
    }
  }

  // ── STEP 6: Izinkan request ─────────────────────────────────────────────
  return NextResponse.next();
});

// ─── MATCHER CONFIGURATION ────────────────────────────────────────────────────

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
