import React, { useState, useEffect } from "react";
import { Check, ClipboardList, Clock, RefreshCw, XCircle, ChevronRight, ChevronLeft, MessageSquare, Shield, ShieldCheck, Lock, FileText, AlertTriangle, MessageSquareText, Users, Eye, UserCog, Download, Tag, ScrollText, Printer } from "lucide-react";
import { Report, ReportStatus, ReportCategory, UrgencyLevel, ReportComment, AdminRole, ModerationStatus } from "../types";
import { Division, DIVISION_LABELS, divisionForCategory } from "../lib/divisions";
import { generateWhatsAppStatusUpdateLink, generateWhatsAppStaffReplyLink } from "../utils/whatsapp";
import { getHotline, updateHotline, getStaffInDivision, dispositionReport, moderateReport, updateReportCategory, exportReportsUrl, exportReportsPdfUrl, exportReportPdfUrl, apiUrl, AdminUserEntry } from "../lib/api";
import AdminUserManagement from "./AdminUserManagement";
import AuditLogPanel from "./AuditLogPanel";

interface AdminPanelProps {
  reports: Report[];
  adminRole?: AdminRole;
  adminEmail?: string;
  adminDivision?: Division;
  onUpdateStatus: (ticketId: string, status: ReportStatus, note: string) => Promise<void>;
  onAddComment: (ticketId: string, comment: ReportComment) => Promise<void>;
  onRefreshReports: () => Promise<void>;
  onRefreshAuth: () => Promise<void>;
}

