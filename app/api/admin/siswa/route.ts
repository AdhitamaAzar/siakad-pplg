// =============================================================================
// FILE: app/api/admin/siswa/route.ts
// TUJUAN: API Endpoint bagi Admin untuk memperbarui data Siswa.
//         - PUT: Mengupdate data siswa (nama, nis, kelas, tempatLahir, dll)
//                Serta sinkronisasi username/password default pada User model jika NIS berubah.
// =============================================================================

import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { auth } from "@/lib/auth";
import bcrypt from "bcryptjs";

export async function PUT(req: NextRequest) {
  const session = await auth();
  if (!session?.user || session.user.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const {
      id,
      nama,
      nis,
      kelasId,
      tempatLahir,
      tanggalLahir,
      jenisKelamin,
      alamat,
      noHp,
      namaWali,
    } = body;

    if (!id || !nama || !nis || !kelasId) {
      return NextResponse.json(
        { error: "ID, Nama, NIS, dan Kelas wajib diisi." },
        { status: 400 }
      );
    }

    const studentId = Number(id);
    const targetKelasId = Number(kelasId);
    const cleanNis = String(nis).replace(/\s+/g, "").trim();

    // Jalankan operasi dalam Prisma transaction
    const result = await prisma.$transaction(async (tx) => {
      // 1. Cari student target
      const student = await tx.student.findUnique({
        where: { id: studentId },
        include: { user: true },
      });

      if (!student) {
        throw new Error("Data siswa tidak ditemukan.");
      }

      // 2. Cek apakah NIS baru sudah dipakai oleh siswa lain
      if (cleanNis !== student.nis) {
        const duplicateStudent = await tx.student.findUnique({
          where: { nis: cleanNis },
        });
        if (duplicateStudent) {
          throw new Error(`NIS ${cleanNis} sudah digunakan oleh siswa lain.`);
        }

        // Cek duplicate username di model User
        const duplicateUser = await tx.user.findUnique({
          where: { username: cleanNis },
        });
        if (duplicateUser && duplicateUser.id !== student.userId) {
          throw new Error(`Username ${cleanNis} sudah digunakan oleh akun lain.`);
        }
      }

      // 3. Update User credentials jika NIS berubah
      if (cleanNis !== student.nis) {
        const isDefaultPassword = await bcrypt.compare(student.nis, student.user.password);
        const userUpdateData: any = { username: cleanNis };
        
        if (isDefaultPassword) {
          userUpdateData.password = await bcrypt.hash(cleanNis, 12);
        }

        await tx.user.update({
          where: { id: student.userId },
          data: userUpdateData,
        });
      }

      // 4. Update data Student
      const updatedStudent = await tx.student.update({
        where: { id: studentId },
        data: {
          nama,
          nis: cleanNis,
          kelasId: targetKelasId,
          tempatLahir: tempatLahir || null,
          tanggalLahir: tanggalLahir || null,
          jenisKelamin: jenisKelamin || null,
          alamat: alamat || null,
          noHp: noHp || null,
          namaWali: namaWali || null,
        },
        include: {
          kelas: true,
        },
      });

      return updatedStudent;
    });

    return NextResponse.json({ ok: true, student: result });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
