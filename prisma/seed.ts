// =============================================================================
// FILE: prisma/seed.ts
// TUJUAN: Mengisi database dengan data awal (seed) yang dibutuhkan sistem:
//         - 1 akun admin
//         - 1 akun guru (Fandik Ariyanto, S.ST, NIP 198512012022211025)
//         - 3 kelas (XI PPLG 1, XI PPLG 2, XI PPLG 3)
//         - 5 siswa contoh per kelas (total 15 siswa)
// CARA JALANKAN: npx prisma db seed
// =============================================================================

import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import bcrypt from "bcryptjs";
import * as dotenv from "dotenv";

// Muat environment variables dari .env
dotenv.config();

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL ?? "postgresql://postgres:postgres@localhost:5432/siakad_pplg",
});

const prisma = new PrismaClient({ adapter });

// ─── KONSTANTA ───────────────────────────────────────────────────────────────

const BCRYPT_SALT_ROUNDS = 12;
const SEMESTER = "Genap";
const TAHUN_AJARAN = "2025/2026";

// ─── DATA SEED ───────────────────────────────────────────────────────────────

/** Data kelas yang akan dibuat */
const KELAS_DATA = [
  { namaKelas: "XI PPLG 1", tingkat: 11 },
  { namaKelas: "XI PPLG 2", tingkat: 11 },
  { namaKelas: "XI PPLG 3", tingkat: 11 },
] as const;

/** Data siswa contoh per kelas (5 siswa per kelas) */
const SISWA_DATA: Record<
  string,
  Array<{ nis: string; nama: string; username: string }>
> = {
  "XI PPLG 1": [
    { nis: "14001/1662.063", nama: "Adhitama Putra Pratama", username: "14001" },
    { nis: "14002/1663.063", nama: "Barbie Cristiana Hasibuan", username: "14002" },
    { nis: "14003/1664.063", nama: "Candra Dwi Saputra", username: "14003" },
    { nis: "14004/1665.063", nama: "Dian Ayu Lestari", username: "14004" },
    { nis: "14005/1666.063", nama: "Eko Prasetyo Wibowo", username: "14005" },
  ],
  "XI PPLG 2": [
    { nis: "14028/1689.063", nama: "Fajar Nugroho Santoso", username: "14028" },
    { nis: "14029/1690.063", nama: "Gilang Ramadhan Putra", username: "14029" },
    { nis: "14030/1691.063", nama: "Heni Dwi Rahayu", username: "14030" },
    { nis: "14031/1692.063", nama: "Indra Kusuma Wijaya", username: "14031" },
    { nis: "14032/1693.063", nama: "Joko Susanto Prabowo", username: "14032" },
  ],
  "XI PPLG 3": [
    { nis: "14056/1717.063", nama: "Kartika Sari Dewi", username: "14056" },
    { nis: "14057/1718.063", nama: "Luthfi Hakim Prasetya", username: "14057" },
    { nis: "14058/1719.063", nama: "Maya Putri Anggraini", username: "14058" },
    { nis: "14059/1720.063", nama: "Nanda Rizki Pratama", username: "14059" },
    { nis: "14060/1721.063", nama: "Oktavia Nurul Hidayah", username: "14060" },
  ],
};

// ─── HELPER FUNCTIONS ─────────────────────────────────────────────────────────

/**
 * Membuat hash password menggunakan bcrypt
 * @param password - Password plaintext yang akan di-hash
 * @returns Promise dengan string hash bcrypt
 */
async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, BCRYPT_SALT_ROUNDS);
}

/**
 * Membuat data nilai contoh untuk seorang siswa
 * @param studentId - ID siswa di database
 * @param subjectId - ID mata pelajaran di database
 * @returns Objek data nilai yang siap dimasukkan ke database
 */
function buatNilaiContoh(studentId: number, subjectId: number) {
  // Generate nilai random yang realistis
  const randomNilai = (min: number, max: number): number =>
    Math.floor(Math.random() * (max - min + 1)) + min;

  const komponenNilai = {
    nilaiGithub: randomNilai(65, 100),
    nilaiApi: randomNilai(60, 100),
    nilaiAdminPanel: randomNilai(65, 100),
    nilaiLandingPage: randomNilai(70, 100),
    nilaiKagglePython: randomNilai(60, 100),
    nilaiKaggleSql: randomNilai(55, 100),
    nilaiKaggleMl: randomNilai(50, 100),
    nilaiUjianMl: randomNilai(60, 100),
    nilaiUjianSql: randomNilai(65, 100),
  };

  const nilaiArray = Object.values(komponenNilai);
  const rataRata =
    nilaiArray.reduce((a, b) => a + b, 0) / nilaiArray.length;
  const nilaiRaport = Math.round(rataRata);
  const statusTuntas = nilaiRaport >= 75 ? "TUNTAS" : "BELUM";
  const predikat =
    nilaiRaport >= 90
      ? "Sangat Baik"
      : nilaiRaport >= 75
      ? "Baik"
      : nilaiRaport >= 60
      ? "Cukup"
      : "Perlu Bimbingan";

  return {
    studentId,
    subjectId,
    semester: SEMESTER,
    tahunAjaran: TAHUN_AJARAN,
    ...komponenNilai,
    rataRata: Math.round(rataRata * 100) / 100,
    nilaiHasil: nilaiRaport,
    nilaiRaport,
    predikat,
    statusTuntas,
    jumlahNilaiKosong: 0,
    persentaseMaju: 100,
  };
}

