// =============================================================================
// FILE: lib/gradeCalc.ts
// TUJUAN: Menghitung nilai akhir siswa berdasarkan GradeDetail (dinamis via Task).
//         Sistem ini menggantikan field hardcoded lama (nilaiGithub, nilaiApi, dll).
// =============================================================================

export function predikatDari(nilai: number): string {
  if (nilai >= 90) return "Sangat Baik";
  if (nilai >= 75) return "Baik";
  if (nilai >= 60) return "Cukup";
  return "Perlu Bimbingan";
}

export interface GradeDetailInput {
  taskId: number;
  nilai: number | null;
  bobot: number;
  isActive: boolean;
}

/**
 * Hitung nilai akhir dari GradeDetail yang dinamis.
 * Menerima array detail nilai per task beserta bobot dan status aktifnya.
 */
export function hitungGradeDari(details: GradeDetailInput[]) {
  const activeDetails = details.filter((d) => d.isActive);

  if (activeDetails.length === 0) {
    return {
      rataRata: null,
      nilaiHasil: null,
      nilaiRaport: null,
      predikat: null,
      statusTuntas: null,
      jumlahNilaiKosong: 0,
      persentaseMaju: 0,
    };
  }

  let weightedSum = 0;
  let activeWeightSum = 0;
  let filledCount = 0;

  for (const detail of activeDetails) {
    if (detail.nilai !== null && detail.nilai !== undefined) {
      weightedSum += detail.nilai * detail.bobot;
      activeWeightSum += detail.bobot;
      filledCount++;
    }
  }

  const jumlahNilaiKosong = activeDetails.length - filledCount;
  const persentaseMaju =
    activeDetails.length > 0
      ? Math.round((filledCount / activeDetails.length) * 100)
      : 0;

  if (activeWeightSum === 0) {
    return {
      rataRata: null,
      nilaiHasil: null,
      nilaiRaport: null,
      predikat: null,
      statusTuntas: null,
      jumlahNilaiKosong,
      persentaseMaju,
    };
  }

  const rataRata = Math.round((weightedSum / activeWeightSum) * 10) / 10;
  const nilaiHasil = rataRata;
  const nilaiRaport = Math.round(nilaiHasil);
  const predikat = predikatDari(nilaiRaport);
  const statusTuntas = nilaiRaport >= 75 ? "TUNTAS" : "BELUM";

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
