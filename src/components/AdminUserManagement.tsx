import React, { useState, useEffect } from "react";
import { UserPlus, Trash2, Users, LogOut, UserCheck } from "lucide-react";
import { AdminRole } from "../types";
import { DIVISIONS, DIVISION_LABELS, Division } from "../lib/divisions";
import { ORG_DIRECTORY } from "../lib/orgDirectory";
import { getAdminUsers, inviteAdminUser, updateAdminUserRole, removeAdminUser, revokeAdminSession, impersonate, AdminUserEntry } from "../lib/api";

const ROLE_LABELS: Record<AdminRole, string> = {
  SUPER_ADMIN: "Super Admin",
  MODERATOR: "Moderator (Kepala Divisi)",
  PIMPINAN: "Pimpinan",
  STAFF: "Staff",
};

const DIVISION_REQUIRED_ROLES: AdminRole[] = ["MODERATOR", "STAFF"];

interface AdminUserManagementProps {
  currentUserEmail?: string;
  onClose: () => void;
  onRefreshAuth: () => Promise<void>;
}

export default function AdminUserManagement({ currentUserEmail, onClose, onRefreshAuth }: AdminUserManagementProps) {
  const [users, setUsers] = useState<AdminUserEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteName, setInviteName] = useState("");
  const [inviteRole, setInviteRole] = useState<AdminRole>("MODERATOR");
  const [inviteDivision, setInviteDivision] = useState<Division>(DIVISIONS[0]);
  const [inviting, setInviting] = useState(false);

  const loadUsers = async () => {
    setLoading(true);
    try {
      const data = await getAdminUsers();
      setUsers(data);
    } catch (err) {
      setError("Gagal memuat daftar akun admin.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();
  }, []);

  const registeredEmails = new Set(users.map((u) => u.email));
  const availableDirectory = ORG_DIRECTORY.filter((entry) => !registeredEmails.has(entry.email));

  const handlePickFromDirectory = (email: string) => {
    const entry = ORG_DIRECTORY.find((e) => e.email === email);
    if (!entry) return;
    setInviteEmail(entry.email);
    setInviteName(entry.name);
    setInviteRole(entry.suggestedRole);
    if (entry.suggestedDivision) setInviteDivision(entry.suggestedDivision);
  };

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteEmail.trim()) return;
    setInviting(true);
    setError("");
    try {
      await inviteAdminUser({
        email: inviteEmail.trim(),
        name: inviteName.trim() || undefined,
        role: inviteRole,
        division: DIVISION_REQUIRED_ROLES.includes(inviteRole) ? inviteDivision : undefined,
      });
      setInviteEmail("");
      setInviteName("");
      setInviteRole("MODERATOR");
      setInviteDivision(DIVISIONS[0]);
      await loadUsers();
    } catch (err) {
      setError("Gagal menambahkan akun. Pastikan email valid dan belum terdaftar.");
    } finally {
      setInviting(false);
    }
  };

  const handleRoleChange = async (email: string, role: AdminRole, division: Division) => {
    try {
      await updateAdminUserRole(email, role, DIVISION_REQUIRED_ROLES.includes(role) ? division : undefined);
      await loadUsers();
    } catch (err) {
      setError("Gagal mengubah role.");
    }
  };

  const handleRemove = async (email: string) => {
    try {
      await removeAdminUser(email);
      await loadUsers();
    } catch (err) {
      setError("Gagal menghapus akun.");
    }
  };

  const [revokedEmail, setRevokedEmail] = useState<string | null>(null);

  const handleRevokeSession = async (email: string) => {
    try {
      await revokeAdminSession(email);
      setRevokedEmail(email);
      setTimeout(() => setRevokedEmail(null), 3000);
    } catch (err) {
      setError("Gagal mengakhiri sesi akun.");
    }
  };

  const [impersonating, setImpersonating] = useState(false);
  const [impersonateEmail, setImpersonateEmail] = useState("");

  const handleImpersonate = async (email: string) => {
    setImpersonating(true);
    setError("");
    try {
      await impersonate(email);
      await onRefreshAuth();
      onClose();
    } catch (err) {
      setError("Gagal login sebagai akun tersebut.");
    } finally {
      setImpersonating(false);
    }
  };

  const handleImpersonateOther = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!impersonateEmail.trim()) return;
    await handleImpersonate(impersonateEmail.trim());
  };

  return (
    <div className="bg-white p-5 rounded-2xl border border-indigo-200 shadow-md space-y-4 animate-fade-in" id="admin-user-management-card">
      <div className="flex items-center justify-between border-b border-slate-100 pb-3">
        <div className="flex items-center gap-2">
          <div className="p-2 bg-indigo-100 text-indigo-700 rounded-xl">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <h4 className="text-sm font-bold text-slate-900">Kelola Akun Moderator, Staff & Pimpinan</h4>
            <p className="text-xs text-slate-500">Hanya Super Admin yang dapat menambah, mengubah, atau mencabut akses admin lain.</p>
          </div>
        </div>
        <button onClick={onClose} className="text-slate-400 hover:text-slate-600 font-bold text-sm px-2 cursor-pointer">✕</button>
      </div>

      {error && <p className="text-rose-500 text-xs font-semibold">{error}</p>}

      {/* Quick-pick from FTI org directory */}
      {availableDirectory.length > 0 && (
        <div className="space-y-1">
          <label className="text-[10px] font-bold text-slate-500 uppercase">Pilih dari Direktori FTI (opsional)</label>
          <select
            defaultValue=""
            onChange={(e) => {
              if (e.target.value) handlePickFromDirectory(e.target.value);
              e.target.value = "";
            }}
            className="w-full px-3 py-2 bg-indigo-50 border border-indigo-100 rounded-lg text-xs cursor-pointer focus:outline-none focus:ring-1 focus:ring-indigo-500"
          >
            <option value="">Pilih nama untuk mengisi form otomatis...</option>
            {availableDirectory.map((entry) => (
              <option key={entry.email} value={entry.email}>{entry.name} — {entry.title}</option>
            ))}
          </select>
        </div>
      )}

      {/* Invite Form */}
      <form onSubmit={handleInvite} className="grid grid-cols-1 sm:grid-cols-4 gap-3 p-3 bg-slate-50 rounded-xl border border-slate-100">
        <input
          type="email"
          required
          value={inviteEmail}
          onChange={(e) => setInviteEmail(e.target.value)}
          placeholder="email@uii.ac.id"
          className="sm:col-span-2 px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500"
        />
        <input
          type="text"
          value={inviteName}
          onChange={(e) => setInviteName(e.target.value)}
          placeholder="Nama (opsional)"
          className="px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500"
        />
        <select
          value={inviteRole}
          onChange={(e) => setInviteRole(e.target.value as AdminRole)}
          className="px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500 cursor-pointer"
        >
          {(Object.keys(ROLE_LABELS) as AdminRole[]).map((role) => (
            <option key={role} value={role}>{ROLE_LABELS[role]}</option>
          ))}
        </select>

        {DIVISION_REQUIRED_ROLES.includes(inviteRole) && (
          <select
            value={inviteDivision}
            onChange={(e) => setInviteDivision(e.target.value as Division)}
            className="sm:col-span-2 px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500 cursor-pointer"
          >
            {DIVISIONS.map((division) => (
              <option key={division} value={division}>{DIVISION_LABELS[division]}</option>
            ))}
          </select>
        )}

        <button
          type="submit"
          disabled={inviting}
          className="sm:col-span-4 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white rounded-lg text-xs font-bold cursor-pointer transition-all flex items-center justify-center gap-1.5"
        >
          <UserPlus className="w-3.5 h-3.5" />
          {inviting ? "Menambahkan..." : "Tambah Akun Admin"}
        </button>
      </form>

      {/* List */}
      {loading ? (
        <p className="text-xs text-slate-400 text-center py-4">Memuat...</p>
      ) : users.length === 0 ? (
        <p className="text-xs text-slate-400 text-center py-4">Belum ada akun terdaftar.</p>
      ) : (
        <div className="space-y-2">
          {users.map((u) => (
            <div key={u.email} className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 bg-white border border-slate-100 rounded-xl">
              <div className="min-w-0">
                <p className="text-xs font-bold text-slate-900 truncate">{u.name || u.email}</p>
                <p className="text-[10px] text-slate-500 truncate">{u.email}</p>
                {revokedEmail === u.email && (
                  <p className="text-[10px] text-amber-600 font-semibold">Sesi diakhiri — akun ini akan diminta login ulang.</p>
                )}
              </div>
              <div className="flex items-center gap-2 shrink-0 flex-wrap">
                <select
                  value={u.role}
                  onChange={(e) => handleRoleChange(u.email, e.target.value as AdminRole, u.division ?? DIVISIONS[0])}
                  disabled={u.email === currentUserEmail}
                  className="px-2 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-[10px] font-bold cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {(Object.keys(ROLE_LABELS) as AdminRole[]).map((role) => (
                    <option key={role} value={role}>{ROLE_LABELS[role]}</option>
                  ))}
                </select>
                {DIVISION_REQUIRED_ROLES.includes(u.role) && (
                  <select
                    value={u.division ?? DIVISIONS[0]}
                    onChange={(e) => handleRoleChange(u.email, u.role, e.target.value as Division)}
                    disabled={u.email === currentUserEmail}
                    className="px-2 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-[10px] font-bold cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {DIVISIONS.map((division) => (
                      <option key={division} value={division}>{DIVISION_LABELS[division]}</option>
                    ))}
                  </select>
                )}
                {u.role !== "SUPER_ADMIN" && u.email !== currentUserEmail && (
                  <button
                    onClick={() => handleImpersonate(u.email)}
                    disabled={impersonating}
                    title="Login sebagai akun ini (untuk pengujian/dukungan)"
                    className="p-1.5 text-indigo-500 hover:text-indigo-700 hover:bg-indigo-50 rounded-lg cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                  >
                    <UserCheck className="w-3.5 h-3.5" />
                  </button>
                )}
                <button
                  onClick={() => handleRevokeSession(u.email)}
                  disabled={u.email === currentUserEmail}
                  title={u.email === currentUserEmail ? "Tidak bisa mengakhiri sesi sendiri" : "Paksa akun ini logout dari semua perangkat"}
                  className="p-1.5 text-amber-500 hover:text-amber-700 hover:bg-amber-50 rounded-lg cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                >
                  <LogOut className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => handleRemove(u.email)}
                  disabled={u.email === currentUserEmail}
                  title={u.email === currentUserEmail ? "Tidak bisa menghapus akun sendiri" : "Hapus akses"}
                  className="p-1.5 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-lg cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Impersonate an arbitrary UII account (e.g. plain reporter, not in admin_users) */}
      <form onSubmit={handleImpersonateOther} className="flex flex-col sm:flex-row gap-2 p-3 bg-indigo-50/50 rounded-xl border border-indigo-100">
        <input
          type="email"
          value={impersonateEmail}
          onChange={(e) => setImpersonateEmail(e.target.value)}
          placeholder="email@uii.ac.id atau @students.uii.ac.id (login sebagai Pelapor)"
          className="flex-1 px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500"
        />
        <button
          type="submit"
          disabled={impersonating}
          className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white rounded-lg text-xs font-bold cursor-pointer transition-all flex items-center justify-center gap-1.5 shrink-0"
        >
          <UserCheck className="w-3.5 h-3.5" />
          Login sebagai
        </button>
      </form>
    </div>
  );
}
