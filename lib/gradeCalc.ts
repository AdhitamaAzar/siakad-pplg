// =============================================================================
// FILE: lib/gradeCalc.ts
// TUJUAN: Menghitung nilai akhir siswa berdasarkan bobot dan kolom aktif.
// =============================================================================

import { Subject } from "@prisma/client";

export const KOMPONEN_CONFIG = [
  { key: "nilaiGithub", weightKey: "weightGithub", activeKey: "activeGithub" },
  { key: "nilaiApi", weightKey: "weightApi", activeKey: "activeApi" },
  { key: "nilaiAdminPanel", weightKey: "weightAdminPanel", activeKey: "activeAdminPanel" },
  { key: "nilaiLandingPage", weightKey: "weightLandingPage", activeKey: "activeLandingPage" },
  { key: "nilaiKagglePython", weightKey: "weightKagglePython", activeKey: "activeKagglePython" },
  { key: "nilaiKaggleSql", weightKey: "weightKaggleSql", activeKey: "activeKaggleSql" },
  { key: "nilaiKaggleMl", weightKey: "weightKaggleMl", activeKey: "activeKaggleMl" },
  { key: "nilaiUjianMl", weightKey: "weightUjianMl", activeKey: "activeUjianMl" },
  { key: "nilaiUjianSql", weightKey: "weightUjianSql", activeKey: "activeUjianSql" },
] as const;

export type KomponenKey = typeof KOMPONEN_CONFIG[number]["key"];

export function predikatDari(nilai: number): string {
  if (nilai >= 90) return "Sangat Baik";
  if (nilai >= 75) return "Baik";
  if (nilai >= 60) return "Cukup";
  return "Perlu Bimbingan";
}

export interface GradeInput {
  nilaiGithub?: number | null;
  nilaiApi?: number | null;
  nilaiAdminPanel?: number | null;
  nilaiLandingPage?: number | null;
  nilaiKagglePython?: number | null;
  nilaiKaggleSql?: number | null;
  nilaiKaggleMl?: number | null;
  nilaiUjianMl?: number | null;
  nilaiUjianSql?: number | null;
}

export function hitungWeightedGrade(
  gradeData: GradeInput,
  subject: Subject
) {
  let weightedSum = 0;
  let activeWeightSum = 0;
  let activeCount = 0;
  let filledCount = 0;

  for (const comp of KOMPONEN_CONFIG) {
    const isActive = subject[comp.activeKey];
    if (isActive) {
      activeCount++;
      const val = gradeData[comp.key];
      const weight = subject[comp.weightKey];

      if (val !== null && val !== undefined) {
        weightedSum += val * weight;
        activeWeightSum += weight;
        filledCount++;
      }
    }
  }

  // Jika tidak ada nilai yang diisi pada kolom aktif
  if (activeWeightSum === 0) {
    return {
      rataRata: null,
      nilaiHasil: null,
      nilaiRaport: null,
      predikat: null,
      statusTuntas: null,
      jumlahNilaiKosong: activeCount,
      persentaseMaju: 0,
    };
  }

  const rataRata = Math.round((weightedSum / activeWeightSum) * 10) / 10;
  const nilaiHasil = rataRata;
  const nilaiRaport = Math.round(nilaiHasil);
  const predikat = predikatDari(nilaiRaport);
  const statusTuntas = nilaiRaport >= 75 ? "TUNTAS" : "BELUM";

  const jumlahNilaiKosong = activeCount - filledCount;
  const persentaseMaju = activeCount > 0 ? Math.round((filledCount / activeCount) * 100) : 0;

  return {
    rataRata,
    nilaiHasil,
    nilaiRaport,
    predikat,
    statusTuntas,
    jumlahNilaiKosong,
    persentaseMaju,
  };
}
