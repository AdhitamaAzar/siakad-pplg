// =============================================================================
// FILE: lib/auth.ts
// TUJUAN: Konfigurasi NextAuth v5 (Auth.js) untuk sistem autentikasi SIAKAD.
//         Mengimplementasikan Credentials provider dengan database Prisma.
// =============================================================================

import NextAuth, { type Session, type User, CredentialsSignin } from "next-auth";
import type { JWT } from "next-auth/jwt";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { z } from "zod";
import prisma from "@/lib/prisma";
import { authConfig } from "./auth.config";

// ─── VALIDATION SCHEMAS ───────────────────────────────────────────────────────

const loginSchema = z.object({
  username: z
    .string()
    .min(1, "Username tidak boleh kosong")
    .max(50, "Username terlalu panjang")
    .trim(),
  password: z
    .string()
    .min(1, "Password tidak boleh kosong")
    .max(100, "Password terlalu panjang"),
});

// ─── TYPE AUGMENTATION ───────────────────────────────────────────────────────

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      username: string;
      role: string;
      nama: string;
    };
  }

  interface User {
    id: string;
    username: string;
    role: string;
    nama: string;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    username: string;
    role: string;
    nama: string;
  }
}

// ─── HELPER FUNCTIONS ─────────────────────────────────────────────────────────

function getRedirectUrlByRole(role: string): string {
  switch (role) {
    case "admin": return "/admin/dashboard";
    case "guru":  return "/guru/dashboard";
    case "siswa": return "/siswa/dashboard";
    default:      return "/";
  }
}

async function getNamaByRole(
  userId: number,
  role: string,
  username: string
): Promise<string> {
  try {
    if (role === "guru") {
      const teacher = await prisma.teacher.findUnique({
        where: { userId },
        select: { nama: true },
      });
      return teacher?.nama ?? username;
    }

    if (role === "siswa") {
      const student = await prisma.student.findUnique({
        where: { userId },
        select: { nama: true },
      });
      return student?.nama ?? username;
    }

    return username;
  } catch {
    return username;
  }
}

// ─── NEXTAUTH CONFIGURATION ───────────────────────────────────────────────────

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        username: { label: "Username", type: "text" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials): Promise<User | null> {
        const parsed = loginSchema.safeParse(credentials);
        if (!parsed.success) {
          throw new CredentialsSignin("Username dan password harus diisi dengan benar");
        }

        const { username, password } = parsed.data;

        const user = await prisma.user.findUnique({
          where: { username },
          include: { role: true },
        });

        if (!user) {
          throw new CredentialsSignin("Username tidak ditemukan");
        }

        const isPasswordValid = await bcrypt.compare(password, user.password);
        if (!isPasswordValid) {
          throw new CredentialsSignin("Password salah");
        }

        const nama = await getNamaByRole(user.id, user.role.name, username);

        return {
          id: String(user.id),
          username: user.username,
          role: user.role.name,
          nama,
        };
      },
    }),
  ],
});

export async function getSession(): Promise<Session | null> {
  return auth();
}

export { getRedirectUrlByRole };