/**
 * Membuat data absensi contoh untuk seorang siswa
 * @param studentId - ID siswa di database
 * @returns Objek data absensi yang siap dimasukkan ke database
 */
function buatAbsensiContoh(studentId: number) {
  const totalPertemuan = 24;
  const totalHadir = Math.floor(Math.random() * 5) + 20; // 20-24 hadir
  const totalTidakHadir = totalPertemuan - totalHadir;
  const persentaseHadir = Math.round((totalHadir / totalPertemuan) * 100 * 10) / 10;

  return {
    studentId,
    semester: SEMESTER,
    tahunAjaran: TAHUN_AJARAN,
    totalHadir,
    totalTidakHadir,
    persentaseHadir,
  };
}

// ─── MAIN SEED FUNCTION ───────────────────────────────────────────────────────

/**
 * Fungsi utama seed database
 * Menjalankan semua operasi dalam urutan yang benar dengan dependency yang tepat
 * @throws Error jika terjadi kegagalan saat seed
 */
async function main(): Promise<void> {
  console.log("🌱 Memulai proses seed database SIAKAD PPLG...\n");

  // ── STEP 1: Buat Role ──────────────────────────────────────────────────────
  console.log("📋 Membuat roles...");
  const [roleAdmin, roleGuru, roleSiswa] = await Promise.all([
    prisma.role.upsert({
      where: { name: "admin" },
      update: {},
      create: { name: "admin" },
    }),
    prisma.role.upsert({
      where: { name: "guru" },
      update: {},
      create: { name: "guru" },
    }),
    prisma.role.upsert({
      where: { name: "siswa" },
      update: {},
      create: { name: "siswa" },
    }),
  ]);
  console.log(`   ✅ Role dibuat: admin(${roleAdmin.id}), guru(${roleGuru.id}), siswa(${roleSiswa.id})`);

  // ── STEP 1b: Buat Mapel Awal ────────────────────────────────────────────────
  console.log("📚 Membuat mata pelajaran...");
  const defaultSubject = await prisma.subject.upsert({
    where: { kodeMapel: "PPLG" },
    update: {},
    create: {
      namaMapel: "Pemrograman Perangkat Lunak dan Gim (PPLG)",
      kodeMapel: "PPLG",
      tingkat: 11,
    },
  });
  console.log(`   ✅ Mapel dibuat: ${defaultSubject.namaMapel} (ID: ${defaultSubject.id})`);

  // ── STEP 2: Buat User Admin ────────────────────────────────────────────────
  console.log("\n👤 Membuat akun admin...");
  const adminPassword = await hashPassword("admin123");
  const userAdmin = await prisma.user.upsert({
    where: { username: "admin" },
    update: {},
    create: {
      username: "admin",
      password: adminPassword,
      roleId: roleAdmin.id,
    },
  });
  console.log(`   ✅ Admin dibuat: username="admin", password="admin123" (GANTI SETELAH PRODUKSI!)`);

  // ── STEP 3: Buat User Guru (Fandik Ariyanto) ──────────────────────────────
  console.log("\n👨‍🏫 Membuat akun guru Fandik Ariyanto, S.ST...");
  const guruPassword = await hashPassword("fandik2025");
  const userGuru = await prisma.user.upsert({
    where: { username: "fandik.ariyanto" },
    update: {},
    create: {
      username: "fandik.ariyanto",
      password: guruPassword,
      roleId: roleGuru.id,
    },
  });

  const teacher = await prisma.teacher.upsert({
    where: { userId: userGuru.id },
    update: {},
    create: {
      userId: userGuru.id,
      nip: "198512012022211025",
      nama: "Fandik Ariyanto, S.ST",
      email: "fandik.ariyanto@smk.sch.id",
    },
  });
  console.log(`   ✅ Guru dibuat: username="fandik.ariyanto", NIP="${teacher.nip}"`);

  // ── STEP 4: Buat 3 Kelas ──────────────────────────────────────────────────
  console.log("\n🏫 Membuat 3 kelas PPLG...");
  const kelasMap: Record<string, number> = {};

  for (const kelasData of KELAS_DATA) {
    const kelas = await prisma.class.upsert({
      where: {
        namaKelas_tahunAjaran: {
          namaKelas: kelasData.namaKelas,
          tahunAjaran: TAHUN_AJARAN,
        },
      },
      update: {},
      create: {
        ...kelasData,
        tahunAjaran: TAHUN_AJARAN,
      },
    });
    kelasMap[kelasData.namaKelas] = kelas.id;
    console.log(`   ✅ Kelas dibuat: "${kelas.namaKelas}" (ID: ${kelas.id})`);
  }

  // ── STEP 4b: Hubungkan Guru Fandik ke Kelas & Mapel ──────────────────────────
  console.log("\n🔗 Menghubungkan Guru Fandik ke Kelas & Mapel...");
  for (const kelasName of Object.keys(kelasMap)) {
    const classId = kelasMap[kelasName];
    await prisma.teacherClassSubject.upsert({
      where: {
        teacherId_kelasId_subjectId: {
          teacherId: teacher.id,
          kelasId: classId,
          subjectId: defaultSubject.id,
        },
      },
      update: {},
      create: {
        teacherId: teacher.id,
        kelasId: classId,
        subjectId: defaultSubject.id,
      },
    });
    console.log(`   ✅ Ditugaskan mengajar: "Fandik Ariyanto" -> "${kelasName}" (Mapel: PPLG)`);
  }

  // ── STEP 5: Buat 15 Siswa Contoh (5 per kelas) ───────────────────────────
  console.log("\n👨‍🎓 Membuat 15 siswa contoh (5 per kelas)...");
  let totalSiswaDbuat = 0;

  for (const [namaKelas, siswaList] of Object.entries(SISWA_DATA)) {
    const kelasId = kelasMap[namaKelas];
    console.log(`\n   Kelas ${namaKelas}:`);

    for (const siswaData of siswaList) {
      // Buat user siswa
      const siswaPassword = await hashPassword(siswaData.nis.split("/")[0]!);
      const userSiswa = await prisma.user.upsert({
        where: { username: siswaData.username },
        update: {},
        create: {
          username: siswaData.username,
          password: siswaPassword,
          roleId: roleSiswa.id,
        },
      });

      // Buat profil siswa
      const student = await prisma.student.upsert({
        where: { nis: siswaData.nis },
        update: {},
        create: {
          userId: userSiswa.id,
          nis: siswaData.nis,
          nama: siswaData.nama,
          kelasId,
        },
      });

      // Buat data nilai contoh
      await prisma.grade.upsert({
        where: {
          studentId_semester_tahunAjaran: {
            studentId: student.id,
            semester: SEMESTER,
            tahunAjaran: TAHUN_AJARAN,
          },
        },
        update: {},
        create: buatNilaiContoh(student.id, defaultSubject.id),
      });

      // Buat data absensi contoh
      await prisma.attendance.upsert({
        where: {
          studentId_semester_tahunAjaran: {
            studentId: student.id,
            semester: SEMESTER,
            tahunAjaran: TAHUN_AJARAN,
          },
        },
        update: {},
        create: buatAbsensiContoh(student.id),
      });

      // Buat laporan contoh
      await prisma.report.upsert({
        where: {
          studentId_semester_tahunAjaran: {
            studentId: student.id,
            semester: SEMESTER,
            tahunAjaran: TAHUN_AJARAN,
          },
        },
        update: {},
        create: {
          studentId: student.id,
          semester: SEMESTER,
          tahunAjaran: TAHUN_AJARAN,
          checklistH: true,
          checklistI: Math.random() > 0.3,
          checklistJ: Math.random() > 0.4,
          checklistK: Math.random() > 0.5,
          skorLaporan: Math.floor(Math.random() * 30) + 70,
        },
      });

      totalSiswaDbuat++;
      console.log(`   ✅ ${siswaData.nama} (NIS: ${siswaData.nis})`);
    }
  }

  // ── STEP 6: Tampilkan Ringkasan ───────────────────────────────────────────
  console.log("\n" + "=".repeat(60));
  console.log("✅ SEED DATABASE BERHASIL!\n");
  console.log("📊 RINGKASAN:");
  console.log(`   - Roles     : 3 (admin, guru, siswa)`);
  console.log(`   - Admin     : 1 (username: admin)`);
  console.log(`   - Guru      : 1 (Fandik Ariyanto, S.ST)`);
  console.log(`   - Kelas     : 3 (XI PPLG 1, 2, 3)`);
  console.log(`   - Siswa     : ${totalSiswaDbuat} (5 per kelas)`);
  console.log("\n⚠️  PENTING: Ganti password default sebelum deploy ke produksi!");
  console.log("   - Admin  : admin/admin123");
  console.log("   - Guru   : fandik.ariyanto/fandik2025");
  console.log("=".repeat(60));
}

// ─── EKSEKUSI ─────────────────────────────────────────────────────────────────

main()
  .catch((error: unknown) => {
    console.error("❌ Seed gagal:", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
