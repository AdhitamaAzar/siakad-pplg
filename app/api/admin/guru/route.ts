// =============================================================================
// FILE: app/api/admin/guru/route.ts
// TUJUAN: API Endpoint bagi Admin untuk memperbarui data Guru.
//         - PUT: Mengupdate data guru (nama, nip, email)
// =============================================================================

import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { auth } from "@/lib/auth";

export async function PUT(req: NextRequest) {
  const session = await auth();
  if (!session?.user || session.user.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { id, nama, nip, email } = body;

    if (!id || !nama || !nip) {
      return NextResponse.json(
        { error: "ID, Nama, dan NIP wajib diisi." },
        { status: 400 }
      );
    }

    const teacherId = Number(id);
    const cleanNip = String(nip).replace(/\s+/g, "").trim();

    // Jalankan operasi dalam Prisma transaction
    const result = await prisma.$transaction(async (tx) => {
      // 1. Cari teacher target
      const teacher = await tx.teacher.findUnique({
        where: { id: teacherId },
      });

      if (!teacher) {
        throw new Error("Data guru tidak ditemukan.");
      }

      // 2. Cek apakah NIP baru sudah dipakai oleh guru lain
      if (cleanNip !== teacher.nip) {
        const duplicateTeacher = await tx.teacher.findUnique({
          where: { nip: cleanNip },
        });
        if (duplicateTeacher) {
          throw new Error(`NIP ${cleanNip} sudah digunakan oleh guru lain.`);
        }
      }

      // 3. Update data Teacher
      const updatedTeacher = await tx.teacher.update({
        where: { id: teacherId },
        data: {
          nama,
          nip: cleanNip,
          email: email || null,
        },
      });

      return updatedTeacher;
    });

    return NextResponse.json({ ok: true, teacher: result });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
