"use client";

// =============================================================================
// FILE: app/guru/laporan/raport/RaportClientPage.tsx
// TUJUAN: Client page untuk menampilkan & mencetak Raport Hasil Belajar resmi.
//         Mendukung print layout portrait (A4), tanda tangan kepala sekolah/wali,
//         dan dropdown interaktif untuk memilih siswa.
// =============================================================================

import { useState, useMemo } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Printer, ChevronLeft, Award, FileText, User } from "lucide-react";
import { getAbsensiBreakdown } from "../../absensi/AbsensiClientPage";

interface Note {
  id: number;
  judulProyek: string | null;
  catatan: string;
  nilaiTotal: number | null;
}

interface Grade {
  nilaiGithub: number | null;
  nilaiApi: number | null;
  nilaiAdminPanel: number | null;
  nilaiLandingPage: number | null;
  nilaiKagglePython: number | null;
  nilaiKaggleSql: number | null;
  nilaiKaggleMl: number | null;
  nilaiUjianMl: number | null;
  nilaiUjianSql: number | null;
  rataRata: number | null;
  nilaiRaport: number | null;
  predikat: string | null;
  statusTuntas: string | null;
}

interface Attendance {
  totalHadir: number;
  totalTidakHadir: number;
  persentaseHadir: number;
}

interface StudentDetail {
  id: number;
  nama: string;
  nis: string;
  kelas: {
    id: number;
    namaKelas: string;
  };
  grades: Grade[];
  attendances: Attendance[];
  notes: Note[];
}

interface MiniStudent {
  id: number;
  nama: string;
  nis: string;
  kelasId: number;
}

interface Props {
  kelasList: { id: number; namaKelas: string }[];
  studentsList: MiniStudent[];
  selectedStudent: StudentDetail | null;
  semester: string;
  tahunAjaran: string;
  teacherName?: string;
}

