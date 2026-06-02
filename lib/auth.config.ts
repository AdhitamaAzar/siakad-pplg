// =============================================================================
// FILE: lib/auth.config.ts
// TUJUAN: Edge-compatible configuration for NextAuth v5.
//         Contains settings that do not require server-only Node.js libraries.
// =============================================================================

import type { NextAuthConfig } from "next-auth";

export const authConfig = {
  session: {
    strategy: "jwt",
    maxAge: 8 * 60 * 60, // 8 hours
  },
  pages: {
    signIn: "/login",
    error: "/login",
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.username = user.username;
        token.role = user.role;
        token.nama = user.nama;
      }
      return token;
    },
    async session({ session, token }) {
      if (token) {
        session.user = {
          id: token.id as string,
          username: token.username as string,
          role: token.role as string,
          nama: token.nama as string,
        };
      }
      return session;
    },
    async redirect({ url, baseUrl }) {
      if (url.startsWith("/")) return `${baseUrl}${url}`;
      if (new URL(url).origin === baseUrl) return url;
      return baseUrl;
    },
  },
  providers: [], // Empty array, to be populated in lib/auth.ts
  trustHost: true,
} satisfies NextAuthConfig;
