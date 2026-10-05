import React, { useState } from "react";
import { Search, Calendar, Clock, AlertTriangle, Send, Shield, CornerDownRight, FileText, Download } from "lucide-react";
import { Report, ReportStatus, UrgencyLevel, ReportComment } from "../types";
import { apiUrl } from "../lib/api";

interface ReportTrackerProps {
  reports: Report[];
  searchTicketId: string;
  setSearchTicketId: (id: string) => void;
  onAddComment: (ticketId: string, comment: ReportComment) => Promise<void>;
}

export default function ReportTracker({
  reports,
  searchTicketId,
  setSearchTicketId,
  onAddComment,
}: ReportTrackerProps) {
  const [ticketInput, setTicketInput] = useState(searchTicketId);
  const [commentText, setCommentText] = useState("");
  const [studentName, setStudentName] = useState("");

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (ticketInput.trim()) {
      setSearchTicketId(ticketInput.trim().toUpperCase());
    }
  };

  // Find current active report
  const activeReport = reports.find(
    (r) => r.id === searchTicketId.trim().toUpperCase()
  );

  const handlePostComment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeReport || !commentText.trim()) return;

    const newComment: ReportComment = {
      id: "c-" + Math.random().toString(36).substr(2, 9),
      senderName: studentName.trim() || activeReport.reporterName || "Mahasiswa",
      senderRole: "Mahasiswa",
      content: commentText.trim(),
      createdAt: new Date().toISOString(),
    };

    onAddComment(activeReport.id, newComment);
    setCommentText("");
    // Persist or clear student custom comment name
  };

  // Status Badge Colors helper
  const getStatusBadge = (status: ReportStatus) => {
    switch (status) {
      case ReportStatus.MENUNGGU:
        return "bg-amber-100 text-amber-800 border-amber-200";
      case ReportStatus.DIPROSES:
        return "bg-sky-100 text-sky-800 border-sky-200";
      case ReportStatus.SELESAI:
        return "bg-emerald-100 text-emerald-800 border-emerald-200";
      case ReportStatus.DITOLAK:
        return "bg-slate-100 text-slate-800 border-slate-200";
    }
  };

  // Urgency Badge Colors helper
  const getUrgencyBadge = (urgency: UrgencyLevel) => {
    switch (urgency) {
      case UrgencyLevel.RENDAH:
        return "bg-slate-100 text-slate-700";
      case UrgencyLevel.SEDANG:
        return "bg-amber-100 text-amber-700";
      case UrgencyLevel.TINGGI:
        return "bg-rose-100 text-rose-700 font-bold";
    }
  };

  return (
    <div className="space-y-6" id="report-tracker-view">
      {/* Search Bar section */}
      <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm">
        <form onSubmit={handleSearch} className="space-y-3">
          <label className="block text-sm font-bold text-slate-800">
            Lacak Kode Tiket Laporan Anda
          </label>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <input
                type="text"
                value={ticketInput}
                onChange={(e) => setTicketInput(e.target.value)}
                placeholder="Contoh: LH-20260615-0012"
                className="w-full px-4 py-3 border border-slate-200 rounded-xl text-sm font-mono tracking-wider focus:outline-none focus:ring-2 focus:ring-indigo-500 uppercase"
                id="tracker-search-input"
              />
            </div>
            <button
              type="submit"
              className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-xl text-sm transition-all cursor-pointer flex items-center gap-1.5 shadow-sm active:scale-95"
              id="tracker-search-btn"
            >
              <Search className="w-4 h-4" />
              Lacak
            </button>
          </div>
        </form>
      </div>

      {activeReport ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6" id="active-tracked-report">
          {/* Main Details and Discussion */}
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm space-y-6">
              {/* Header Details */}
              <div className="flex flex-wrap items-start justify-between gap-4 border-b border-slate-100 pb-5">
                <div className="space-y-1.5">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-mono text-xs font-bold px-2.5 py-1 bg-slate-100 text-slate-700 rounded-lg">
                      {activeReport.id}
                    </span>
                    <span className={`text-xs px-2.5 py-1 rounded-full border font-bold ${getStatusBadge(activeReport.status)}`}>
                      {activeReport.status}
                    </span>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${getUrgencyBadge(activeReport.urgency)}`}>
                      {activeReport.urgency}
                    </span>
                  </div>
                  <h3 className="text-xl font-extrabold text-slate-900 tracking-tight mt-1">
                    {activeReport.title}
                  </h3>
                </div>

                <div className="text-xs text-slate-400 space-y-1 bg-slate-50 p-2.5 rounded-xl border border-slate-100/50">
                  <div className="flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5 text-slate-400" />
                    <span>{new Date(activeReport.createdAt).toLocaleDateString("id-ID", {
                      day: "numeric",
                      month: "long",
                      year: "numeric",
                    })}</span>
                  </div>
                </div>
              </div>

              {/* Description Content */}
              <div className="space-y-4">
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Isi Laporan / Kronologi</p>
                <p className="text-slate-700 text-sm leading-relaxed whitespace-pre-wrap">
                  {activeReport.description}
                </p>
              </div>

              {/* Attachment Preview */}
              {activeReport.attachmentName && (
                <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
                  <div className="flex items-center gap-2 text-xs font-bold text-slate-700">
                    <FileText className="w-4 h-4 text-indigo-600" />
                    <span>Lampiran Pendukung: {activeReport.attachmentName}</span>
                  </div>
                  {activeReport.attachmentPath && (
                    <div className="mt-2 space-y-2">
                      {/\.(png|jpe?g|gif|webp)$/i.test(activeReport.attachmentName || "") ? (
                        <a 
                          href={apiUrl(`uploads/${activeReport.attachmentPath}`)} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="block max-w-md rounded-lg overflow-hidden border border-slate-200 shadow-sm bg-white p-1 hover:border-indigo-400 transition-colors cursor-pointer"
                        >
                          <img
                            src={apiUrl(`uploads/${activeReport.attachmentPath}`)}
                            alt="Lampiran pendukung"
                            className="w-full max-h-60 object-contain rounded"
                            referrerPolicy="no-referrer"
                          />
                        </a>
                      ) : (
                        <div className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50 border border-indigo-100 text-indigo-700 rounded-lg text-xs font-medium">
                          File lampiran bertipe dokumen
                        </div>
                      )}
                      <div className="flex">
                        <a
                          href={apiUrl(`uploads/${activeReport.attachmentPath}`)}
                          target="_blank"
                          rel="noopener noreferrer"
                          download={activeReport.attachmentName}
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

              {/* Informative footer */}
              <div className="text-[10px] text-slate-400 border-t border-slate-100 pt-3 flex flex-wrap justify-between gap-2">
                <span>Pelapor: {activeReport.reporterName} • {activeReport.isPublic ? "Publik" : "Rahasia/Privat"}</span>
                <span>Terakhir diperbarui: {new Date(activeReport.updatedAt).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })} WIB</span>
              </div>
            </div>

            {/* Discussion & Comments Area */}
            <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm space-y-6">
              <h4 className="text-sm font-extrabold text-slate-900 border-b border-slate-100 pb-3 flex items-center gap-2">
                <span>Diskusi & Tanggapan Terkait</span>
                <span className="px-2 py-0.5 bg-indigo-100 text-indigo-700 rounded-full text-xs font-extrabold">
                  {activeReport.comments.length}
                </span>
              </h4>

              {activeReport.comments.length === 0 ? (
                <div className="py-8 text-center text-slate-400 space-y-1">
                  <p className="text-sm font-medium">Belum ada diskusi atau tanggapan resmi.</p>
                  <p className="text-xs">Staf admin atau Anda dapat menambahkan tanggapan di bawah ini.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {activeReport.comments.map((comment) => {
                    const isAdmin = comment.senderRole === "Admin";
                    return (
                      <div
                        key={comment.id}
                        className={`flex gap-3 items-start p-4 rounded-xl border ${
                          isAdmin
                            ? "bg-indigo-50/50 border-indigo-100/70 ml-0 mr-4 md:mr-8"
                            : "bg-slate-50/30 border-slate-100 ml-4 md:ml-8 mr-0"
                        }`}
                      >
                        <div
                          className={`w-9 h-9 rounded-full font-bold flex items-center justify-center text-xs text-white flex-shrink-0 ${
                            isAdmin ? "bg-indigo-700" : "bg-emerald-600"
                          }`}
                        >
                          {isAdmin ? <Shield className="w-4 h-4" /> : comment.senderName.substring(0, 2).toUpperCase()}
                        </div>
                        <div className="space-y-1.5 flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-1.5">
                              <span className="text-xs font-extrabold text-slate-900 truncate">
                                {comment.senderName}
                              </span>
                              {isAdmin && (
                                <span className="px-1.5 py-0.5 bg-indigo-600 text-white rounded text-[9px] font-bold uppercase tracking-wider">
                                  Respon Resmi
                                </span>
                              )}
                            </div>
                            <span className="text-[10px] text-slate-400 flex-shrink-0">
                              {new Date(comment.createdAt).toLocaleDateString("id-ID", {
                                day: "numeric",
                                month: "short",
                                hour: "2-digit",
                                minute: "2-digit",
                              })}
                            </span>
                          </div>
                          <p className="text-slate-700 text-sm leading-relaxed whitespace-pre-wrap">
                            {comment.content}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Post Comment Form */}
              <form onSubmit={handlePostComment} className="border-t border-slate-100 pt-4 space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="block text-[10px] font-bold text-slate-500 uppercase">Nama Anda</label>
                    <input
                      type="text"
                      value={studentName}
                      onChange={(e) => setStudentName(e.target.value)}
                      placeholder={activeReport.reporterName === "Anonim" ? "Nama Samaran / Mahasiswa" : activeReport.reporterName}
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="block text-[10px] font-bold text-slate-500 uppercase">Pesan Tanggapan / Pertanyaan Lanjutan</label>
                  <div className="flex gap-2">
                    <textarea
                      rows={2}
                      value={commentText}
                      onChange={(e) => setCommentText(e.target.value)}
                      placeholder="Ketik balasan atau pertanyaan konfirmasi di sini..."
                      className="flex-1 px-3 py-2 border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500 resize-none"
                    />
                    <button
                      type="submit"
                      className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg flex items-center justify-center cursor-pointer transition-all flex-shrink-0 self-end h-9"
                    >
                      <Send className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </form>
            </div>
          </div>

          {/* Sidebar Ticket Timeline */}
          <div className="space-y-6">
            <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm space-y-6">
              <h4 className="text-sm font-extrabold text-slate-900 border-b border-slate-100 pb-3 flex items-center gap-1.5">
                <Clock className="w-4 h-4 text-indigo-600" />
                Siklus & Progres Penanganan
              </h4>

              {/* Timeline dot flow */}
              <div className="relative pl-6 space-y-6 border-l-2 border-slate-100 pb-2">
                {activeReport.timeline.map((step, index) => {
                  const isLast = index === activeReport.timeline.length - 1;
                  return (
                    <div key={index} className="relative">
                      {/* Timeline Dot */}
                      <span
                        className={`absolute -left-[31px] top-1 w-4 h-4 rounded-full border-2 bg-white flex items-center justify-center ${
                          isLast
                            ? "border-emerald-500 text-emerald-500 ring-4 ring-emerald-50"
                            : "border-indigo-500 text-indigo-500"
                        }`}
                      >
                        <span className={`w-1.5 h-1.5 rounded-full ${isLast ? "bg-emerald-500" : "bg-indigo-500"}`}></span>
                      </span>

                      {/* Content */}
                      <div className="space-y-1">
                        <div className="flex items-center justify-between gap-2">
                          <span className={`text-xs font-bold ${isLast ? "text-slate-900" : "text-slate-500"}`}>
                            {step.status}
                          </span>
                          <span className="text-[9px] text-slate-400 whitespace-nowrap font-mono">
                            {new Date(step.timestamp).toLocaleDateString("id-ID", {
                              day: "numeric",
                              month: "short",
                            })}
                          </span>
                        </div>
                        <p className="text-slate-600 text-xs leading-relaxed">
                          {step.note}
                        </p>
                        {step.actorName && (
                          <p className="text-slate-400 text-[10px] font-semibold">
                            — {step.actorName}
                          </p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Informational Guidelines Card inside sidebar */}
              <div className="bg-indigo-50/50 p-4 rounded-xl border border-indigo-100/50 space-y-2">
                <span className="text-indigo-900 text-xs font-bold block">Status Arti Penanganan:</span>
                <ul className="text-[10px] text-slate-600 space-y-2 leading-relaxed">
                  <li>
                    <strong className="text-slate-900">Menunggu Verifikasi:</strong> Laporan baru diterima sistem dan sedang divalidasi oleh dekanat.
                  </li>
                  <li>
                    <strong className="text-slate-900">Sedang Diproses:</strong> Laporan diteruskan ke divisi / unit terkait untuk penanganan di lapangan.
                  </li>
                  <li>
                    <strong className="text-slate-900">Selesai:</strong> Rekomendasi/perbaikan telah diselesaikan dan laporan dinyatakan ditutup.
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-slate-50 rounded-2xl p-12 text-center border border-slate-200/60 max-w-xl mx-auto space-y-3" id="no-report-tracked">
          <AlertTriangle className="w-10 h-10 text-amber-500 mx-auto" />
          <h4 className="text-base font-bold text-slate-800">Lacak Aduan Anda</h4>
          <p className="text-xs text-slate-500 leading-relaxed">
            Silakan masukkan Kode Tiket aduan Anda (contoh: <span className="font-mono text-indigo-700 bg-indigo-50 px-1.5 py-0.5 rounded font-bold">LH-20260615-0012</span>) pada form pencarian di atas untuk memantau siklus penanganan laporan.
          </p>
        </div>
      )}
    </div>
  );
}
