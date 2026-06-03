"use client";

import { useRouter } from "next/navigation";

interface Props {
  subjects: { id: number; namaMapel: string }[];
  activeSubjectId: number;
}

export default function SubjectSelect({ subjects, activeSubjectId }: Props) {
  const router = useRouter();

  return (
    <div className="flex items-center gap-2 bg-slate-900 border border-slate-800 rounded-xl px-3 py-1.5 shrink-0 self-start sm:self-auto">
      <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Mapel:</span>
      <select
        value={activeSubjectId}
        onChange={(e) => {
          router.push(`/siswa/nilai?mapel=${e.target.value}`);
        }}
        className="bg-transparent border-none text-xs font-semibold text-slate-300 outline-none cursor-pointer"
      >
        {subjects.map((s) => (
          <option key={s.id} value={s.id} className="bg-slate-900">
            {s.namaMapel}
          </option>
        ))}
      </select>
    </div>
  );
}
