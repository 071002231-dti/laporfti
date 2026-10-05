import React from "react";
import { Award, LogIn, Building2, FlaskConical, ShieldCheck } from "lucide-react";

interface LoginGateProps {
  onLogin: () => void;
  onDevLogin?: () => void;
  errorMsg?: string | null;
  onDismissError?: () => void;
}

function isLocalhost(): boolean {
  const host = window.location.hostname;
  return host === "localhost" || host === "127.0.0.1";
}

export const LoginGateChatbot: React.FC<LoginGateProps> = ({
  onLogin,
  onDevLogin,
  errorMsg,
  onDismissError,
}) => {
  return (
    <div className="min-h-screen bg-[#efeae2] dark:bg-[#0b141a] flex items-center justify-center p-4 sm:p-6 font-sans">
      <div className="w-full max-w-md bg-white dark:bg-[#111b21] rounded-2xl shadow-xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="bg-slate-100 dark:bg-[#202c33] px-6 py-8 flex flex-col items-center justify-center border-b border-slate-200 dark:border-slate-800">
          <div className="w-16 h-16 bg-indigo-600 rounded-full flex items-center justify-center shadow-lg mb-4">
            <Award className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100 mb-1">
            Lapor FTI Chatbot
          </h1>
          <p className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider flex items-center gap-1.5">
            <Building2 className="w-3.5 h-3.5" /> Fakultas Teknologi Industri UII
          </p>
        </div>

        {/* Body */}
        <div className="p-6 sm:p-8 flex flex-col gap-6">
          {errorMsg && (
            <div className="bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900 text-rose-800 dark:text-rose-400 px-4 py-3 rounded-xl text-xs font-semibold flex items-center justify-between gap-3 text-left">
              <span>{errorMsg}</span>
              {onDismissError && (
                <button
                  onClick={onDismissError}
                  className="text-rose-500 hover:text-rose-800 dark:hover:text-rose-300 font-bold text-lg leading-none cursor-pointer shrink-0"
                >
                  ×
                </button>
              )}
            </div>
          )}

          <div className="text-center space-y-3">
            <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
              Portal aspirasi dan keluhan resmi FTI UII dengan antarmuka percakapan.
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-500">
              Gunakan akun Google UII Anda (<span className="font-mono bg-slate-100 dark:bg-slate-800 px-1 rounded">@uii.ac.id</span> /{" "}
              <span className="font-mono bg-slate-100 dark:bg-slate-800 px-1 rounded">@students.uii.ac.id</span>) untuk melanjutkan.
            </p>
          </div>

          <div className="space-y-3 pt-2">
            <button
              onClick={onLogin}
              className="w-full px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-semibold text-sm transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer"
            >
              <LogIn className="w-4 h-4" />
              Masuk dengan Google
            </button>

            {import.meta.env.DEV && onDevLogin && isLocalhost() && (
              <button
                onClick={onDevLogin}
                className="w-full px-6 py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl font-semibold text-xs transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <FlaskConical className="w-3.5 h-3.5" />
                [Dev] Simulasi Login Pelapor
              </button>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-slate-50 dark:bg-[#1a2734] border-t border-slate-200 dark:border-slate-800 text-[10px] text-center text-slate-400 dark:text-slate-500 flex flex-col items-center gap-1">
          <ShieldCheck className="w-4 h-4 text-emerald-500 mb-1" />
          <p>Terkoneksi dengan sistem Lapor FTI (Backend)</p>
        </div>
      </div>
    </div>
  );
};
