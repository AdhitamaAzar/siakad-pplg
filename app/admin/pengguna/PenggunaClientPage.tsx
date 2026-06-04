// =============================================================================
// FILE: app/admin/pengguna/PenggunaClientPage.tsx
// TUJUAN: Client Component untuk mengelola pengguna (User CRUD) bagi admin.
//         - Tampilkan list pengguna dengan search filter
//         - Modal tambah pengguna baru (otomatis sesuaikan form berdasarkan role)
//         - Modal reset password
//         - Tombol hapus pengguna (cascade delete terpicu di DB)
// =============================================================================

"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  Users, ShieldCheck, GraduationCap, BookOpen, Plus, Search,
  Key, Trash2, X, Loader2, CalendarDays, AlertTriangle
} from "lucide-react";

interface Role {
  id:   number;
  name: string;
}

interface UserItem {
  id:        number;
  username:  string;
  createdAt: Date | string;
  role:      Role | null;
  student?: {
    nama: string;
  } | null;
  teacher?: {
    nama: string;
  } | null;
}

interface ClassItem {
  id:        number;
  namaKelas: string;
}

interface PenggunaClientPageProps {
  users:   UserItem[];
  classes: ClassItem[];
}

const ROLE_STYLES: Record<string, string> = {
  admin: 'bg-rose-500/15 text-rose-400 ring-1 ring-rose-500/30',
  guru:  'bg-indigo-500/15 text-indigo-400 ring-1 ring-indigo-500/30',
  siswa: 'bg-emerald-500/15 text-emerald-400 ring-1 ring-emerald-500/30',
};

const ROLE_ICONS: Record<string, React.ReactNode> = {
  admin: <ShieldCheck className="h-3.5 w-3.5" />,
  guru:  <BookOpen className="h-3.5 w-3.5" />,
  siswa: <GraduationCap className="h-3.5 w-3.5" />,
};

