import React, { useState, useRef, useEffect } from "react";
import { Send, Paperclip, X } from "lucide-react";
import { useChat } from "./ChatContext";

export const ChatInput: React.FC = () => {
  const { handleUserInput, isLoading, wizard } = useChat();
  const [input, setInput] = useState("");
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleSubmit = () => {
    const trimmed = input.trim();
    if (!trimmed || isLoading) return;
    handleUserInput(trimmed);
    setInput("");
    // Reset textarea height
    if (inputRef.current) {
      inputRef.current.style.height = "auto";
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handleTextareaChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);
    // Auto-resize
    const el = e.target;
    el.style.height = "auto";
    el.style.height = Math.min(el.scrollHeight, 150) + "px";
  };

  const placeholder = wizard
    ? getWizardPlaceholder(wizard.step)
    : "Ketik pesan aduan Anda di sini...";

  return (
    <div className="px-3 sm:px-4 py-4 sm:py-5 shrink-0 bg-transparent w-full">
      {/* Wizard indicator */}
      {wizard && (
        <div className="flex items-center justify-between mb-3 px-2">
          <span className="text-[11px] font-bold text-indigo-700 dark:text-indigo-400 uppercase tracking-wider bg-indigo-50 dark:bg-indigo-900/30 px-3 py-1.5 rounded-full border border-indigo-100 dark:border-indigo-800 shadow-sm flex items-center gap-1.5">
            <span className="animate-pulse">📝</span> Membuat aduan — {getStepLabel(wizard.step)}
          </span>
          <button
            onClick={() => handleUserInput("batal")}
            className="text-[11px] text-rose-600 hover:text-white font-bold flex items-center gap-1 cursor-pointer bg-rose-50 hover:bg-rose-500 dark:bg-rose-950/40 dark:hover:bg-rose-600 px-3 py-1.5 rounded-full shadow-sm transition-colors"
          >
            <X className="w-3.5 h-3.5" /> Batal
          </button>
        </div>
      )}

      <div className="flex items-end gap-3">
        <div className="flex-1 bg-white dark:bg-[#2a3942] rounded-[20px] border-2 border-slate-200 dark:border-slate-600 px-5 py-3.5 flex items-end gap-2 shadow-[0_4px_15px_-3px_rgba(0,0,0,0.05)] focus-within:border-indigo-500 focus-within:ring-4 focus-within:ring-indigo-500/20 transition-all duration-200 group">
          <textarea
            ref={inputRef}
            value={input}
            onChange={handleTextareaChange}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            rows={1}
            disabled={isLoading}
            className="flex-1 bg-transparent text-[14.5px] text-slate-800 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 resize-none outline-none max-h-40 leading-relaxed"
          />
        </div>
        <button
          onClick={handleSubmit}
          disabled={!input.trim() || isLoading}
          className={`w-[52px] h-[52px] rounded-2xl flex items-center justify-center transition-all duration-200 shrink-0 cursor-pointer border ${
            input.trim() && !isLoading
              ? "bg-indigo-600 border-indigo-500 hover:bg-indigo-700 hover:border-indigo-600 hover:scale-[1.02] active:scale-[0.97] text-white shadow-[0_8px_20px_-6px_rgba(79,70,229,0.5)]"
              : "bg-slate-100 border-slate-200 dark:bg-slate-800 dark:border-slate-700 text-slate-400 dark:text-slate-600"
          }`}
        >
          <Send className={`w-5 h-5 ml-0.5 ${input.trim() && !isLoading ? "text-white" : "text-slate-400"}`} />
        </button>
      </div>
    </div>
  );
};

function getStepLabel(step: string): string {
  const map: Record<string, string> = {
    category: "Kategori",
    title: "Judul",
    description: "Deskripsi",
    urgency: "Urgensi",
    identity: "Identitas",
    "identity-role": "Peran",
    visibility: "Visibilitas",
    attachment: "Lampiran",
    confirm: "Konfirmasi",
  };
  return map[step] || step;
}

function getWizardPlaceholder(step: string): string {
  const map: Record<string, string> = {
    category: "Pilih kategori dari opsi di atas...",
    title: "Tulis judul aduan (min. 10 karakter)...",
    description: "Jelaskan detail aduan secara lengkap (min. 30 karakter)...",
    urgency: "Ketik tingkat urgensi...",
    identity: "Ketik 'nama' atau 'anonim'...",
    "identity-role": "Ketik peran Anda (contoh: 'mahasiswa')...",
    visibility: "Ketik 'publik' atau 'privat'...",
    attachment: "Ketik 'lewati' untuk melanjutkan...",
    confirm: "Ketik 'kirim' untuk memproses aduan...",
  };
  return map[step] || "Ketik pesan...";
}
