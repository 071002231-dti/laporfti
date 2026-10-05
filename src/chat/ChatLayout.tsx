import React from "react";
import { ChatProvider, useChat } from "./ChatContext";
import { ChatSidebar } from "./ChatSidebar";
import { ChatView } from "./ChatView";
import { Award, ShieldCheck, RotateCcw, LogOut, Menu, X } from "lucide-react";

interface ChatLayoutProps {
  userEmail: string;
  userName: string;
  isAdmin: boolean;
  onLogout: () => void;
  onNavigateAdmin: () => void;
}

const ChatLayoutInner: React.FC<{
  onLogout: () => void;
}> = ({ onLogout }) => {
  const { clearChat, userName, userEmail } = useChat();
  const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false);

  return (
    <div className="flex w-full h-full max-w-[1600px] mx-auto bg-white dark:bg-[#111b21] shadow-xl overflow-hidden rounded-none sm:rounded-xl">
      {/* Desktop sidebar */}
      <ChatSidebar
        userName={userName}
        userEmail={userEmail}
        onLogout={onLogout}
        onClearChat={clearChat}
      />

      {/* Main chat area */}
      <div className="flex-1 flex flex-col relative bg-[#efeae2] dark:bg-[#0b141a] min-w-0">
        {/* Chat Header */}
        <div className="h-14 sm:h-16 flex items-center px-3 sm:px-4 bg-slate-100 dark:bg-[#202c33] border-b border-slate-200 dark:border-slate-800 shrink-0 z-10 gap-3">
          {/* Mobile menu toggle */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden text-slate-600 dark:text-slate-400 cursor-pointer"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>

          <div className="w-10 h-10 rounded-full bg-indigo-600 flex items-center justify-center shrink-0">
            <Award className="w-5 h-5 text-white" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="font-semibold text-sm text-slate-800 dark:text-slate-200">Lapor FTI</div>
            <div className="text-[10px] text-slate-500 dark:text-slate-400 flex items-center gap-1">
              <ShieldCheck className="w-3 h-3 text-emerald-500" />
              Akun Resmi — Fakultas Teknologi Industri UII
            </div>
          </div>
        </div>

        {/* Mobile dropdown menu */}
        {mobileMenuOpen && (
          <div className="absolute top-14 left-0 right-0 z-20 bg-white dark:bg-[#1a2734] border-b border-slate-200 dark:border-slate-700 shadow-lg md:hidden">
            <div className="p-3 border-b border-slate-100 dark:border-slate-800">
              <p className="text-[12px] font-semibold text-slate-800 dark:text-slate-200">{userName}</p>
              <p className="text-[10px] text-slate-500">{userEmail}</p>
            </div>
            <button
              onClick={() => { clearChat(); setMobileMenuOpen(false); }}
              className="w-full flex items-center gap-2.5 px-4 py-3 text-[12px] text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer"
            >
              <RotateCcw className="w-4 h-4" /> Reset Chat
            </button>
            <button
              onClick={onLogout}
              className="w-full flex items-center gap-2.5 px-4 py-3 text-[12px] text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/20 cursor-pointer"
            >
              <LogOut className="w-4 h-4" /> Logout
            </button>
          </div>
        )}

        {/* Chat View */}
        <ChatView />
      </div>
    </div>
  );
};

export const ChatLayout: React.FC<ChatLayoutProps> = ({
  userEmail,
  userName,
  isAdmin,
  onLogout,
  onNavigateAdmin,
}) => {
  return (
    <ChatProvider
      userEmail={userEmail}
      userName={userName}
      isAdmin={isAdmin}
      onNavigateAdmin={onNavigateAdmin}
    >
      <ChatLayoutInner onLogout={onLogout} />
    </ChatProvider>
  );
};
