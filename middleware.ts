// =============================================================================
// FILE: middleware.ts
// TUJUAN: Middleware Next.js untuk proteksi route berbasis role.
//         Berjalan di edge runtime sebelum setiap request.
// =============================================================================

import NextAuth from "next-auth";
import { authConfig } from "@/lib/auth.config";
import { NextResponse } from "next/server";

const PROTECTED_ROUTES = [
  { pattern: /^\/admin(\/.*)?$/, roles: ["admin"] },
  { pattern: /^\/guru(\/.*)?$/,  roles: ["guru"]  },
  { pattern: /^\/siswa(\/.*)?$/, roles: ["siswa"] },
];

function getDashboardUrl(role: string, baseUrl: string): string {
  switch (role) {
    case "admin": return `${baseUrl}/admin/dashboard`;
    case "guru":  return `${baseUrl}/guru/dashboard`;
    case "siswa": return `${baseUrl}/siswa/dashboard`;
    default:      return `${baseUrl}/login`;
  }
}

const { auth } = NextAuth(authConfig);

export default auth(function middleware(req) {
  const { pathname } = req.nextUrl;
  const session = req.auth;
  const isLoggedIn = !!session?.user;
  const role = (session?.user as any)?.role ?? "";
  const baseUrl = req.nextUrl.origin;

  // 1. Allow internal routes & static files
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon.ico") ||
    pathname.startsWith("/api/auth")
  ) {
    return NextResponse.next();
  }

  // 2. Login Page routing
  if (pathname === "/login") {
    if (isLoggedIn) {
      return NextResponse.redirect(getDashboardUrl(role, baseUrl));
    }
    return NextResponse.next();
  }

  // 3. Root Path routing
  if (pathname === "/") {
    if (!isLoggedIn) return NextResponse.redirect(`${baseUrl}/login`);
    return NextResponse.redirect(getDashboardUrl(role, baseUrl));
  }

  // 4. Protect paths based on user roles
  for (const { pattern, roles } of PROTECTED_ROUTES) {
    if (pattern.test(pathname)) {
      if (!isLoggedIn) {
        const url = new URL("/login", baseUrl);
        url.searchParams.set("callbackUrl", pathname);
        return NextResponse.redirect(url);
      }
      if (!roles.includes(role)) {
        return NextResponse.redirect(getDashboardUrl(role, baseUrl));
      }
      return NextResponse.next();
    }
  }

  // 5. Protect API import endpoint
  if (pathname.startsWith("/api/import")) {
    if (!isLoggedIn || !["guru", "admin"].includes(role)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.next();
  }

  return NextResponse.next();
});

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml).*)",
  ],
};
