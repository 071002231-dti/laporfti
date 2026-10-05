import React from "react";
import { Clock, Tag, AlertTriangle, User, Eye, EyeOff, ChevronDown, ChevronUp, MessageSquare } from "lucide-react";
import type { Report, ReportStatus } from "../types";

const STATUS_STYLES: Record<string, { bg: string; text: string; dot: string }> = {
  "Menunggu Verifikasi": { bg: "bg-amber-50 dark:bg-amber-950/30", text: "text-amber-700 dark:text-amber-400", dot: "bg-amber-400" },
  "Sedang Diproses": { bg: "bg-blue-50 dark:bg-blue-950/30", text: "text-blue-700 dark:text-blue-400", dot: "bg-blue-400" },
  "Selesai Ditindaklanjuti": { bg: "bg-emerald-50 dark:bg-emerald-950/30", text: "text-emerald-700 dark:text-emerald-400", dot: "bg-emerald-400" },
  "Laporan Diarsipkan": { bg: "bg-slate-50 dark:bg-slate-800", text: "text-slate-600 dark:text-slate-400", dot: "bg-slate-400" },
};

interface TicketCardProps {
  report: Report;
  compact?: boolean;
  onModerate?: () => void;
}

export const TicketCard: React.FC<TicketCardProps> = ({ report, compact = false, onModerate }) => {
  const [expanded, setExpanded] = React.useState(!compact);
  const style = STATUS_STYLES[report.status] || STATUS_STYLES["Menunggu Verifikasi"];

  return (
    <div className="bg-white dark:bg-[#1a2734] border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden shadow-sm">
      {/* Header */}
      <div
        className={`px-4 py-3 flex items-center justify-between ${compact ? "cursor-pointer" : ""}`}
        onClick={compact ? () => setExpanded(!expanded) : undefined}
      >
        <div className="flex items-center gap-2 min-w-0">
          <span className="font-mono text-[11px] font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/40 px-2 py-0.5 rounded-md shrink-0">
            {report.id}
          </span>
          <span className={`inline-flex items-center gap-1.5 text-[10px] font-semibold px-2 py-0.5 rounded-full ${style.bg} ${style.text}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${style.dot}`} />
            {report.status}
          </span>
        </div>
        {compact && (
          <button className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 cursor-pointer">
            {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        )}
      </div>

      {/* Body */}
      {expanded && (
        <div className="px-4 pb-3 space-y-2.5 border-t border-slate-100 dark:border-slate-800 pt-2.5">
          <h4 className="text-[13px] font-semibold text-slate-800 dark:text-slate-200">{report.title}</h4>

          <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-[11px]">
            <div className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400">
              <Tag className="w-3 h-3" /> {report.category}
            </div>
            <div className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400">
              <AlertTriangle className="w-3 h-3" /> {report.urgency}
            </div>
            <div className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400">
              <User className="w-3 h-3" /> {report.reporterName}
            </div>
            <div className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400">
              {report.isPublic ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
              {report.isPublic ? "Publik" : "Privat"}
            </div>
            <div className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400 col-span-2">
              <Clock className="w-3 h-3" />
              {new Date(report.createdAt).toLocaleDateString("id-ID", {
                day: "numeric",
                month: "long",
                year: "numeric",
                hour: "2-digit",
                minute: "2-digit",
              })}
            </div>
          </div>

          {/* Timeline */}
          {report.timeline && report.timeline.length > 0 && (
            <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
              <p className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">
                Timeline
              </p>
              <div className="space-y-2">
                {report.timeline.map((t, i) => (
                  <div key={i} className="flex gap-2.5">
                    <div className="flex flex-col items-center">
                      <div className={`w-2 h-2 rounded-full mt-1 ${
                        i === report.timeline.length - 1 ? "bg-indigo-500" : "bg-slate-300 dark:bg-slate-600"
                      }`} />
                      {i < report.timeline.length - 1 && (
                        <div className="w-px flex-1 bg-slate-200 dark:bg-slate-700 mt-1" />
                      )}
                    </div>
                    <div className="pb-2 min-w-0">
                      <p className="text-[11px] font-semibold text-slate-700 dark:text-slate-300">{t.status}</p>
                      <p className="text-[10px] text-slate-500 dark:text-slate-400 leading-relaxed">{t.note}</p>
                      <p className="text-[9px] text-slate-400 dark:text-slate-500 mt-0.5">
                        {new Date(t.timestamp).toLocaleString("id-ID")}
                        {t.actorName && ` · ${t.actorName}`}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Comments count */}
          {report.comments && report.comments.length > 0 && (
            <div className="flex items-center gap-1.5 text-[11px] text-slate-500 dark:text-slate-400 pt-1">
              <MessageSquare className="w-3 h-3" />
              {report.comments.length} komentar
            </div>
          )}

          {/* Moderation Button */}
          {onModerate && (
            <div className="pt-2 mt-2">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onModerate();
                }}
                className="w-full flex items-center justify-center gap-2 bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-900/30 dark:hover:bg-indigo-900/50 text-indigo-700 dark:text-indigo-400 font-semibold text-[12px] py-2 rounded-lg transition-colors cursor-pointer"
              >
                ⚡ Proses Aduan Ini
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
