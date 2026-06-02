// =============================================================================
// FILE: app/api/auth/[...nextauth]/route.ts
// TUJUAN: Route handler NextAuth v5 — menangani semua endpoint autentikasi.
//         - GET/POST /api/auth/signin    → proses login
//         - GET/POST /api/auth/signout   → proses logout
//         - GET      /api/auth/session   → session aktif
//         - GET      /api/auth/csrf      → CSRF token
//         - GET      /api/auth/callback  → OAuth callback (tidak dipakai)
// =============================================================================

import { handlers } from "@/lib/auth";

export const { GET, POST } = handlers;
