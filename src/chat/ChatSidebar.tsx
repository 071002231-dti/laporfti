import React from "react";
import { Award, RotateCcw, LogOut, Moon, Sun } from "lucide-react";

interface ChatSidebarProps {
  userName: string;
  userEmail: string;
  onLogout: () => void;
  onClearChat: () => void;
}

export const ChatSidebar: React.FC<ChatSidebarProps> = ({
  userName,
  userEmail,
  onLogout,
  onClearChat,
}) => {
  const initials = (userName || userEmail || "U")
    .split(" ")
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  return (
    <div className="w-[300px] min-w-[280px] border-r border-slate-200 dark:border-slate-800 flex flex-col bg-slate-50 dark:bg-[#111b21] hidden md:flex">
      {/* Header */}
      <div className="h-16 flex items-center px-4 bg-slate-100 dark:bg-[#202c33] border-b border-slate-200 dark:border-slate-800 shrink-0">
        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white text-sm font-bold shrink-0">
          {initials}
        </div>
        <div className="ml-3 min-w-0 flex-1">
          <p className="text-sm font-semibold text-slate-800 dark:text-slate-200 truncate">{userName}</p>
          <p className="text-[10px] text-slate-500 dark:text-slate-400 truncate">{userEmail}</p>
        </div>
      </div>

      {/* Search placeholder */}
      <div className="p-2 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111b21]">
        <div className="bg-slate-100 dark:bg-[#202c33] rounded-lg px-3 py-2 text-[12px] text-slate-400">
          Lapor FTI Chatbot
        </div>
      </div>

      {/* Channel */}
      <div className="flex-1 overflow-y-auto">
        <div className="flex items-center p-3 bg-slate-100 dark:bg-[#2a3942] border-l-4 border-indigo-500">
          <div className="w-12 h-12 rounded-full bg-indigo-600 flex items-center justify-center shrink-0">
            <Award className="w-6 h-6 text-white" />
          </div>
          <div className="ml-3 flex-1 min-w-0">
            <div className="flex justify-between items-center">
              <span className="font-semibold text-[13px] text-slate-900 dark:text-slate-200">Lapor FTI</span>
              <span className="text-[10px] text-emerald-500 font-medium">Online</span>
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
              Portal aspirasi & keluhan FTI UII
            </p>
          </div>
        </div>
      </div>

      {/* Bottom actions */}
      <div className="border-t border-slate-200 dark:border-slate-800 p-3 space-y-1.5">
        <button
          onClick={onClearChat}
          className="w-full flex items-center gap-2.5 px-3 py-2 text-[11px] font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          Reset Chat
        </button>
        <button
          onClick={onLogout}
          className="w-full flex items-center gap-2.5 px-3 py-2 text-[11px] font-medium text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/20 rounded-lg transition-colors cursor-pointer"
        >
          <LogOut className="w-3.5 h-3.5" />
          Logout
        </button>
      </div>
    </div>
  );
};
