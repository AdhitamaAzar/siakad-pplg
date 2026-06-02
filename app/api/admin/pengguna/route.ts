// =============================================================================
// FILE: app/api/admin/pengguna/route.ts
// TUJUAN: API Endpoint bagi Admin untuk mengelola akun pengguna (User CRUD).
//         - POST: Membuat pengguna baru (Admin, Guru, Siswa)
//         - PATCH: Mengatur ulang (reset) password pengguna
//         - DELETE: Menghapus akun pengguna dari sistem
// =============================================================================

import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { auth } from "@/lib/auth";
import bcrypt from "bcryptjs";

const BCRYPT_SALT_ROUNDS = 12;

// ─── POST: BUAT USER BARU ─────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user || session.user.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { username, password, roleName, nama, nis, nip } = body;

    if (!username || !password || !roleName) {
      return NextResponse.json({ error: "Username, password, dan role wajib diisi." }, { status: 400 });
    }

    // Cek duplikasi username
    const existingUser = await prisma.user.findUnique({ where: { username } });
    if (existingUser) {
      return NextResponse.json({ error: "Username sudah terdaftar." }, { status: 400 });
    }

    // Cari roleId
    const roleRecord = await prisma.role.findUnique({ where: { name: roleName } });
    if (!roleRecord) {
      return NextResponse.json({ error: `Role '${roleName}' tidak ditemukan.` }, { status: 400 });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, BCRYPT_SALT_ROUNDS);

    // Jalankan dalam Prisma Transaction untuk membuat User + Profil Terkait
    const user = await prisma.$transaction(async (tx) => {
      const u = await tx.user.create({
        data: {
          username,
          password: hashedPassword,
          roleId: roleRecord.id,
        },
      });

      // Jika role Guru, buat data guru
      if (roleName === "guru") {
        if (!nip || !nama) throw new Error("Nama dan NIP wajib diisi untuk Guru.");
        await tx.teacher.create({
          data: {
            userId: u.id,
            nip,
            nama,
            email: `${username}@smk.sch.id`,
          },
        });
      }

      // Jika role Siswa, buat profil siswa (membutuhkan kelas)
      if (roleName === "siswa") {
        if (!nis || !nama || !body.kelasId) {
          throw new Error("Nama, NIS, dan Kelas wajib diisi untuk Siswa.");
        }
        await tx.student.create({
          data: {
            userId: u.id,
            nis,
            nama,
            kelasId: Number(body.kelasId),
          },
        });
      }

      return u;
    });

    return NextResponse.json({ ok: true, user: { id: user.id, username: user.username } });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// ─── PATCH: RESET PASSWORD ────────────────────────────────────────────────────
export async function PATCH(req: NextRequest) {
  const session = await auth();
  if (!session?.user || session.user.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const id = Number(body.id);
    const { password } = body;

    if (!id || !password) {
      return NextResponse.json({ error: "ID pengguna dan password baru wajib diisi." }, { status: 400 });
    }

    const hashedPassword = await bcrypt.hash(password, BCRYPT_SALT_ROUNDS);

    await prisma.user.update({
      where: { id },
      data: { password: hashedPassword },
    });

    return NextResponse.json({ ok: true, message: "Password berhasil diperbarui." });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// ─── DELETE: HAPUS USER ───────────────────────────────────────────────────────
export async function DELETE(req: NextRequest) {
  const session = await auth();
  if (!session?.user || session.user.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");

  if (!id) {
    return NextResponse.json({ error: "ID pengguna wajib diisi." }, { status: 400 });
  }

  try {
    // Karena onDelete: Cascade terkonfigurasi, data profil Guru / Siswa
    // akan terhapus otomatis di database.
    await prisma.user.delete({
      where: { id: Number(id) },
    });

    return NextResponse.json({ ok: true, message: "Akun pengguna berhasil dihapus." });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