function RoleBadge({ role }: { role: string }) {
  const key = role.toLowerCase();
  const style = ROLE_STYLES[key] ?? 'bg-slate-700/50 text-slate-400 ring-1 ring-slate-600/30';
  const icon  = ROLE_ICONS[key] ?? null;
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-semibold capitalize ${style}`}>
      {icon}
      {role}
    </span>
  );
}

function StatCard({
  label,
  value,
  icon,
  accent,
}: {
  label: string;
  value: number;
  icon: React.ReactNode;
  accent: string;
}) {
  return (
    <div className="flex items-center gap-4 rounded-2xl border border-slate-800/60 bg-slate-900/60 px-6 py-5 backdrop-blur-sm">
      <div className={`flex h-11 w-11 items-center justify-center rounded-xl ${accent}`}>
        {icon}
      </div>
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">{label}</p>
        <p className="mt-0.5 text-2xl font-bold text-white">{value}</p>
      </div>
    </div>
  );
}

export default function PenggunaClientPage({ users, classes }: PenggunaClientPageProps) {
  const router = useRouter();

  // Search State
  const [search, setSearch] = useState("");

  // Modal State
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isResetOpen, setIsResetOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  // Target User State for Reset / Delete
  const [targetUser, setTargetUser] = useState<UserItem | null>(null);

  // Form State - Create User
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [roleName, setRoleName] = useState("siswa");
  const [nama, setNama] = useState("");
  const [nis, setNis] = useState("");
  const [nip, setNip] = useState("");
  const [kelasId, setKelasId] = useState("");

  // Form State - Reset Password
  const [newPassword, setNewPassword] = useState("");

  // ─── FILTER & SEARCH ────────────────────────────────────────────────────────
  const filteredUsers = useMemo(() => {
    if (!search.trim()) return users;
    const q = search.trim().toLowerCase();
    return users.filter(
      (u) =>
        u.username.toLowerCase().includes(q) ||
        u.student?.nama.toLowerCase().includes(q) ||
        u.role?.name.toLowerCase().includes(q)
    );
  }, [users, search]);

  // Statistik Ringkasan
  const adminCount = users.filter((u) => u.role?.name === "admin").length;
  const guruCount  = users.filter((u) => u.role?.name === "guru").length;
  const siswaCount = users.filter((u) => u.role?.name === "siswa").length;

  // ─── ACTIONS ────────────────────────────────────────────────────────────────
  function openCreate() {
    setUsername("");
    setPassword("");
    setRoleName("siswa");
    setNama("");
    setNis("");
    setNip("");
    setKelasId(classes[0]?.id.toString() || "");
    setErrorMsg("");
    setIsCreateOpen(true);
  }

  async function handleCreate() {
    if (!username.trim() || !password.trim()) {
      setErrorMsg("Username dan password wajib diisi.");
      return;
    }

    setIsSubmitting(true);
    setErrorMsg("");

    const payload = {
      username,
      password,
      roleName,
      nama,
      nis,
      nip,
      kelasId: kelasId ? Number(kelasId) : null,
    };

    try {
      const res = await fetch("/api/admin/pengguna", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Gagal membuat pengguna baru.");
      }

      setIsCreateOpen(false);
      router.refresh();
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setIsSubmitting(false);
    }
  }

  function openReset(user: UserItem) {
    setTargetUser(user);
    setNewPassword("");
    setErrorMsg("");
    setIsResetOpen(true);
  }

  async function handleResetPassword() {
    if (!newPassword.trim()) {
      setErrorMsg("Password baru wajib diisi.");
      return;
    }

    setIsSubmitting(true);
    setErrorMsg("");

    try {
      const res = await fetch("/api/admin/pengguna", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: targetUser?.id, password: newPassword }),
      });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Gagal mengatur ulang password.");
      }

      setIsResetOpen(false);
      router.refresh();
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleDelete(user: UserItem) {
    const detailText = user.role?.name === "siswa"
      ? `Siswa terikat "${user.student?.nama || ""}"`
      : user.role?.name === "guru" ? "Profil Guru" : "Akun Admin";

    if (!confirm(`Apakah Anda yakin ingin menghapus akun @${user.username}? Hapus akun ini akan menghapus ${detailText} secara permanen.`)) {
      return;
    }

    try {
      const res = await fetch(`/api/admin/pengguna?id=${user.id}`, { method: "DELETE" });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Gagal menghapus pengguna.");
      }

      router.refresh();
    } catch (err: any) {
      alert(err.message);
    }
  }

  return (
    <div className="space-y-6">
      {/* ── Ringkasan statistik ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Total Pengguna"
          value={users.length}
          icon={<Users className="h-5 w-5 text-slate-300" />}
          accent="bg-slate-700/50"
        />
        <StatCard
          label="Admin"
          value={adminCount}
          icon={<ShieldCheck className="h-5 w-5 text-rose-400" />}
          accent="bg-rose-500/20"
        />
        <StatCard
          label="Guru"
          value={guruCount}
          icon={<BookOpen className="h-5 w-5 text-indigo-400" />}
          accent="bg-indigo-500/20"
        />
        <StatCard
          label="Siswa"
          value={siswaCount}
          icon={<GraduationCap className="h-5 w-5 text-emerald-400" />}
          accent="bg-emerald-500/20"
        />
      </div>

      {/* ── Controls Row ── */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-600" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cari username / nama..."
            className="w-full rounded-xl border border-slate-800/60 bg-slate-900/60 pl-9 pr-4 py-2 text-sm text-white placeholder-slate-600 outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/30 sm:w-60"
          />
        </div>

        {/* Tambah Pengguna */}
        <button
          onClick={openCreate}
          className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold bg-indigo-500 text-white hover:bg-indigo-600 transition-colors shadow-lg shadow-indigo-500/10 cursor-pointer self-start sm:self-auto"
        >
          <Plus size={16} />
          Tambah Pengguna
        </button>
      </div>

      {/* ── Table ── */}
      <div className="rounded-2xl border border-slate-800/60 bg-slate-900/60 overflow-hidden backdrop-blur-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-800/60 bg-slate-900/40 text-slate-500">
                <th className="px-5 py-4 text-left text-[11px] font-semibold uppercase tracking-wider">No</th>
                <th className="px-5 py-4 text-left text-[11px] font-semibold uppercase tracking-wider">Username</th>
                <th className="px-5 py-4 text-left text-[11px] font-semibold uppercase tracking-wider">Role</th>
                <th className="px-5 py-4 text-left text-[11px] font-semibold uppercase tracking-wider">Nama / Deskripsi</th>
                <th className="px-5 py-4 text-left text-[11px] font-semibold uppercase tracking-wider">Dibuat</th>
                <th className="px-5 py-4 w-28 text-center text-[11px] font-semibold uppercase tracking-wider">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/40 text-slate-300">
              {filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-5 py-16 text-center text-slate-500">
                    Tidak ada hasil pencarian.
                  </td>
                </tr>
              ) : (
                filteredUsers.map((user, idx) => (
                  <tr key={user.id} className="hover:bg-white/[0.01] transition-colors">
                    <td className="px-5 py-4 text-slate-500 tabular-nums">{idx + 1}</td>
                    <td className="px-5 py-4 font-semibold text-white">@{user.username}</td>
                    <td className="px-5 py-4">
                      {user.role ? <RoleBadge role={user.role.name} /> : "—"}
                    </td>
                    <td className="px-5 py-4 text-slate-400">
                      {user.role?.name === "siswa"
                        ? user.student?.nama || <span className="text-slate-650 italic">Profil Siswa Kosong</span>
                        : user.role?.name === "guru"
                          ? user.teacher?.nama || <span className="text-indigo-400/50 italic">Profil Guru Kosong</span>
                          : "Staff Administrator"
                      }
                    </td>
                    <td className="px-5 py-4 text-slate-500 text-xs whitespace-nowrap">
                      <span className="flex items-center gap-1.5">
                        <CalendarDays className="h-3.5 w-3.5" />
                        {new Date(user.createdAt).toLocaleDateString('id-ID', {
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric',
                        })}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          onClick={() => openReset(user)}
                          className="p-1.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-450 hover:text-white transition-colors"
                          title="Reset Password"
                        >
                          <Key size={13} />
                        </button>
                        {user.username !== "admin" && (
                          <button
                            onClick={() => handleDelete(user)}
                            className="p-1.5 rounded bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 hover:text-rose-300 transition-colors"
                            title="Hapus Pengguna"
                          >
                            <Trash2 size={13} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── MODAL CREATE USER ────────────────────────────────────────────── */}
      {isCreateOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="relative w-full max-w-md rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-white">Buat Pengguna Baru</h3>
              <button onClick={() => setIsCreateOpen(false)} className="p-1 rounded-lg hover:bg-slate-800 text-slate-500 hover:text-slate-300">
                <X size={16} />
              </button>
            </div>

            {errorMsg && (
              <div className="rounded-lg border border-rose-500/20 bg-rose-500/10 p-3 text-xs text-rose-450">
                {errorMsg}
              </div>
            )}

            <div className="space-y-3">
              {/* Role */}
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-400">Hak Akses (Role)</label>
                <select
                  value={roleName}
                  onChange={(e) => setRoleName(e.target.value)}
                  className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3 py-2 text-xs text-white outline-none focus:border-indigo-500/50"
                >
                  <option value="siswa">Siswa</option>
                  <option value="guru">Guru</option>
                  <option value="admin">Administrator</option>
                </select>
              </div>

              {/* Username */}
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-400">Username</label>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Contoh: 14006 atau nama.guru"
                  className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3 py-2 text-xs text-white placeholder-slate-655 outline-none focus:border-indigo-500/50"
                />
              </div>

              {/* Password */}
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-400">Password</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Password minimal 6 karakter"
                  className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3 py-2 text-xs text-white placeholder-slate-655 outline-none focus:border-indigo-500/50"
                />
              </div>

              {/* Input Dinamis Berdasarkan Role */}
              {roleName === "guru" && (
                <>
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-400">Nama Lengkap Guru</label>
                    <input
                      type="text"
                      value={nama}
                      onChange={(e) => setNama(e.target.value)}
                      placeholder="Nama & Gelar"
                      className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3 py-2 text-xs text-white placeholder-slate-655 outline-none focus:border-indigo-500/50"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-400">NIP</label>
                    <input
                      type="text"
                      value={nip}
                      onChange={(e) => setNip(e.target.value)}
                      placeholder="Nomor Induk Pegawai"
                      className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3 py-2 text-xs text-white placeholder-slate-655 outline-none focus:border-indigo-500/50"
                    />
                  </div>
                </>
              )}

              {roleName === "siswa" && (
                <>
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-400">Nama Lengkap Siswa</label>
                    <input
                      type="text"
                      value={nama}
                      onChange={(e) => setNama(e.target.value)}
                      placeholder="Nama Lengkap"
                      className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3 py-2 text-xs text-white placeholder-slate-655 outline-none focus:border-indigo-500/50"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-400">NIS</label>
                    <input
                      type="text"
                      value={nis}
                      onChange={(e) => setNis(e.target.value)}
                      placeholder="Contoh: 14006/1667.063"
                      className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3 py-2 text-xs text-white placeholder-slate-655 outline-none focus:border-indigo-500/50"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-400">Pilih Kelas</label>
                    <select
                      value={kelasId}
                      onChange={(e) => setKelasId(e.target.value)}
                      className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3 py-2 text-xs text-white outline-none focus:border-indigo-500/50"
                    >
                      {classes.map((c) => (
                        <option key={c.id} value={c.id}>{c.namaKelas}</option>
                      ))}
                    </select>
                  </div>
                </>
              )}
            </div>

            <div className="flex items-center justify-end gap-2 border-t border-slate-800 pt-3">
              <button
                onClick={() => setIsCreateOpen(false)}
                className="px-4 py-2 rounded-lg text-xs font-semibold text-slate-400 hover:bg-slate-800 hover:text-slate-200 transition-colors"
              >
                Batal
              </button>
              <button
                onClick={handleCreate}
                disabled={isSubmitting}
                className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold bg-indigo-500 text-white hover:bg-indigo-600 disabled:opacity-50 transition-colors"
              >
                {isSubmitting ? <Loader2 size={13} className="animate-spin" /> : null}
                {isSubmitting ? "Memproses..." : "Buat Akun"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL RESET PASSWORD ─────────────────────────────────────────── */}
      {isResetOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="relative w-full max-w-sm rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-white">Reset Password</h3>
              <button onClick={() => setIsResetOpen(false)} className="p-1 rounded-lg hover:bg-slate-800 text-slate-500 hover:text-slate-300">
                <X size={16} />
              </button>
            </div>

            {errorMsg && (
              <div className="rounded-lg border border-rose-500/20 bg-rose-500/10 p-3 text-xs text-rose-450">
                {errorMsg}
              </div>
            )}

            <div className="space-y-3">
              <div className="flex items-start gap-3 rounded-xl border border-amber-500/20 bg-amber-500/5 p-3 text-xs text-amber-300">
                <AlertTriangle size={15} className="mt-0.5 shrink-0 text-amber-400" />
                <p>Mengubah password untuk akun <strong>@{targetUser?.username}</strong> secara langsung.</p>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-400">Password Baru</label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Minimal 6 karakter"
                  className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3 py-2 text-xs text-white placeholder-slate-655 outline-none focus:border-indigo-500/50"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 border-t border-slate-800 pt-3">
              <button
                onClick={() => setIsResetOpen(false)}
                className="px-4 py-2 rounded-lg text-xs font-semibold text-slate-400 hover:bg-slate-800 hover:text-slate-200 transition-colors"
              >
                Batal
              </button>
              <button
                onClick={handleResetPassword}
                disabled={isSubmitting}
                className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold bg-indigo-500 text-white hover:bg-indigo-600 disabled:opacity-50 transition-colors"
              >
                {isSubmitting ? <Loader2 size={13} className="animate-spin" /> : null}
                {isSubmitting ? "Mengubah..." : "Update Password"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
