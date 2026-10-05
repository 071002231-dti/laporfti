import React, { useState, useEffect } from "react";
import { AdminRole, Report, ReportStatus, ReportComment } from "./types";
import * as api from "./lib/api";
import AdminPanel from "./components/AdminPanel";
import { LoginGateChatbot } from "./chat/LoginGateChatbot";
import { ChatLayout } from "./chat/ChatLayout";
import { Division } from "./lib/divisions";

type AuthState = {
  status: "loading" | "authenticated" | "unauthenticated";
  email?: string;
  name?: string;
  role?: AdminRole;
  division?: Division;
  impersonating?: boolean;
  impersonatedBy?: string;
};

const AUTH_ERROR_MESSAGES: Record<string, string> = {
  domain_not_allowed: "Login gagal: portal ini hanya untuk civitas akademika UII.",
  missing_code: "Login gagal: proses OAuth tidak lengkap. Silakan coba lagi.",
  no_id_token: "Login gagal: Google tidak mengembalikan token identitas. Silakan coba lagi.",
  no_email: "Login gagal: akun Google Anda tidak memiliki email yang dapat diverifikasi.",
  oauth_failed: "Login gagal karena kesalahan teknis. Silakan coba lagi.",
};

export default function App() {
  const [auth, setAuth] = useState<AuthState>({ status: "loading" });
  const [authErrorMsg, setAuthErrorMsg] = useState<string | null>(null);
  const [reports, setReports] = useState<Report[]>([]);
  
  // When true, force showing the AdminPanel even if we are in a chatbot layout
  const [viewingAdmin, setViewingAdmin] = useState(false);

  const refreshReports = async () => {
    const data = await api.getReports();
    setReports(data);
  };

  const refreshAuth = async () => {
    const me = await api.getMe();
    setAuth(
      me.authenticated
        ? {
            status: "authenticated",
            email: me.email,
            name: me.name,
            role: me.role,
            division: me.division,
            impersonating: me.impersonating,
            impersonatedBy: me.impersonatedBy,
          }
        : { status: "unauthenticated" }
    );
  };

  useEffect(() => {
    refreshAuth();

    const params = new URLSearchParams(window.location.search);
    const authError = params.get("authError");
    if (authError) {
      setAuthErrorMsg(AUTH_ERROR_MESSAGES[authError] || "Login gagal. Silakan coba lagi.");
      params.delete("authError");
      const newSearch = params.toString();
      window.history.replaceState({}, "", window.location.pathname + (newSearch ? `?${newSearch}` : ""));
    }
  }, []);

  const isLoggedIn = auth.status === "authenticated";
  const isAdmin = isLoggedIn && !!auth.role;

  // Fetch reports when admin view is opened or logged in as admin
  useEffect(() => {
    if (isLoggedIn && isAdmin) {
      refreshReports();
    }
  }, [isLoggedIn, isAdmin]);

  const handleRequestLogin = () => {
    window.location.href = api.apiUrl("api/auth/google/start");
  };

  const handleDevLogin = async () => {
    await api.devLogin();
    await refreshAuth();
  };

  const handleLogout = async () => {
    await api.logout();
    setViewingAdmin(false);
    setReports([]);
    await refreshAuth();
  };

  const handleEndImpersonation = async () => {
    await api.endImpersonation();
    setReports([]);
    await refreshAuth();
  };

  const handleUpdateStatusAndNote = async (ticketId: string, status: ReportStatus, note: string) => {
    await api.updateReportStatus(ticketId, status, note);
    await refreshReports();
  };

  const handleAddComment = async (ticketId: string, comment: ReportComment) => {
    await api.addComment(ticketId, comment);
    await refreshReports();
  };

  if (auth.status === "loading") {
    return <div className="min-h-screen bg-[#efeae2] dark:bg-[#0b141a]" />;
  }

  if (auth.status === "unauthenticated") {
    return (
      <LoginGateChatbot
        onLogin={handleRequestLogin}
        onDevLogin={handleDevLogin}
        errorMsg={authErrorMsg}
        onDismissError={() => setAuthErrorMsg(null)}
      />
    );
  }

  // Render AdminPanel if explicitly viewing admin (e.g. they clicked "Panel Admin" in chat)
  if (viewingAdmin && isAdmin) {
    return (
      <div className="min-h-screen bg-slate-50/70 p-4 sm:p-6 lg:p-8 font-sans">
        <div className="w-full max-w-6xl mx-auto space-y-6">
          <div className="flex justify-between items-center bg-white p-4 rounded-xl shadow-sm border border-slate-200">
            <h2 className="font-semibold text-slate-800">Panel Admin Lapor FTI</h2>
            <button
              onClick={() => setViewingAdmin(false)}
              className="text-sm font-medium text-indigo-600 hover:text-indigo-800 cursor-pointer"
            >
              &larr; Kembali ke Chatbot
            </button>
          </div>

          <AdminPanel
            reports={reports}
            adminRole={auth.role}
            adminEmail={auth.email}
            adminDivision={auth.division}
            onUpdateStatus={handleUpdateStatusAndNote}
            onAddComment={handleAddComment}
            onRefreshReports={refreshReports}
            onRefreshAuth={refreshAuth}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="h-[100dvh] w-screen overflow-hidden bg-[#efeae2] dark:bg-[#0b141a] sm:p-4 md:p-6 lg:p-8 flex items-center justify-center font-sans">
      <div className="w-full h-full max-w-[1600px] shadow-2xl relative rounded-none sm:rounded-xl overflow-hidden flex flex-col">
        {auth.impersonating && (
          <div className="bg-amber-50 border-b border-amber-300 text-amber-900 px-4 py-2 text-xs font-semibold flex items-center justify-between shrink-0 z-50">
            <span>
              Diimpersonasi oleh {auth.impersonatedBy} sebagai {auth.email}
            </span>
            <button
              onClick={handleEndImpersonation}
              className="bg-amber-600 hover:bg-amber-700 text-white px-3 py-1 rounded cursor-pointer"
            >
              Akhiri Impersonasi
            </button>
          </div>
        )}

        <ChatLayout
          userEmail={auth.email || ""}
          userName={auth.name || "Civitas Akademika"}
          isAdmin={isAdmin}
          onLogout={handleLogout}
          onNavigateAdmin={() => setViewingAdmin(true)}
        />
      </div>
    </div>
  );
}