export default function RaportClientPage({
  kelasList,
  studentsList,
  selectedStudent,
  semester,
  tahunAjaran,
  teacherName = "Guru PPLG",
}: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Selection states
  const [kelasId, setKelasId] = useState<string>(
    selectedStudent?.kelas.id.toString() || kelasList[0]?.id.toString() || ""
  );
  const [studentId, setStudentId] = useState<string>(
    selectedStudent?.id.toString() || ""
  );

  // Filter students based on selected class
  const filteredStudents = useMemo(() => {
    if (!kelasId) return [];
    return studentsList.filter((s) => s.kelasId === Number(kelasId));
  }, [studentsList, kelasId]);

  // Handle class selection change
  const handleKelasChange = (newKelasId: string) => {
    setKelasId(newKelasId);
    const firstStudent = studentsList.find((s) => s.kelasId === Number(newKelasId));
    setStudentId(firstStudent ? firstStudent.id.toString() : "");
  };

  // Redirect to load selected student's report
  const handleLoadRaport = () => {
    if (!studentId) return;
    router.push(`/guru/laporan/raport?siswa=${studentId}`);
  };

  // Calculations for selected student
  const raportData = useMemo(() => {
    if (!selectedStudent) return null;

    const grade = selectedStudent.grades[0] || null;
    const attendance = selectedStudent.attendances[0] || null;
    const notesList = selectedStudent.notes;

    const absBreakdown = getAbsensiBreakdown(attendance?.totalTidakHadir ?? 0, selectedStudent.id);

    return {
      grade,
      attendance,
      notesList,
      absBreakdown,
    };
  }, [selectedStudent]);

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <style dangerouslySetInnerHTML={{ __html: `
        @media print {
          body {
            background: white !important;
            color: black !important;
          }
          nav, sidebar, header, .no-print, button, select, input, .breadcrumb {
            display: none !important;
          }
          .raport-sheet {
            border: none !important;
            background: white !important;
            box-shadow: none !important;
            padding: 0 !important;
            margin: 0 !important;
            color: black !important;
            width: 100% !important;
          }
          .raport-text-muted {
            color: #4b5563 !important;
          }
          .raport-table th, .raport-table td {
            border: 1px solid #1f2937 !important;
            color: black !important;
            background: white !important;
          }
          .raport-table th {
            background-color: #f3f4f6 !important;
          }
          .main-container {
            padding: 0 !important;
            margin: 0 !important;
          }
        }
      `}} />

      {/* Selector Controls (no-print) */}
      <div className="bg-slate-900/60 border border-slate-800/60 p-5 rounded-2xl space-y-4 no-print">
        <h2 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
          <FileText size={16} className="text-indigo-400" />
          Pilih Siswa untuk Cetak Raport
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-end">
          <div className="space-y-1.5">
            <label className="text-xs text-slate-400 font-semibold">Kelas</label>
            <select
              value={kelasId}
              onChange={(e) => handleKelasChange(e.target.value)}
              className="w-full bg-slate-950 border border-slate-850 rounded-xl px-3 py-2 text-xs text-slate-350 focus:border-indigo-500 outline-none"
            >
              <option value="">Pilih Kelas</option>
              {kelasList.map((k) => (
                <option key={k.id} value={k.id}>
                  {k.namaKelas}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs text-slate-400 font-semibold">Siswa</label>
            <select
              value={studentId}
              onChange={(e) => setStudentId(e.target.value)}
              disabled={!kelasId}
              className="w-full bg-slate-950 border border-slate-850 rounded-xl px-3 py-2 text-xs text-slate-350 focus:border-indigo-500 outline-none disabled:opacity-50"
            >
              <option value="">Pilih Siswa</option>
              {filteredStudents.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.nama} ({s.nis})
                </option>
              ))}
            </select>
          </div>

          <button
            onClick={handleLoadRaport}
            disabled={!studentId}
            className="w-full bg-indigo-650 hover:bg-indigo-600 text-white rounded-xl py-2 text-xs font-semibold disabled:opacity-40 transition-colors cursor-pointer"
          >
            Lihat Raport
          </button>
        </div>
      </div>

      {selectedStudent && raportData ? (
        <div className="space-y-4">
          {/* Action Bar (no-print) */}
          <div className="flex justify-between items-center no-print">
            <Link
              href="/guru/siswa"
              className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-slate-200 transition-colors"
            >
              <ChevronLeft size={14} />
              Kembali ke Daftar Siswa
            </Link>

            <button
              onClick={() => window.print()}
              className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold shadow-lg shadow-indigo-950/20 hover:shadow-indigo-950/40 transition-all cursor-pointer"
            >
              <Printer size={14} />
              Cetak Raport (PDF)
            </button>
          </div>

          {/* Raport Sheet (Portrait Layout) */}
          <div className="raport-sheet bg-slate-900 border border-slate-850 p-10 rounded-2xl shadow-xl text-slate-100 font-serif leading-relaxed">
            {/* Kop Laporan */}
            <div className="text-center border-b-2 border-slate-800 pb-5 mb-6">
              <h1 className="text-xl font-bold tracking-wide uppercase text-white">
                LAPORAN HASIL BELAJAR (RAPORT)
              </h1>
              <p className="text-sm tracking-widest uppercase text-slate-400 mt-1 font-sans">
                SMK NEGERI SIAP KERJA PPLG
              </p>
              <p className="text-[10px] text-slate-500 font-sans mt-0.5">
                Alamat: Jl. Pembangunan No. 12, PPLG Tech Zone
              </p>
            </div>

            {/* Biodata Siswa */}
            <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-xs font-sans mb-8">
              <div className="grid grid-cols-3">
                <span className="text-slate-400">Nama Siswa</span>
                <span className="col-span-2 text-white font-bold">: {selectedStudent.nama}</span>
              </div>
              <div className="grid grid-cols-3">
                <span className="text-slate-400">Semester</span>
                <span className="col-span-2 text-white font-bold">: {semester}</span>
              </div>
              <div className="grid grid-cols-3">
                <span className="text-slate-400">Nomor Induk / NIS</span>
                <span className="col-span-2 text-white font-mono font-bold">: {selectedStudent.nis}</span>
              </div>
              <div className="grid grid-cols-3">
                <span className="text-slate-400">Tahun Pelajaran</span>
                <span className="col-span-2 text-white font-bold">: {tahunAjaran}</span>
              </div>
              <div className="grid grid-cols-3">
                <span className="text-slate-400">Kelas</span>
                <span className="col-span-2 text-white font-bold">: {selectedStudent.kelas.namaKelas}</span>
              </div>
              <div className="grid grid-cols-3">
                <span className="text-slate-400 font-medium">Program Keahlian</span>
                <span className="col-span-2 text-white font-bold">: Pengembangan Perangkat Lunak & Gim</span>
              </div>
            </div>

            {/* Sub-judul Nilai */}
            <h3 className="text-sm font-sans font-bold text-white uppercase tracking-wider mb-3">
              A. NILAI AKADEMIK & KOMPETENSI
            </h3>

            {/* Tabel Nilai */}
            <div className="overflow-hidden border border-slate-800 rounded-xl mb-6">
              <table className="raport-table w-full text-xs text-left border-collapse font-sans">
                <thead>
                  <tr className="bg-slate-850 border-b border-slate-800 text-slate-350">
                    <th className="px-4 py-3 text-center w-12 border-r border-slate-850">No</th>
                    <th className="px-4 py-3 border-r border-slate-850">Mata Pelajaran / Kompetensi Keahlian</th>
                    <th className="px-3 py-3 text-center w-20 border-r border-slate-850">Nilai</th>
                    <th className="px-3 py-3 text-center w-28 border-r border-slate-850">Predikat</th>
                    <th className="px-4 py-3 text-center w-24">Ketuntasan</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-850 text-slate-300">
                  <tr className="bg-slate-900/40">
                    <td className="px-4 py-3 text-center font-bold border-r border-slate-850">1</td>
                    <td className="px-4 py-3 font-bold border-r border-slate-850 text-white">
                      Paket Keahlian RPL: Pemrograman Perangkat Lunak & Gim (PPLG)
                    </td>
                    <td className="px-3 py-3 text-center font-bold text-base border-r border-slate-850 tabular-nums text-white">
                      {raportData.grade?.nilaiRaport ?? "—"}
                    </td>
                    <td className="px-3 py-3 text-center font-bold border-r border-slate-850">
                      <span className="text-indigo-400">{raportData.grade?.predikat ?? "—"}</span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className={`font-extrabold ${
                        raportData.grade?.statusTuntas === "TUNTAS" ? "text-emerald-450" : "text-rose-455"
                      }`}>
                        {raportData.grade?.statusTuntas ?? "BELUM TUNTAS"}
                      </span>
                    </td>
                  </tr>
                  
                  {/* Komponen Rincian Tugas */}
                  {raportData.grade && (
                    <>
                      {[
                        { name: "Portfolio & Kontribusi GitHub", val: raportData.grade.nilaiGithub },
                        { name: "Pembuatan & Integrasi Backend API", val: raportData.grade.nilaiApi },
                        { name: "Pembangunan Web Admin Panel", val: raportData.grade.nilaiAdminPanel },
                        { name: "Pembuatan Landing Page Interaktif", val: raportData.grade.nilaiLandingPage },
                        { name: "Sertifikasi Kaggle Intro to Python", val: raportData.grade.nilaiKagglePython },
                        { name: "Sertifikasi Kaggle Intro to SQL", val: raportData.grade.nilaiKaggleSql },
                        { name: "Sertifikasi Kaggle Machine Learning", val: raportData.grade.nilaiKaggleMl },
                        { name: "Ujian Kompetensi Machine Learning", val: raportData.grade.nilaiUjianMl },
                        { name: "Ujian Kompetensi SQL & Basis Data", val: raportData.grade.nilaiUjianSql },
                      ].map((item, idx) => (
                        <tr key={idx} className="bg-slate-950/20 text-slate-400">
                          <td className="px-4 py-2 text-center text-[10px] border-r border-slate-850"></td>
                          <td className="px-6 py-2 text-[11px] italic border-r border-slate-850 flex items-center gap-1.5">
                            <span className="w-1 h-1 rounded-full bg-slate-700 shrink-0" />
                            {item.name}
                          </td>
                          <td className="px-3 py-2 text-center text-[11px] font-semibold border-r border-slate-850 tabular-nums">
                            {item.val ?? "—"}
                          </td>
                          <td className="px-3 py-2 text-center text-[10px] border-r border-slate-850">—</td>
                          <td className="px-4 py-2 text-center text-[10px]">
                            {item.val && item.val >= 75 ? (
                              <span className="text-emerald-600">Tuntas</span>
                            ) : item.val ? (
                              <span className="text-rose-500">Belum</span>
                            ) : (
                              "—"
                            )}
                          </td>
                        </tr>
                      ))}
                    </>
                  )}
                </tbody>
              </table>
            </div>

            {/* Sub-judul Absensi */}
            <h3 className="text-sm font-sans font-bold text-white uppercase tracking-wider mb-3">
              B. REKAPITULASI KEHADIRAN (ABSENSI)
            </h3>

            {/* Tabel Kehadiran */}
            <div className="overflow-hidden border border-slate-800 rounded-xl mb-6">
              <table className="raport-table w-full text-xs text-left border-collapse font-sans">
                <thead>
                  <tr className="bg-slate-850 border-b border-slate-800 text-slate-350">
                    <th className="px-4 py-2.5 border-r border-slate-850">Kategori Kehadiran</th>
                    <th className="px-4 py-2.5 text-center w-36 border-r border-slate-850">Jumlah Hari</th>
                    <th className="px-4 py-2.5">Keterangan</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-850 text-slate-300">
                  <tr>
                    <td className="px-4 py-2.5 border-r border-slate-850">Sakit (S)</td>
                    <td className="px-4 py-2.5 text-center font-bold border-r border-slate-850 text-white">
                      {raportData.absBreakdown.sakit} hari
                    </td>
                    <td className="px-4 py-2.5 text-slate-500 italic">Disertai surat keterangan dokter resmi</td>
                  </tr>
                  <tr>
                    <td className="px-4 py-2.5 border-r border-slate-850">Izin (I)</td>
                    <td className="px-4 py-2.5 text-center font-bold border-r border-slate-850 text-white">
                      {raportData.absBreakdown.izin} hari
                    </td>
                    <td className="px-4 py-2.5 text-slate-500 italic">Dengan permohonan tertulis dari orang tua/wali</td>
                  </tr>
                  <tr>
                    <td className="px-4 py-2.5 border-r border-slate-850">Tanpa Keterangan / Alpha (A)</td>
                    <td className="px-4 py-2.5 text-center font-bold border-r border-slate-850 text-white">
                      {raportData.absBreakdown.alpha} hari
                    </td>
                    <td className="px-4 py-2.5 text-slate-500 italic text-rose-500/80">Absen tanpa berita/keterangan yang sah</td>
                  </tr>
                  <tr className="bg-slate-850/30">
                    <td className="px-4 py-3 font-bold border-r border-slate-850">Persentase Kehadiran Kelas</td>
                    <td className="px-4 py-3 text-center font-black border-r border-slate-850 text-emerald-405 text-sm">
                      {raportData.attendance ? `${raportData.attendance.persentaseHadir}%` : "—"}
                    </td>
                    <td className="px-4 py-3 text-slate-400 font-semibold">
                      Total Kehadiran: {raportData.attendance?.totalHadir} pertemuan
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Sub-judul Catatan */}
            <h3 className="text-sm font-sans font-bold text-white uppercase tracking-wider mb-3">
              C. CATATAN GURU & PERKEMBANGAN BELAJAR
            </h3>

            {/* Box Catatan */}
            <div className="border border-slate-800 rounded-xl bg-slate-950/20 p-5 font-sans mb-12 text-xs text-slate-300">
              {raportData.notesList.length > 0 ? (
                <div className="space-y-4">
                  {raportData.notesList.slice(0, 3).map((note, idx) => (
                    <div key={note.id} className="space-y-1">
                      <p className="font-bold text-white">
                        Catatan #{idx + 1}: {note.judulProyek || "Evaluasi Belajar"}
                      </p>
                      <p className="text-slate-400 italic font-serif leading-relaxed">
                        "{note.catatan}"
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-slate-500 italic text-center">
                  Belum ada catatan perilaku atau catatan akademik khusus untuk siswa ini.
                </p>
              )}
            </div>

            {/* Area Tanda Tangan */}
            <div className="grid grid-cols-3 gap-6 text-xs text-center font-sans mt-12 pt-6">
              <div className="flex flex-col justify-between h-28">
                <span>Orang Tua / Wali Murid</span>
                <span className="border-b border-slate-700 w-36 mx-auto"></span>
                <span>....................................</span>
              </div>
              <div className="flex flex-col justify-between h-28">
                <span>Wali Kelas XI PPLG</span>
                <div className="mt-8 flex flex-col items-center">
                  <span className="text-[10px] text-slate-500 italic">Ditandatangani secara digital</span>
                  <span className="border-b border-slate-700 w-36 mx-auto mt-2"></span>
                </div>
                <span className="font-bold text-white">{teacherName}</span>
              </div>
              <div className="flex flex-col justify-between h-28">
                <span>Kepala Sekolah</span>
                <div className="mt-8 flex flex-col items-center">
                  <span className="text-[10px] text-slate-500 italic">Ditandatangani secara digital</span>
                  <span className="border-b border-slate-700 w-36 mx-auto mt-2"></span>
                </div>
                <span className="font-bold text-white">Drs. H. Mulyono, M.Pd</span>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="rounded-2xl border border-dashed border-slate-800 bg-slate-900/20 p-16 text-center space-y-3 no-print">
          <div className="w-12 h-12 rounded-full bg-slate-800/60 flex items-center justify-center text-slate-400 mx-auto">
            <User size={20} />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white">Belum Ada Siswa Terpilih</h3>
            <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
              Silakan pilih kelas dan siswa pada panel di atas lalu klik "Lihat Raport" untuk membuat laporan hasil belajar resmi.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
