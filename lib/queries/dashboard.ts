// =============================================================================
// FILE: lib/queries/dashboard.ts
// TUJUAN: Semua Prisma query untuk halaman dashboard admin.
//         Dipisah ke file sendiri agar page.tsx tetap bersih.
//         Semua query menggunakan filter semester & tahun ajaran aktif.
// =============================================================================

import prisma from "@/lib/prisma";

// ─── CONSTANTS ────────────────────────────────────────────────────────────────

const SEMESTER     = "Genap";
const TAHUN_AJARAN = "2025/2026";

// ─── TYPE DEFINITIONS ─────────────────────────────────────────────────────────

/** Statistik summary satu kelas */
export interface KelasStats {
  id:              number;
  namaKelas:       string;
  totalSiswa:      number;
  rataRataNilai:   number;
  persentaseTuntas: number;
  persentaseHadir: number;
}

/** Data untuk grafik bar chart per kelas */
export interface GrafikKelasData {
  kelas:            string;
  rataRata:         number;
  tuntas:           number;
  belum:            number;
  persentaseHadir:  number;
}

/** Data satu siswa untuk tabel top 10 / bottom 10 */
export interface TopSiswaRow {
  rank:           number;
  id:             number;
  nama:           string;
  nis:            string;
  namaKelas:      string;
  nilaiRaport:    number;
  predikat:       string;
  statusTuntas:   string;
  persentaseHadir: number | null;
}

/** Statistik per Mata Pelajaran */
export interface SubjectStats {
  id:              number | null;
  namaMapel:       string;
  kodeMapel:       string;
  rataRataNilai:   number;
  totalSiswa:      number;
  persentaseTuntas: number;
}

/** Distribusi Nilai Siswa */
export interface GradeDistribution {
  name:  string; // "Sangat Baik", "Baik", "Cukup", "Perlu Bimbingan"
  value: number;
  color: string;
}

/** Seluruh data yang dibutuhkan dashboard admin */
export interface AdminDashboardData {
  totalSiswa:     number;
  totalKelas:     number;
  totalGuru:      number;
  totalMapel:     number;
  totalBelumTuntas: number;
  rataRataGlobal: number;
  persenTuntas:   number;
  kelasStats:     KelasStats[];
  grafikData:     GrafikKelasData[];
  topSiswa:       TopSiswaRow[];
  bottomSiswa:    TopSiswaRow[];
  mapelStats:     SubjectStats[];
  distribusiNilai: GradeDistribution[];
  lastUpdated:    Date;
}

// ─── QUERY FUNCTIONS ──────────────────────────────────────────────────────────

/**
 * Mengambil semua data yang dibutuhkan dashboard admin dalam satu batch query.
 * Menggunakan Promise.all untuk paralelisme optimal.
 *
 * @returns AdminDashboardData lengkap siap ditampilkan
 */