export default function AdminPanel({ reports, adminRole, adminEmail, adminDivision, onUpdateStatus, onAddComment, onRefreshReports, onRefreshAuth }: AdminPanelProps) {
  const isSuperAdmin = adminRole === "SUPER_ADMIN";
  // Can act on a report's status/replies: Super Admin, division Moderators, and
  // Staff executing a ticket disposed to them. Backend re-verifies per-report scope.
  const canAct = adminRole === "SUPER_ADMIN" || adminRole === "MODERATOR" || adminRole === "STAFF";
  // Can triage/dispose a report to a Staff member: Super Admin and division Moderators only.
  const canDispose = adminRole === "SUPER_ADMIN" || adminRole === "MODERATOR";
  // Can approve/reject a report for the public feed: same actors as disposition.
  const canModerate = canDispose;
  const isPimpinan = adminRole === "PIMPINAN";

  const [selectedReportId, setSelectedReportId] = useState<string | null>(null);
  const [statusInput, setStatusInput] = useState<ReportStatus>(ReportStatus.MENUNGGU);
  const [noteInput, setNoteInput] = useState("");
  const [replyInput, setReplyInput] = useState("");
  const [staffName, setStaffName] = useState("Staf Administrasi FTI");
  const [hotlinePhone, setHotlinePhone] = useState("");
  const [hotlineSaving, setHotlineSaving] = useState(false);
  const [showWASettings, setShowWASettings] = useState(false);
  const [showUserManagement, setShowUserManagement] = useState(false);
  const [showAuditLog, setShowAuditLog] = useState(false);
  const [notification, setNotification] = useState<{ message: string; type: "success" | "info" } | null>(null);

  const [dispositionStaff, setDispositionStaff] = useState<AdminUserEntry[]>([]);
  const [dispositionAssignee, setDispositionAssignee] = useState("");
  const [dispositionNoteInput, setDispositionNoteInput] = useState("");
  const [disposing, setDisposing] = useState(false);

  const [categoryInput, setCategoryInput] = useState<ReportCategory>(ReportCategory.AKADEMIK);
  const [categoryNoteInput, setCategoryNoteInput] = useState("");
  const [updatingCategory, setUpdatingCategory] = useState(false);

  const [exportStatusFilter, setExportStatusFilter] = useState<string>("ALL");
  const [exportCategoryFilter, setExportCategoryFilter] = useState<string>("ALL");

  useEffect(() => {
    getHotline().then((data) => setHotlinePhone(data.phone)).catch(() => {});
  }, []);

  const handleSaveHotline = async () => {
    setHotlineSaving(true);
    try {
      await updateHotline({ phone: hotlinePhone });
      showNotification("Nomor WhatsApp hotline berhasil disimpan!", "success");
    } catch (err) {
      console.error(err);
      showNotification("Gagal menyimpan nomor hotline.", "info");
    } finally {
      setHotlineSaving(false);
    }
  };

  const showNotification = (message: string, type: "success" | "info" = "success") => {
    setNotification({ message, type });
    setTimeout(() => {
      setNotification(null);
    }, 4000);
  };

  // Quick statistics
  const total = reports.length;
  const pending = reports.filter((r) => r.status === ReportStatus.MENUNGGU).length;
  const processing = reports.filter((r) => r.status === ReportStatus.DIPROSES).length;
  const resolved = reports.filter((r) => r.status === ReportStatus.SELESAI).length;

  const [activeFilter, setActiveFilter] = useState<string>("ALL");

  const filteredReports = reports.filter((r) => {
    if (activeFilter === "ALL") return true;
    if (activeFilter === "MODERASI") return r.isPublic && (r.moderationStatus ?? "PENDING") === "PENDING";
    return r.status === activeFilter;
  });

  const selectedReport = reports.find((r) => r.id === selectedReportId);
  const selectedReportDivision = selectedReport ? divisionForCategory(selectedReport.category) : null;

  const handleOpenDetail = (report: Report) => {
    setSelectedReportId(report.id);
    setStatusInput(report.status);
    setNoteInput("");
    setReplyInput("");
    setDispositionAssignee("");
    setDispositionNoteInput("");
    setCategoryInput(report.category);
    setCategoryNoteInput("");
  };

  useEffect(() => {
    if (!canDispose || !selectedReportDivision) {
      setDispositionStaff([]);
      return;
    }
    getStaffInDivision(selectedReportDivision)
      .then(setDispositionStaff)
      .catch(() => setDispositionStaff([]));
  }, [canDispose, selectedReportDivision]);

  const handleDispose = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedReportId || !dispositionAssignee) return;
    setDisposing(true);
    try {
      await dispositionReport(selectedReportId, dispositionAssignee, dispositionNoteInput.trim() || undefined);
      await onRefreshReports();
      setDispositionNoteInput("");
      showNotification("Laporan berhasil didisposisikan ke staf terkait!", "success");
    } catch (err) {
      console.error(err);
      showNotification("Gagal mendisposisikan laporan.", "info");
    } finally {
      setDisposing(false);
    }
  };

  const handleUpdateCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedReportId || !selectedReport || categoryInput === selectedReport.category) return;
    setUpdatingCategory(true);
    try {
      await updateReportCategory(selectedReportId, categoryInput, categoryNoteInput.trim() || undefined);
      await onRefreshReports();
      setCategoryNoteInput("");
      showNotification("Kategori laporan berhasil diperbarui!", "success");
    } catch (err) {
      console.error(err);
      showNotification("Gagal mengubah kategori laporan.", "info");
    } finally {
      setUpdatingCategory(false);
    }
  };

  const handleModerate = async (decision: "APPROVED" | "REJECTED") => {
    if (!selectedReportId) return;
    try {
      await moderateReport(selectedReportId, decision);
      await onRefreshReports();
      showNotification(
        decision === "APPROVED" ? "Laporan disetujui tayang di Umpan Publik." : "Laporan ditolak untuk tayang di Umpan Publik.",
        "success"
      );
    } catch (err) {
      console.error(err);
      showNotification("Gagal memperbarui status moderasi. Sesi admin Anda mungkin sudah berakhir, silakan login ulang.", "info");
    }
  };

  const handleUpdateStatusAndNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedReportId || !noteInput.trim()) return;

    try {
      await onUpdateStatus(selectedReportId, statusInput, noteInput.trim());
      setNoteInput("");
      showNotification("Status laporan & catatan linimasa berhasil diperbarui!", "success");
    } catch (err) {
      console.error(err);
      showNotification("Gagal memperbarui status. Sesi admin Anda mungkin sudah berakhir, silakan login ulang.", "info");
    }
  };

  const handlePostStaffReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedReportId || !selectedReport || !replyInput.trim()) return;

    const senderName = staffName.trim() || "Staff FTI";
    const replyText = replyInput.trim();

    const newComment: ReportComment = {
      id: "c-staff-" + Math.random().toString(36).substr(2, 9),
      senderName,
      senderRole: "Admin",
      content: replyText,
      createdAt: new Date().toISOString(),
    };

    try {
      await onAddComment(selectedReportId, newComment);
      setReplyInput("");

      if (selectedReport.reporterWhatsapp) {
        window.open(generateWhatsAppStaffReplyLink(selectedReport, replyText, senderName), "_blank", "noopener,noreferrer");
        showNotification("Balasan resmi tersimpan & jendela WhatsApp dibuka untuk dikirim!", "success");
      } else {
        showNotification("Balasan resmi tersimpan. Pelapor tidak mencantumkan nomor WhatsApp.", "info");
      }
    } catch (err) {
      console.error(err);
      showNotification("Gagal mengirim balasan. Sesi admin Anda mungkin sudah berakhir, silakan login ulang.", "info");
    }
  };

  const getUrgencyColor = (level: UrgencyLevel) => {
    switch (level) {
      case UrgencyLevel.RENDAH:
        return "text-slate-600 bg-slate-100";
      case UrgencyLevel.SEDANG:
        return "text-amber-700 bg-amber-50 border-amber-100";
      case UrgencyLevel.TINGGI:
        return "text-rose-700 bg-rose-50 border-rose-100 font-bold animate-pulse";
    }
  };

  const getModerationBadge = (status?: ModerationStatus) => {
    switch (status) {
      case "APPROVED":
        return { label: "Disetujui Publik", className: "bg-emerald-50 text-emerald-700 border-emerald-100" };
      case "REJECTED":
        return { label: "Ditolak Publik", className: "bg-rose-50 text-rose-700 border-rose-100" };
      default:
        return { label: "Menunggu Moderasi", className: "bg-amber-50 text-amber-700 border-amber-100" };
    }
  };

  return (
    <div className="space-y-6" id="admin-panel-container">
      {/* Admin Title Banner */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 text-white flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-amber-500" />
            <h3 className="text-lg font-extrabold tracking-tight">Portal Staf Administrasi & Dekanat FTI</h3>
          </div>
          <p className="text-slate-400 text-xs">
            Review aduan mahasiswa, perbarui status penanganan, dan berikan tanggapan solusi secara cepat dan transparan.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <select
            value={exportStatusFilter}
            onChange={(e) => setExportStatusFilter(e.target.value)}
            className="px-2.5 py-2 bg-slate-800 text-slate-100 rounded-xl text-xs font-semibold border border-slate-600/60 cursor-pointer"
            id="export-status-filter"
            title="Filter status untuk ekspor Excel"
          >
            <option value="ALL">Semua Status</option>
            {Object.values(ReportStatus).map((status) => (
              <option key={status} value={status}>{status}</option>
            ))}
          </select>
          <select
            value={exportCategoryFilter}
            onChange={(e) => setExportCategoryFilter(e.target.value)}
            className="px-2.5 py-2 bg-slate-800 text-slate-100 rounded-xl text-xs font-semibold border border-slate-600/60 cursor-pointer"
            id="export-category-filter"
            title="Filter kategori untuk ekspor Excel"
          >
            <option value="ALL">Semua Kategori</option>
            {Object.values(ReportCategory).map((category) => (
              <option key={category} value={category}>{category}</option>
            ))}
          </select>
          <a
            href={exportReportsUrl({ status: exportStatusFilter, category: exportCategoryFilter })}
            className="px-3.5 py-2 bg-slate-700/80 hover:bg-slate-600 text-slate-100 rounded-xl text-xs font-bold border border-slate-500/40 flex items-center gap-1.5 transition-all cursor-pointer shadow-sm"
            id="export-reports-btn"
          >
            <Download className="w-4 h-4 text-slate-300" />
            <span>Unduh Excel</span>
          </a>
          <a
            href={exportReportsPdfUrl({ status: exportStatusFilter, category: exportCategoryFilter })}
            className="px-3.5 py-2 bg-slate-700/80 hover:bg-slate-600 text-slate-100 rounded-xl text-xs font-bold border border-slate-500/40 flex items-center gap-1.5 transition-all cursor-pointer shadow-sm"
            id="export-reports-pdf-btn"
          >
            <FileText className="w-4 h-4 text-slate-300" />
            <span>Unduh PDF</span>
          </a>
          {isSuperAdmin && (
            <>
              <button
                onClick={() => {
                  setShowWASettings(!showWASettings);
                  setShowUserManagement(false);
                  setShowAuditLog(false);
                }}
                className="px-3.5 py-2 bg-emerald-700/80 hover:bg-emerald-600 text-emerald-100 rounded-xl text-xs font-bold border border-emerald-500/40 flex items-center gap-1.5 transition-all cursor-pointer shadow-sm"
                id="toggle-wa-settings-btn"
              >
                <MessageSquareText className="w-4 h-4 text-emerald-300" />
                <span>Pengaturan WA Hotline</span>
              </button>
              <button
                onClick={() => {
                  setShowUserManagement(!showUserManagement);
                  setShowWASettings(false);
                  setShowAuditLog(false);
                }}
                className="px-3.5 py-2 bg-indigo-700/80 hover:bg-indigo-600 text-indigo-100 rounded-xl text-xs font-bold border border-indigo-500/40 flex items-center gap-1.5 transition-all cursor-pointer shadow-sm"
                id="toggle-user-management-btn"
              >
                <Users className="w-4 h-4 text-indigo-300" />
                <span>Kelola Akun Admin</span>
              </button>
              <button
                onClick={() => {
                  setShowAuditLog(!showAuditLog);
                  setShowWASettings(false);
                  setShowUserManagement(false);
                }}
                className="px-3.5 py-2 bg-slate-700/80 hover:bg-slate-600 text-slate-200 rounded-xl text-xs font-bold border border-slate-500/40 flex items-center gap-1.5 transition-all cursor-pointer shadow-sm"
                id="toggle-audit-log-btn"
              >
                <ScrollText className="w-4 h-4 text-slate-300" />
                <span>Audit Log</span>
              </button>
            </>
          )}
          {isPimpinan && (
            <span className="px-3 py-1.5 bg-slate-800 border border-slate-700 text-slate-300 rounded-xl text-xs font-bold flex items-center gap-1.5">
              <Eye className="w-3.5 h-3.5" />
              Mode Baca Saja
            </span>
          )}
          <div className="bg-slate-800 border border-slate-700 px-3 py-1.5 rounded-xl text-center">
            <span className="block text-[10px] text-slate-400 uppercase font-bold">Verifikasi</span>
            <span className="text-base font-extrabold text-amber-400">{pending}</span>
          </div>
          <div className="bg-slate-800 border border-slate-700 px-3 py-1.5 rounded-xl text-center">
            <span className="block text-[10px] text-slate-400 uppercase font-bold">Diproses</span>
            <span className="text-base font-extrabold text-sky-400">{processing}</span>
          </div>
          <div className="bg-slate-800 border border-slate-700 px-3 py-1.5 rounded-xl text-center">
            <span className="block text-[10px] text-slate-400 uppercase font-bold">Selesai</span>
            <span className="text-base font-extrabold text-emerald-400">{resolved}</span>
          </div>
        </div>
      </div>

      {/* WhatsApp Hotline Settings Card */}
      {showWASettings && (
        <div className="bg-white p-5 rounded-2xl border border-emerald-200 shadow-md space-y-4 animate-fade-in" id="wa-settings-card">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-emerald-100 text-emerald-700 rounded-xl">
                <MessageSquareText className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-slate-900">Pengaturan WhatsApp Layanan Aduan FTI UII</h4>
                <p className="text-xs text-slate-500">
                  Nomor kontak WhatsApp publik yang ditampilkan di halaman Beranda sebagai kanal aduan resmi FTI UII
                </p>
              </div>
            </div>
            <button onClick={() => setShowWASettings(false)} className="text-slate-400 hover:text-slate-600 font-bold text-sm px-2 cursor-pointer">✕</button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            <div className="space-y-2">
              <label className="font-bold text-slate-700 block">Nomor WhatsApp Resmi Layanan Aduan FTI:</label>
              <input
                type="text"
                value={hotlinePhone}
                onChange={(e) => setHotlinePhone(e.target.value)}
                placeholder="Contoh: 081234567890 atau 6281234567890"
                className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl font-mono text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
              <p className="text-[11px] text-slate-500">
                Nomor ini ditampilkan secara publik di Beranda sebagai kontak darurat/cepat, terpisah dari notifikasi WA per-laporan yang tetap dikirim ke nomor masing-masing pelapor.
              </p>
              <button
                type="button"
                onClick={handleSaveHotline}
                disabled={hotlineSaving}
                className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white rounded-lg text-xs font-bold cursor-pointer transition-all"
              >
                {hotlineSaving ? "Menyimpan..." : "Simpan Nomor Hotline"}
              </button>
            </div>

            <div className="p-3 bg-emerald-50/70 border border-emerald-200 rounded-xl space-y-2">
              <span className="font-bold text-emerald-900 block flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                Opsi Otomasi Berbasis WA Gateway (API)
              </span>
              <p className="text-emerald-800 leading-relaxed text-[11px]">
                Jika FTI UII ingin notifikasi terkirim <strong>100% otomatis di latar belakang</strong> tanpa staf perlu mengeklik tautan WA, cukup daftarkan nomor di provider WA Gateway (seperti <em>Fonnte / Wablas / Twilio</em>) lalu tautkan Webhook API di server backend portal.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Admin User Management Card */}
      {showUserManagement && isSuperAdmin && (
        <AdminUserManagement currentUserEmail={adminEmail} onClose={() => setShowUserManagement(false)} onRefreshAuth={onRefreshAuth} />
      )}

      {/* Audit Log Card */}
      {showAuditLog && isSuperAdmin && <AuditLogPanel onClose={() => setShowAuditLog(false)} />}

      {notification && (
        <div
          className={`${
            notification.type === "success"
              ? "bg-emerald-50 border-emerald-200 text-emerald-800"
              : "bg-rose-50 border-rose-200 text-rose-800"
          } border px-4 py-3 rounded-xl text-xs font-semibold flex items-center justify-between shadow-sm animate-fade-in`}
          id="admin-notification"
        >
          <div className="flex items-center gap-2">
            <span className={`w-2 h-2 rounded-full animate-pulse ${notification.type === "success" ? "bg-emerald-500" : "bg-rose-500"}`}></span>
            <span>{notification.message}</span>
          </div>
          <button
            onClick={() => setNotification(null)}
            className={`font-bold text-lg select-none px-2 cursor-pointer ${notification.type === "success" ? "text-emerald-500 hover:text-emerald-800" : "text-rose-500 hover:text-rose-800"}`}
          >×</button>
        </div>
      )}

      {/* Main Split Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left column: reports list */}
        <div className={`lg:col-span-5 space-y-4 ${selectedReportId ? "hidden lg:block" : "block"}`}>
          <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
              <span className="text-xs font-bold text-slate-800 uppercase">Daftar Pengaduan</span>
              <span className="px-2 py-0.5 bg-slate-100 text-slate-600 rounded-full text-[10px] font-bold">
                {filteredReports.length} Laporan
              </span>
            </div>

            {/* Segmented Filter */}
            <div className="flex flex-wrap gap-1 bg-slate-100 p-1 rounded-xl">
              {["ALL", ...(canModerate ? ["MODERASI"] : []), ReportStatus.MENUNGGU, ReportStatus.DIPROSES, ReportStatus.SELESAI].map((status) => (
                <button
                  key={status}
                  onClick={() => {
                    setActiveFilter(status);
                    setSelectedReportId(null);
                  }}
                  className={`flex-1 py-1.5 rounded-lg text-[10px] font-bold transition-all text-center cursor-pointer truncate ${
                    activeFilter === status
                      ? "bg-white text-slate-900 shadow-sm"
                      : "text-slate-500 hover:text-slate-800"
                  }`}
                >
                  {status === "ALL" ? "Semua" : status === "MODERASI" ? "Moderasi" : status.split(" ")[0]}
                </button>
              ))}
            </div>

            {/* List */}
            {filteredReports.length === 0 ? (
              <div className="py-8 text-center text-xs text-slate-400">
                Tidak ada laporan dalam kategori status ini.
              </div>
            ) : (
              <div className="space-y-2 max-h-[500px] overflow-y-auto pr-1">
                {filteredReports.map((report) => {
                  const isSelected = report.id === selectedReportId;
                  return (
                    <div
                      key={report.id}
                      onClick={() => handleOpenDetail(report)}
                      className={`p-3 rounded-xl border text-left cursor-pointer transition-all ${
                        isSelected
                          ? "border-indigo-600 bg-indigo-50/40 shadow-sm"
                          : "border-slate-100 hover:border-slate-200 bg-white"
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2 text-[10px] text-slate-400 font-mono">
                        <span>{report.id}</span>
                        <span className={`px-1.5 py-0.5 rounded ${getUrgencyColor(report.urgency)}`}>
                          {report.urgency}
                        </span>
                      </div>
                      <h4 className="text-xs font-bold text-slate-950 truncate mt-1">
                        {report.title}
                      </h4>
                      <p className="text-[10px] text-slate-500 line-clamp-1 mt-0.5">
                        {report.description}
                      </p>
                      <div className="mt-2 flex items-center justify-between text-[9px] text-slate-400 border-t border-slate-50/60 pt-1.5">
                        <span className="font-semibold text-slate-600">{report.category}</span>
                        <span className="font-mono">{new Date(report.createdAt).toLocaleDateString("id-ID")}</span>
                      </div>
                      {report.isPublic && (
                        <span className={`mt-1.5 inline-block px-1.5 py-0.5 rounded text-[9px] font-bold border ${getModerationBadge(report.moderationStatus).className}`}>
                          {getModerationBadge(report.moderationStatus).label}
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Right column: active report details and actions */}
        <div className={`lg:col-span-7 ${selectedReportId ? "block" : "hidden lg:block"}`}>
          {selectedReport ? (
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden" id="admin-report-detail">
              {/* Report Header */}
              <div className="p-6 bg-slate-50 border-b border-slate-100 space-y-4">
                {/* Mobile Back Button */}
                <button
                  onClick={() => setSelectedReportId(null)}
                  className="lg:hidden flex items-center gap-1.5 text-slate-500 hover:text-indigo-600 transition-colors font-bold text-xs pb-1 cursor-pointer"
                  id="admin-mobile-back-btn"
                >
                  <ChevronLeft className="w-4 h-4" />
                  Kembali ke Daftar Laporan
                </button>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5 font-mono text-xs">
                    <span className="font-extrabold text-indigo-950 bg-indigo-50 px-2 py-0.5 rounded">
                      {selectedReport.id}
                    </span>
                    {!selectedReport.isPublic && (
                      <span className="px-1.5 py-0.5 bg-rose-50 text-rose-700 border border-rose-100 rounded text-[9px] font-bold uppercase tracking-wider flex items-center gap-1">
                        <Lock className="w-3 h-3" />
                        Privat
                      </span>
                    )}
                  </div>
                  <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full border ${
                    selectedReport.status === ReportStatus.SELESAI ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-800"
                  }`}>
                    {selectedReport.status}
                  </span>
                </div>

                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="space-y-1">
                    <h3 className="text-base font-extrabold text-slate-950 leading-snug">{selectedReport.title}</h3>
                    <div className="text-[10px] text-slate-500 space-y-0.5">
                      <p>
                        <span className="font-bold text-slate-700">Pelapor:</span> {selectedReport.reporterName}{" "}
                        {selectedReport.reporterRole && (
                          <span className="bg-indigo-100 text-indigo-800 font-bold px-1.5 py-0.5 rounded text-[9px] ml-1">
                            {selectedReport.reporterRole}
                          </span>
                        )}{" "}
                        ({selectedReport.reporterEmail})
                      </p>
                      <p>
                        <span className="font-bold text-slate-700">WhatsApp:</span> {selectedReport.reporterWhatsapp || "-"}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 self-start sm:self-center shrink-0">
                    <a
                      href={exportReportPdfUrl(selectedReport.id)}
                      className="px-3.5 py-2 bg-slate-700 hover:bg-slate-800 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm transition-all cursor-pointer"
                      title="Cetak laporan ini sebagai PDF resmi"
                      id="print-report-pdf-btn"
                    >
                      <Printer className="w-4 h-4" />
                      <span>Cetak PDF</span>
                    </a>
                    {selectedReport.reporterWhatsapp && (
                      <a
                        href={generateWhatsAppStatusUpdateLink(selectedReport, selectedReport.status, "Salam, laporan Anda sedang dalam penanganan Dekanat FTI UII.")}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm transition-all cursor-pointer"
                        title="Kirim Pesan WhatsApp ke Pelapor"
                      >
                        <MessageSquareText className="w-4 h-4" />
                        <span>Notifikasi WA</span>
                      </a>
                    )}
                  </div>
                </div>
              </div>

              {/* Description & Attachment */}
              <div className="p-6 space-y-4 border-b border-slate-100">
                <div className="space-y-1">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">ISI ADUAN MAHASISWA</span>
                  <p className="text-slate-700 text-xs leading-relaxed whitespace-pre-wrap bg-slate-50 p-4 rounded-xl border border-slate-100">
                    {selectedReport.description}
                  </p>
                </div>

                {selectedReport.attachmentName && (
                  <div className="p-3 bg-indigo-50/50 border border-indigo-100/30 rounded-xl space-y-2">
                    <div className="flex items-center gap-2 text-xs font-bold text-indigo-900">
                      <FileText className="w-4 h-4 text-indigo-600" />
                      <span>Lampiran Bukti: {selectedReport.attachmentName}</span>
                    </div>
                    {selectedReport.attachmentPath && (
                      <div className="mt-2 space-y-2">
                        {/\.(png|jpe?g|gif|webp)$/i.test(selectedReport.attachmentName || "") && (
                          <a 
                            href={apiUrl(`uploads/${selectedReport.attachmentPath}`)} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="block max-w-xs rounded overflow-hidden border border-slate-200 shadow-sm bg-white p-1 hover:border-indigo-400 transition-colors cursor-pointer"
                          >
                            <img
                              src={apiUrl(`uploads/${selectedReport.attachmentPath}`)}
                              alt="Lampiran"
                              className="w-full max-h-40 object-contain rounded"
                              referrerPolicy="no-referrer"
                            />
                          </a>
                        )}
                        <div className="flex">
                          <a
                            href={apiUrl(`uploads/${selectedReport.attachmentPath}`)}
                            target="_blank"
                            rel="noopener noreferrer"
                            download={selectedReport.attachmentName}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-300 text-slate-700 hover:bg-slate-50 rounded-lg text-xs font-medium shadow-sm transition-colors"
                          >
                            <Download className="w-3.5 h-3.5" />
                            Unduh Lampiran
                          </a>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Actions Section */}
              <div className="p-6 space-y-6">
                {isPimpinan && (
                  <div className="p-4 bg-slate-50 border border-slate-100 rounded-xl flex items-center gap-2 text-xs text-slate-500">
                    <Eye className="w-4 h-4 text-slate-400 shrink-0" />
                    <span>Anda login sebagai Pimpinan — akses baca saja. Tindak lanjut (ubah status, disposisi, moderasi publikasi, balas resmi) hanya dapat dilakukan oleh Moderator, Staff, atau Super Admin.</span>
                  </div>
                )}

                {/* Category reassignment — fix miscategorized reports before disposition */}
                {canDispose && (
                  <div className="space-y-3 bg-slate-50/40 p-4 rounded-xl border border-slate-100">
                    <div className="flex items-center gap-2 border-b border-slate-100 pb-2 mb-2">
                      <Tag className="w-4 h-4 text-slate-600" />
                      <span className="text-xs font-bold text-slate-800 uppercase">Ubah Kategori</span>
                    </div>
                    <p className="text-xs text-slate-500">
                      Kategori saat ini: <span className="font-bold text-slate-700">{selectedReport.category}</span>. Ubah kalau laporan salah kategori saat disubmit — kalau kategori baru pindah divisi, disposisi yang sudah ada akan direset otomatis.
                    </p>
                    <form onSubmit={handleUpdateCategory} className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <select
                        value={categoryInput}
                        onChange={(e) => setCategoryInput(e.target.value as ReportCategory)}
                        className="px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-slate-500 cursor-pointer"
                      >
                        {Object.values(ReportCategory).map((cat) => (
                          <option key={cat} value={cat}>{cat}</option>
                        ))}
                      </select>
                      <input
                        type="text"
                        value={categoryNoteInput}
                        onChange={(e) => setCategoryNoteInput(e.target.value)}
                        placeholder="Alasan perubahan (opsional)"
                        className="px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-slate-500"
                      />
                      <button
                        type="submit"
                        disabled={updatingCategory || categoryInput === selectedReport.category}
                        className="px-4 py-2 bg-slate-700 hover:bg-slate-800 disabled:opacity-60 text-white rounded-lg text-xs font-semibold cursor-pointer transition-all"
                      >
                        {updatingCategory ? "Menyimpan..." : "Simpan Kategori Baru"}
                      </button>
                    </form>
                  </div>
                )}

                {/* Disposition status / form */}
                {(selectedReport.disposedToEmail || canDispose) && (
                  <div className="space-y-3 bg-amber-50/40 p-4 rounded-xl border border-amber-100">
                    <div className="flex items-center gap-2 border-b border-amber-100 pb-2 mb-2">
                      <UserCog className="w-4 h-4 text-amber-700" />
                      <span className="text-xs font-bold text-amber-900 uppercase">Disposisi Tugas</span>
                    </div>

                    {selectedReport.disposedToEmail ? (
                      <p className="text-xs text-slate-700">
                        Didisposisikan ke <span className="font-bold">{selectedReport.disposedToEmail}</span>
                        {selectedReport.dispositionNote && <> — <span className="italic">"{selectedReport.dispositionNote}"</span></>}
                      </p>
                    ) : (
                      <p className="text-xs text-slate-500">Belum didisposisikan ke staf manapun.</p>
                    )}

                    {canDispose && (
                      <form onSubmit={handleDispose} className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <select
                          value={dispositionAssignee}
                          onChange={(e) => setDispositionAssignee(e.target.value)}
                          required
                          className="px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-amber-500 cursor-pointer"
                        >
                          <option value="">
                            {dispositionStaff.length === 0
                              ? `Tidak ada staf di ${selectedReportDivision ? DIVISION_LABELS[selectedReportDivision] : "divisi ini"}`
                              : "Pilih staf tujuan..."}
                          </option>
                          {dispositionStaff.map((s) => (
                            <option key={s.email} value={s.email}>{s.name || s.email}</option>
                          ))}
                        </select>
                        <input
                          type="text"
                          value={dispositionNoteInput}
                          onChange={(e) => setDispositionNoteInput(e.target.value)}
                          placeholder="Catatan disposisi (opsional)"
                          className="px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-amber-500"
                        />
                        <button
                          type="submit"
                          disabled={disposing || !dispositionAssignee}
                          className="px-4 py-2 bg-amber-600 hover:bg-amber-700 disabled:opacity-60 text-white rounded-lg text-xs font-semibold cursor-pointer transition-all"
                        >
                          {disposing ? "Memproses..." : "Disposisikan"}
                        </button>
                      </form>
                    )}
                  </div>
                )}

                {/* Moderation status / actions for public reports */}
                {selectedReport.isPublic && (
                  <div className="space-y-3 bg-indigo-50/30 p-4 rounded-xl border border-indigo-100">
                    <div className="flex items-center justify-between gap-2 border-b border-indigo-100 pb-2 mb-2">
                      <div className="flex items-center gap-2">
                        <ShieldCheck className="w-4 h-4 text-indigo-700" />
                        <span className="text-xs font-bold text-indigo-900 uppercase">Moderasi Publikasi</span>
                      </div>
                      <span className={`text-[10px] font-bold px-2 py-1 rounded-full border ${getModerationBadge(selectedReport.moderationStatus).className}`}>
                        {getModerationBadge(selectedReport.moderationStatus).label}
                      </span>
                    </div>

                    <p className="text-xs text-slate-600">
                      Pelapor memilih agar laporan ini tampil di Umpan Publik. Laporan baru tayang setelah disetujui Moderator/Super Admin.
                    </p>

                    {canModerate ? (
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => handleModerate("APPROVED")}
                          disabled={selectedReport.moderationStatus === "APPROVED"}
                          className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg text-xs font-semibold cursor-pointer transition-all flex items-center gap-1.5"
                        >
                          <Check className="w-3.5 h-3.5" />
                          Setujui Tayang
                        </button>
                        <button
                          type="button"
                          onClick={() => handleModerate("REJECTED")}
                          disabled={selectedReport.moderationStatus === "REJECTED"}
                          className="px-4 py-2 bg-rose-600 hover:bg-rose-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg text-xs font-semibold cursor-pointer transition-all flex items-center gap-1.5"
                        >
                          <XCircle className="w-3.5 h-3.5" />
                          Tolak Tayang
                        </button>
                      </div>
                    ) : (
                      <p className="text-[11px] text-slate-400">Hanya Moderator/Super Admin yang dapat mengubah status moderasi.</p>
                    )}
                  </div>
                )}

                {canAct && (
                <>
                {/* 1. Update Status Form */}
                <form onSubmit={handleUpdateStatusAndNote} className="space-y-3 bg-slate-50/40 p-4 rounded-xl border border-slate-100">
                  <div className="flex items-center gap-2 border-b border-slate-100 pb-2 mb-2">
                    <RefreshCw className="w-4 h-4 text-indigo-600 animate-spin-slow" />
                    <span className="text-xs font-bold text-slate-800 uppercase">Tindak Lanjut & Update Status</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="col-span-1 space-y-1">
                      <label className="block text-[10px] font-bold text-slate-600">Pilih Status Baru</label>
                      <select
                        value={statusInput}
                        onChange={(e) => setStatusInput(e.target.value as ReportStatus)}
                        className="w-full px-3 py-2 bg-white text-slate-900 border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500 cursor-pointer font-semibold"
                      >
                        {Object.values(ReportStatus).map((item) => (
                          <option key={item} value={item}>
                            {item}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="col-span-2 space-y-1">
                      <label className="block text-[10px] font-bold text-slate-600">Catatan Langkah Penyelesaian (Tampil di Linimasa)</label>
                      <input
                        type="text"
                        required
                        value={noteInput}
                        onChange={(e) => setNoteInput(e.target.value)}
                        placeholder="Contoh: Menghubungi pihak sarpras untuk survei besok..."
                        className="w-full px-3 py-2 bg-white text-slate-900 border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500"
                      />
                    </div>
                  </div>

                  <div className="flex justify-end pt-2">
                    <button
                      type="submit"
                      className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold cursor-pointer transition-all"
                    >
                      Simpan Status & Log Linimasa
                    </button>
                  </div>
                </form>

                {/* 2. Official Staff Reply Form */}
                <form onSubmit={handlePostStaffReply} className="space-y-3 bg-indigo-50/20 p-4 rounded-xl border border-indigo-100/30">
                  <div className="flex items-center gap-2 border-b border-indigo-50 pb-2 mb-2">
                    <MessageSquare className="w-4 h-4 text-indigo-700" />
                    <span className="text-xs font-bold text-indigo-950 uppercase">Kirim Balasan Resmi / Hubungi Mahasiswa</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="col-span-1 space-y-1">
                      <label className="block text-[10px] font-bold text-slate-600">Pengirim Balasan</label>
                      <input
                        type="text"
                        value={staffName}
                        onChange={(e) => setStaffName(e.target.value)}
                        placeholder="Staf Administrasi FTI"
                        className="w-full px-3 py-2 bg-white text-slate-900 border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500"
                      />
                    </div>

                    <div className="col-span-2 space-y-1">
                      <label className="block text-[10px] font-bold text-slate-600">Isi Balasan Resmi</label>
                      <textarea
                        rows={2}
                        required
                        value={replyInput}
                        onChange={(e) => setReplyInput(e.target.value)}
                        placeholder="Tuliskan solusi detail, kontak langsung staf pelaksana, atau tanggapan dekanat..."
                        className="w-full px-3 py-2 bg-white text-slate-900 border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500 resize-none"
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-between gap-2 pt-2">
                    <p className="text-[10px] text-slate-500 leading-relaxed">
                      {selectedReport.reporterWhatsapp
                        ? "Balasan akan tersimpan di sistem, lalu jendela WhatsApp terbuka otomatis untuk Anda kirim ke pelapor."
                        : "Pelapor tidak mencantumkan nomor WhatsApp — balasan hanya tersimpan di sistem."}
                    </p>
                    <button
                      type="submit"
                      className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold cursor-pointer transition-all shrink-0"
                    >
                      Kirim Tanggapan Resmi
                    </button>
                  </div>
                </form>
                </>
                )}
              </div>
            </div>
          ) : (
            <div className="bg-slate-50 border border-slate-200/60 rounded-2xl p-16 text-center space-y-3 h-full flex flex-col items-center justify-center">
              <ClipboardList className="w-12 h-12 text-slate-400" />
              <h4 className="text-sm font-bold text-slate-800">Detail Laporan Staf</h4>
              <p className="text-xs text-slate-500 max-w-xs leading-relaxed mx-auto">
                Silakan pilih salah satu laporan dari list sebelah kiri untuk melihat rincian detail, lampiran bukti, serta melakukan tindak lanjut resmi dekanat.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
