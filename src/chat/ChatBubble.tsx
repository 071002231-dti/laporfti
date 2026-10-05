import React, { useRef, useState } from "react";
import { ShieldCheck, UploadCloud, File as FileIcon, X, Loader2 } from "lucide-react";
import type { ChatMessage } from "./types";
import { QuickActionGrid } from "./QuickActionGrid";
import { TicketCard } from "./TicketCard";
import { useChat } from "./ChatContext";

function renderInline(text: string): React.ReactNode[] {
  return text.split(/(\*\*[^*]+\*\*|`[^`]+`)/g).map((part, idx) => {
    if (part.length > 4 && part.startsWith("**") && part.endsWith("**")) {
      return <strong key={idx} className="font-semibold">{part.slice(2, -2)}</strong>;
    }
    if (part.length > 2 && part.startsWith("`") && part.endsWith("`")) {
      return (
        <code key={idx} className="px-1 py-0.5 rounded bg-slate-200/70 dark:bg-slate-700/70 font-mono text-[11px]">
          {part.slice(1, -1)}
        </code>
      );
    }
    const URL_PATTERN = /(https?:\/\/[^\s<>()]*[^\s<>().,;:!?'"])/g;
    return part.split(URL_PATTERN).map((chunk, cIdx) =>
      cIdx % 2 === 1 ? (
        <a key={`${idx}-${cIdx}`} href={chunk} target="_blank" rel="noopener noreferrer"
           className="underline underline-offset-2 text-blue-600 dark:text-blue-400 hover:text-blue-800">
          {chunk}
        </a>
      ) : (
        <React.Fragment key={`${idx}-${cIdx}`}>{chunk}</React.Fragment>
      )
    );
  });
}

function renderMarkdown(text: string): React.ReactNode[] {
  return text.split("\n").map((line, i) => (
    <React.Fragment key={i}>
      {i > 0 && <br />}
      {renderInline(line)}
    </React.Fragment>
  ));
}

interface ChatBubbleProps {
  message: ChatMessage;
}

export const ChatBubble: React.FC<ChatBubbleProps> = ({ message }) => {
  const { handleQuickAction, handleSuggestion, handleFileUpload, startModeration, isAdmin } = useChat();
  const isBot = message.sender === "bot";
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const onFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      setUploadError("Ukuran file maksimal 2MB.");
      return;
    }
    
    setUploadError(null);
    setIsUploading(true);
    
    try {
      if (handleFileUpload) {
        await handleFileUpload(file);
      }
    } catch (err: any) {
      setUploadError(err.message || "Gagal mengupload file");
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className={`flex ${isBot ? "justify-start" : "justify-end"} mb-4 animate-[fadeInUp_0.25s_ease-out] w-full`}>
      <div className={`w-full max-w-[85%] sm:max-w-[75%] ${isBot ? "" : "flex justify-end"}`}>
        <div
          className={`rounded-2xl px-5 py-3.5 text-[14px] leading-relaxed shadow-[0_2px_10px_-4px_rgba(0,0,0,0.1)] inline-block ${
            isBot
              ? "bg-white dark:bg-[#202c33] text-slate-800 dark:text-slate-200 rounded-tl-md border border-slate-100 dark:border-slate-800/50"
              : "bg-indigo-600 text-white rounded-tr-md"
          }`}
        >
          {isBot && (
            <div className="flex items-center gap-2 mb-2">
              <div className="w-5 h-5 rounded-full bg-indigo-600 flex items-center justify-center shadow-sm">
                <ShieldCheck className="w-3 h-3 text-white" />
              </div>
              <span className="text-[11px] font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider">
                Lapor FTI
              </span>
            </div>
          )}
          <div className="whitespace-pre-wrap">{renderMarkdown(message.content)}</div>
          
          <div className={`text-[11px] mt-2 ${isBot ? "text-slate-400" : "text-indigo-200"} text-right font-medium`}>
            {message.timestamp}
          </div>
        </div>

        {message.component === "file-upload" && (
          <div className="mt-3 bg-white dark:bg-[#202c33] border-2 border-dashed border-indigo-200 dark:border-indigo-900 rounded-2xl p-6 text-center hover:bg-indigo-50/50 dark:hover:bg-indigo-950/20 transition-colors cursor-pointer group" onClick={() => fileInputRef.current?.click()}>
            <input type="file" ref={fileInputRef} className="hidden" accept="image/jpeg,image/png,image/gif,image/webp,application/pdf" onChange={onFileSelect} disabled={isUploading} />
            <div className="w-12 h-12 rounded-full bg-indigo-50 dark:bg-indigo-900/40 flex items-center justify-center mx-auto mb-3 group-hover:scale-110 transition-transform">
              {isUploading ? <Loader2 className="w-6 h-6 text-indigo-500 animate-spin" /> : <UploadCloud className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />}
            </div>
            <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">
              {isUploading ? "Mengunggah..." : "Klik untuk memilih file"}
            </p>
            <p className="text-xs text-slate-500 mt-1">Mendukung PDF, JPG, PNG (Maks. 2MB)</p>
            {uploadError && <p className="text-xs text-rose-500 mt-2 font-medium">{uploadError}</p>}
          </div>
        )}

        {message.ticketCard && (
          <div className="mt-3">
            <TicketCard 
              report={message.ticketCard} 
              onModerate={isAdmin && (message.ticketCard.status === "Menunggu Verifikasi" || message.ticketCard.category === "Lainnya" || message.ticketCard.moderationStatus === "PENDING") ? () => startModeration(message.ticketCard!) : undefined} 
            />
          </div>
        )}

        {message.ticketList && message.ticketList.length > 0 && (
          <div className="mt-3 space-y-3 max-h-96 overflow-y-auto pr-2">
            {message.ticketList.map((r) => (
              <TicketCard 
                key={r.id} 
                report={r} 
                compact 
                onModerate={isAdmin && (r.status === "Menunggu Verifikasi" || r.category === "Lainnya" || r.moderationStatus === "PENDING") ? () => startModeration(r) : undefined}
              />
            ))}
          </div>
        )}

        {message.quickActions && message.quickActions.length > 0 && (
          <div className="mt-4">
            <QuickActionGrid actions={message.quickActions} onAction={handleQuickAction} />
          </div>
        )}

        {message.suggestions && message.suggestions.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-2">
            {message.suggestions.map((s) => (
              <button
                key={s}
                onClick={() => handleSuggestion(s)}
                className="px-4 py-2 text-[12px] font-semibold bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-full text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 hover:border-indigo-200 dark:hover:bg-slate-700 transition-all cursor-pointer shadow-sm active:scale-95"
              >
                {s}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