export async function getAdminDashboardData(): Promise<AdminDashboardData> {
  // Jalankan semua query secara paralel
  const [kelas, topGrades, bottomGrades, allGrades, allAttendances, totalGuru, totalMapel] = await Promise.all([
    // Query 1: Semua kelas + jumlah siswa
    prisma.class.findMany({
      where:   { tahunAjaran: TAHUN_AJARAN },
      include: { students: { select: { id: true } } },
      orderBy: { namaKelas: "asc" },
    }),

    // Query 2: Top 10 siswa berdasarkan nilaiRaport
    prisma.grade.findMany({
      where: {
        semester:    SEMESTER,
        tahunAjaran: TAHUN_AJARAN,
        nilaiRaport: { not: null },
      },
      orderBy: { nilaiRaport: "desc" },
      take: 10,
      include: {
        student: {
          select: {
            id:   true,
            nama: true,
            nis:  true,
            kelas: { select: { namaKelas: true } },
          },
        },
      },
    }),

    // Query 2b: Bottom 10 siswa berdasarkan nilaiRaport
    prisma.grade.findMany({
      where: {
        semester:    SEMESTER,
        tahunAjaran: TAHUN_AJARAN,
        nilaiRaport: { not: null },
      },
      orderBy: { nilaiRaport: "asc" },
      take: 10,
      include: {
        student: {
          select: {
            id:   true,
            nama: true,
            nis:  true,
            kelas: { select: { namaKelas: true } },
          },
        },
      },
    }),

    // Query 3: Semua nilai untuk kalkulasi statistik per kelas & mapel
    prisma.grade.findMany({
      where: {
        semester:    SEMESTER,
        tahunAjaran: TAHUN_AJARAN,
        nilaiRaport: { not: null },
      },
      select: {
        nilaiRaport:  true,
        statusTuntas: true,
        subjectId:    true,
        subject: {
          select: {
            id: true,
            namaMapel: true,
            kodeMapel: true,
          }
        },
        student: { select: { kelasId: true } },
      },
    }),

    // Query 4: Semua absensi untuk rata-rata kehadiran
    prisma.attendance.findMany({
      where: {
        semester:    SEMESTER,
        tahunAjaran: TAHUN_AJARAN,
      },
      select: {
        studentId:       true,
        persentaseHadir: true,
        student: { select: { kelasId: true } },
      },
    }),

    // Query 5: Hitung total guru
    prisma.teacher.count(),

    // Query 6: Hitung total mata pelajaran
    prisma.subject.count(),
  ]);

  // ── Build kelasStats ──────────────────────────────────────────────────────
  const kelasStats: KelasStats[] = kelas.map((k) => {
    const kelasGrades = allGrades.filter(
      (g) => g.student.kelasId === k.id
    );
    const kelasAttendances = allAttendances.filter(
      (a) => a.student.kelasId === k.id
    );

    const totalSiswa = k.students.length;

    const rataRataNilai =
      kelasGrades.length > 0
        ? kelasGrades.reduce((sum, g) => sum + (g.nilaiRaport ?? 0), 0) /
          kelasGrades.length
        : 0;

    const tuntasCount = kelasGrades.filter(
      (g) => g.statusTuntas === "TUNTAS"
    ).length;

    const persentaseTuntas =
      kelasGrades.length > 0 ? (tuntasCount / kelasGrades.length) * 100 : 0;

    const persentaseHadir =
      kelasAttendances.length > 0
        ? kelasAttendances.reduce((sum, a) => sum + a.persentaseHadir, 0) /
          kelasAttendances.length
        : 0;

    return {
      id:              k.id,
      namaKelas:       k.namaKelas,
      totalSiswa,
      rataRataNilai:   Math.round(rataRataNilai * 10) / 10,
      persentaseTuntas: Math.round(persentaseTuntas * 10) / 10,
      persentaseHadir: Math.round(persentaseHadir * 10) / 10,
    };
  });

  // ── Build grafikData ──────────────────────────────────────────────────────
  const grafikData: GrafikKelasData[] = kelasStats.map((k) => {
    const grades = allGrades.filter((g) => g.student.kelasId === k.id);
    const tuntas = grades.filter((g) => g.statusTuntas === "TUNTAS").length;
    const belum  = grades.length - tuntas;
    return {
      kelas:           k.namaKelas.replace("XI PPLG ", "PPLG "),
      rataRata:        k.rataRataNilai,
      tuntas,
      belum,
      persentaseHadir: k.persentaseHadir,
    };
  });

  // ── Build topSiswa ────────────────────────────────────────────────────────
  const topSiswa: TopSiswaRow[] = topGrades.map((g, index) => {
    const absensi = allAttendances.find((a) => a.studentId === g.studentId);
    return {
      rank:            index + 1,
      id:              g.student.id,
      nama:            g.student.nama,
      nis:             g.student.nis,
      namaKelas:       g.student.kelas?.namaKelas ?? "-",
      nilaiRaport:     g.nilaiRaport ?? 0,
      predikat:        g.predikat ?? "-",
      statusTuntas:    g.statusTuntas ?? "BELUM",
      persentaseHadir: absensi?.persentaseHadir ?? null,
    };
  });

  // ── Build bottomSiswa ─────────────────────────────────────────────────────
  const bottomSiswa: TopSiswaRow[] = bottomGrades.map((g, index) => {
    const absensi = allAttendances.find((a) => a.studentId === g.studentId);
    return {
      rank:            index + 1,
      id:              g.student.id,
      nama:            g.student.nama,
      nis:             g.student.nis,
      namaKelas:       g.student.kelas?.namaKelas ?? "-",
      nilaiRaport:     g.nilaiRaport ?? 0,
      predikat:        g.predikat ?? "-",
      statusTuntas:    g.statusTuntas ?? "BELUM",
      persentaseHadir: absensi?.persentaseHadir ?? null,
    };
  });

  // ── Build mapelStats ──────────────────────────────────────────────────────
  // Kelompokkan allGrades berdasarkan mata pelajaran
  const mapelMap = new Map<number | string, {
    nama: string;
    kode: string;
    sum: number;
    count: number;
    tuntas: number;
  }>();

  allGrades.forEach((g) => {
    const mapelId = g.subjectId ?? "IMPORT";
    const nama = g.subject?.namaMapel ?? "Rekayasa Perangkat Lunak";
    const kode = g.subject?.kodeMapel ?? "PPLG-IMPORT";
    const val = g.nilaiRaport ?? 0;
    const isTuntas = g.statusTuntas === "TUNTAS";

    const curr = mapelMap.get(mapelId) ?? { nama, kode, sum: 0, count: 0, tuntas: 0 };
    curr.sum += val;
    curr.count += 1;
    if (isTuntas) curr.tuntas += 1;

    mapelMap.set(mapelId, curr);
  });

  const mapelStats: SubjectStats[] = Array.from(mapelMap.entries()).map(([id, info]) => ({
    id: typeof id === "number" ? id : null,
    namaMapel: info.nama,
    kodeMapel: info.kode,
    rataRataNilai: info.count > 0 ? Math.round((info.sum / info.count) * 10) / 10 : 0,
    totalSiswa: info.count,
    persentaseTuntas: info.count > 0 ? Math.round((info.tuntas / info.count) * 100 * 10) / 10 : 0,
  }));

  // ── Build distribusiNilai ─────────────────────────────────────────────────
  let sangatBaik = 0;
  let baik = 0;
  let cukup = 0;
  let perluBimbingan = 0;

  allGrades.forEach((g) => {
    const val = g.nilaiRaport;
    if (val === null) return;
    if (val >= 90) sangatBaik++;
    else if (val >= 75) baik++;
    else if (val >= 60) cukup++;
    else perluBimbingan++;
  });

  const distribusiNilai: GradeDistribution[] = [
    { name: "Sangat Baik (≥90)", value: sangatBaik, color: "#10b981" },
    { name: "Baik (75-89)", value: baik, color: "#6366f1" },
    { name: "Cukup (60-74)", value: cukup, color: "#f59e0b" },
    { name: "Perlu Bimbingan (<60)", value: perluBimbingan, color: "#ef4444" },
  ];

  // ── Kalkulasi global ──────────────────────────────────────────────────────
  const totalSiswa     = kelas.reduce((sum, k) => sum + k.students.length, 0);
  const rataRataGlobal =
    allGrades.length > 0
      ? allGrades.reduce((sum, g) => sum + (g.nilaiRaport ?? 0), 0) /
        allGrades.length
      : 0;
  const tuntasGlobal = allGrades.filter(
    (g) => g.statusTuntas === "TUNTAS"
  ).length;
  const persenTuntas =
    allGrades.length > 0 ? (tuntasGlobal / allGrades.length) * 100 : 0;
  const totalBelumTuntas = totalSiswa - tuntasGlobal;

  return {
    totalSiswa,
    totalKelas:     kelas.length,
    totalGuru,
    totalMapel,
    totalBelumTuntas,
    rataRataGlobal: Math.round(rataRataGlobal * 10) / 10,
    persenTuntas:   Math.round(persenTuntas * 10) / 10,
    kelasStats,
    grafikData,
    topSiswa,
    bottomSiswa,
    mapelStats,
    distribusiNilai,
    lastUpdated:    new Date(),
  };
}
