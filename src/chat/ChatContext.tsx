import React, { createContext, useContext, useReducer, useCallback, useRef } from "react";
import type { ChatMessage, WizardState, WizardStep } from "./types";
import type { Report } from "../types";
import { ReportCategory, UrgencyLevel, ReporterRole, ReportStatus } from "../types";
import * as api from "../lib/api";

function uid() {
  return "msg-" + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

function ts() {
  return new Date().toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" });
}

interface ChatState {
  messages: ChatMessage[];
  wizard: WizardState | null;
  isLoading: boolean;
}

type Action =
  | { type: "ADD_MESSAGE"; message: ChatMessage }
  | { type: "SET_LOADING"; loading: boolean }
  | { type: "START_WIZARD" }
  | { type: "START_MODERATION"; report: Report }
  | { type: "ADVANCE_WIZARD"; step: WizardStep; data: Partial<WizardState["data"]> }
  | { type: "CANCEL_WIZARD" }
  | { type: "COMPLETE_WIZARD" }
  | { type: "CLEAR" };

function reducer(state: ChatState, action: Action): ChatState {
  switch (action.type) {
    case "ADD_MESSAGE":
      return { ...state, messages: [...state.messages, action.message] };
    case "SET_LOADING":
      return { ...state, isLoading: action.loading };
    case "START_WIZARD":
      return { ...state, wizard: { type: "CREATE_REPORT", step: "category", data: {} } };
    case "START_MODERATION":
      return { 
        ...state, 
        wizard: { 
          type: "MODERATE_REPORT", 
          step: "mod_category", 
          data: { reportId: action.report.id, currentCategory: action.report.category } 
        } 
      };
    case "ADVANCE_WIZARD":
      if (!state.wizard) return state;
      return {
        ...state,
        wizard: { ...state.wizard, step: action.step, data: { ...state.wizard.data, ...action.data } } as WizardState,
      };
    case "CANCEL_WIZARD":
      return { ...state, wizard: null };
    case "COMPLETE_WIZARD":
      return { ...state, wizard: null };
    case "CLEAR":
      return { messages: [], wizard: null, isLoading: false };
    default:
      return state;
  }
}

interface ChatContextType {
  messages: ChatMessage[];
  wizard: WizardState | null;
  isLoading: boolean;
  addBotMessage: (content: string, extras?: Partial<ChatMessage>) => void;
  addUserMessage: (content: string) => void;
  handleQuickAction: (action: string) => void;
  handleSuggestion: (text: string) => void;
  handleUserInput: (text: string) => void;
  handleFileUpload: (file: File) => Promise<void>;
  startWizard: () => void;
  startModeration: (report: Report) => void;
  cancelWizard: () => void;
  submitReport: () => Promise<Report | null>;
  trackTicket: (ticketId: string) => Promise<void>;
  loadMyReports: () => Promise<void>;
  loadPendingModeration: () => Promise<void>;
  clearChat: () => void;
  userEmail: string;
  userName: string;
  isAdmin: boolean;
}

const ChatContext = createContext<ChatContextType | undefined>(undefined);

export function useChat() {
  const ctx = useContext(ChatContext);
  if (!ctx) throw new Error("useChat must be inside ChatProvider");
  return ctx;
}

const CATEGORIES = Object.values(ReportCategory);
const URGENCIES = Object.values(UrgencyLevel);
const ROLES = Object.values(ReporterRole);
const STATUSES = [ReportStatus.DIPROSES, ReportStatus.SELESAI, ReportStatus.DITOLAK];

interface ChatProviderProps {
  children: React.ReactNode;
  userEmail: string;
  userName: string;
  isAdmin: boolean;
  onNavigateAdmin: () => void;
}

export function ChatProvider({ children, userEmail, userName, isAdmin, onNavigateAdmin }: ChatProviderProps) {
  const welcomeContent = isAdmin
    ? `Selamat datang kembali, Admin **${userName}**! 🛡️\n\nAnda masuk dengan hak akses pengelola (Moderator). Apakah Anda ingin mengecek laporan yang butuh moderasi, masuk ke Panel Admin, atau membuat aduan baru?`
    : `Selamat datang di **Lapor FTI**, ${userName || "Civitas Akademika"}! 🏛️\n\nPortal aspirasi & keluhan resmi Fakultas Teknologi Industri UII.\n\nApa yang ingin Anda lakukan hari ini?`;

  const welcomeMsg: ChatMessage = {
    id: "msg-welcome",
    sender: "bot",
    content: welcomeContent,
    timestamp: ts(),
    quickActions: [
      { label: "Buat Aduan Baru", icon: "pen-line", action: "create" },
      ...(isAdmin ? [
        { label: "Perlu Moderasi", icon: "shield-alert", action: "moderate" },
        { label: "Panel Admin", icon: "settings", action: "admin" }
      ] : [
        { label: "Aduan Saya", icon: "list", action: "mine" }
      ]),
    ],
  };

  const [state, dispatch] = useReducer(reducer, {
    messages: [welcomeMsg],
    wizard: null,
    isLoading: false,
  });

  const navAdmin = useRef(onNavigateAdmin);
  navAdmin.current = onNavigateAdmin;

  const addBotMessage = useCallback((content: string, extras?: Partial<ChatMessage>) => {
    dispatch({
      type: "ADD_MESSAGE",
      message: { id: uid(), sender: "bot", content, timestamp: ts(), ...extras },
    });
  }, []);

  const addUserMessage = useCallback((content: string) => {
    dispatch({
      type: "ADD_MESSAGE",
      message: { id: uid(), sender: "user", content, timestamp: ts() },
    });
  }, []);

  const showMainMenu = useCallback(() => {
    const prompt = isAdmin
      ? "Apakah Anda ingin kembali memoderasi aduan atau hal lainnya?"
      : "Apa lagi yang bisa saya bantu hari ini?";

    addBotMessage(prompt, {
      quickActions: [
        { label: "Buat Aduan Baru", icon: "pen-line", action: "create" },
        ...(isAdmin ? [
          { label: "Perlu Moderasi", icon: "shield-alert", action: "moderate" },
          { label: "Panel Admin", icon: "settings", action: "admin" }
        ] : [
          { label: "Aduan Saya", icon: "list", action: "mine" }
        ]),
      ],
    });
  }, [addBotMessage, isAdmin]);

  // ── Submit Moderation ──
  const submitModeration = useCallback(async () => {
    const w = state.wizard;
    if (!w || w.type !== "MODERATE_REPORT") return;
    dispatch({ type: "SET_LOADING", loading: true });
    
    try {
      const d = w.data;
      
      // 1. Change category if newCategory is provided and different
      if (d.newCategory && d.newCategory !== d.currentCategory) {
        await api.updateReportCategory(d.reportId, d.newCategory as ReportCategory, "Diubah via Chatbot");
      }

      // 2. Change status
      if (d.newStatus && d.note) {
        await api.updateReportStatus(d.reportId, d.newStatus as ReportStatus, d.note);
      }

      dispatch({ type: "COMPLETE_WIZARD" });
      addBotMessage(`✅ Aduan **${d.reportId}** berhasil dimoderasi. Tindakan terekam di sistem.`);
      showMainMenu();
    } catch (err) {
      addBotMessage("❌ Gagal memoderasi aduan. Silakan coba lagi.");
    } finally {
      dispatch({ type: "SET_LOADING", loading: false });
    }
  }, [state.wizard, addBotMessage, showMainMenu]);

  // ── Submit the built report ──
  const submitReport = useCallback(async (): Promise<Report | null> => {
    const w = state.wizard;
    if (!w || w.type !== "CREATE_REPORT") return null;
    dispatch({ type: "SET_LOADING", loading: true });
    try {
      const d = w.data;
      const payload = {
        title: d.title || "",
        description: d.description || "",
        category: d.category || "",
        urgency: d.urgency || "",
        reporterName: d.reporterName || "Anonim",
        reporterRole: d.reporterRole,
        reporterEmail: d.reporterEmail || userEmail,
        reporterWhatsapp: d.reporterWhatsapp,
        isPublic: d.isPublic ?? true,
        attachmentName: d.attachmentName,
        attachmentPath: d.attachmentPath,
      };
      const report = await api.createReport(payload as any);
      dispatch({ type: "COMPLETE_WIZARD" });
      addBotMessage(
        `🎉 **Aduan berhasil terkirim!**\n\nKode tiket Anda: **${report.id}**\n\nSimpan kode ini jika diperlukan, atau pantau setiap saat melalui menu **Aduan Saya**.`,
        {
          ticketCard: report,
          quickActions: [
            { label: "Kembali ke Menu", icon: "home", action: "menu" },
            { label: "Aduan Saya", icon: "list", action: "mine" },
          ],
        }
      );
      return report;
    } catch (err) {
      addBotMessage("❌ Gagal mengirim aduan. Silakan coba lagi.");
      return null;
    } finally {
      dispatch({ type: "SET_LOADING", loading: false });
    }
  }, [state.wizard, addBotMessage, userEmail]);

  const cancelWizard = useCallback(() => {
    dispatch({ type: "CANCEL_WIZARD" });
    addBotMessage("❌ Operasi dibatalkan.");
    showMainMenu();
  }, [addBotMessage, showMainMenu]);

  // ── Wizard step prompts ──
  const promptWizardStep = useCallback(
    (step: WizardStep) => {
      switch (step) {
        // CREATE REPORT STEPS
        case "category":
          addBotMessage("📋 **Pilih kategori aduan Anda:**", { suggestions: CATEGORIES });
          break;
        case "title":
          addBotMessage("✏️ **Tuliskan judul singkat aduan Anda** (min. 10 karakter):");
          break;
        case "description":
          addBotMessage("📝 **Jelaskan detail aduan Anda** (min. 30 karakter):");
          break;
        case "urgency":
          addBotMessage("⚡ **Seberapa mendesak aduan ini?**", { suggestions: URGENCIES });
          break;
        case "identity":
          addBotMessage("👤 **Anda ingin melapor sebagai:**", {
            suggestions: ["Dengan Nama Saya", "Anonim"],
          });
          break;
        case "identity-role":
          addBotMessage("🎓 **Peran Anda di lingkungan FTI:**", { suggestions: ROLES });
          break;
        case "visibility":
          addBotMessage("🔒 **Apakah aduan ini boleh ditampilkan di feed publik?**", {
            suggestions: ["Ya, Publik", "Tidak, Privat"],
          });
          break;
        case "attachment":
          addBotMessage("📎 **Lampirkan file pendukung** (opsional):", {
            suggestions: ["⏩ Lewati, Lanjut ke Konfirmasi"],
            component: "file-upload",
          });
          break;

        // MODERATE REPORT STEPS
        case "mod_category":
          addBotMessage(`📦 Apakah Anda ingin memindahkan kategori aduan ini?\n*(Ketik 'tidak' atau 'pas' jika kategori sudah sesuai)*`, { 
            suggestions: ["Kategori Sudah Sesuai", ...CATEGORIES] 
          });
          break;
        case "mod_status":
          addBotMessage("⚙️ **Status apa yang ingin diberikan?**", { suggestions: STATUSES });
          break;
        case "mod_note":
          addBotMessage("📝 **Ketikkan catatan/tanggapan Anda untuk pelapor:**");
          break;
        case "mod_confirm":
          addBotMessage("Apakah Anda yakin ingin menyimpan perubahan ini?", { suggestions: ["✅ Simpan Moderasi", "❌ Batal"] });
          break;

        case "confirm":
          break;
        default:
          break;
      }
    },
    [addBotMessage]
  );

  const startWizard = useCallback(() => {
    dispatch({ type: "START_WIZARD" });
    promptWizardStep("category");
  }, [promptWizardStep]);

  const startModeration = useCallback((report: Report) => {
    dispatch({ type: "START_MODERATION", report });
    promptWizardStep("mod_category");
  }, [promptWizardStep]);

  const finishAttachmentAndConfirm = useCallback((currentData: Partial<WizardState["data"]>) => {
    dispatch({ type: "ADVANCE_WIZARD", step: "confirm", data: currentData });
    const finalData = { ...state.wizard?.data, ...currentData } as any;
    const summary =
      `📄 **Ringkasan Aduan**\n\n` +
      `**Kategori:** ${finalData.category}\n` +
      `**Judul:** ${finalData.title}\n` +
      `**Deskripsi:** ${finalData.description?.slice(0, 100)}${(finalData.description?.length || 0) > 100 ? "..." : ""}\n` +
      `**Urgensi:** ${finalData.urgency}\n` +
      `**Pelapor:** ${finalData.reporterName}${finalData.reporterRole ? ` (${finalData.reporterRole})` : ""}\n` +
      `**Visibilitas:** ${finalData.isPublic ? "Publik" : "Privat"}\n` +
      (finalData.attachmentName ? `**Lampiran:** ${finalData.attachmentName}\n` : "");
    addBotMessage(summary, { suggestions: ["✅ Kirim Aduan", "❌ Batal"] });
  }, [addBotMessage, state.wizard?.data]);

  // ── Handle File Upload ──
  const handleFileUpload = useCallback(async (file: File) => {
    if (!state.wizard || state.wizard.step !== "attachment") return;
    
    addUserMessage(`📎 Melampirkan: ${file.name}`);
    try {
      const res = await api.uploadFile(file);
      finishAttachmentAndConfirm({ attachmentName: res.name, attachmentPath: res.path });
    } catch (err: any) {
      throw new Error(err.message || "Gagal mengupload");
    }
  }, [state.wizard, addUserMessage, finishAttachmentAndConfirm]);

  // ── Process wizard input ──
  const processWizardInput = useCallback(
    (text: string, currentWizard: WizardState) => {
      const { type, step, data } = currentWizard;

      // Handle Moderation Flow
      if (type === "MODERATE_REPORT") {
        switch (step) {
          case "mod_category": {
            const lowerText = text.toLowerCase().trim();
            if (lowerText.includes("sudah sesuai") || lowerText.includes("tidak") || lowerText.includes("pas") || lowerText.includes("oke")) {
              dispatch({ type: "ADVANCE_WIZARD", step: "mod_status", data: { newCategory: data.currentCategory } });
              promptWizardStep("mod_status");
            } else {
              const match = CATEGORIES.find(c => c.toLowerCase() === lowerText || c.toLowerCase().includes(lowerText));
              if (!match) {
                addBotMessage("⚠️ Kategori tidak valid. Pilih dari daftar:", { suggestions: CATEGORIES });
                return;
              }
              dispatch({ type: "ADVANCE_WIZARD", step: "mod_status", data: { newCategory: match } });
              promptWizardStep("mod_status");
            }
            break;
          }
          case "mod_status": {
            const lowerText = text.toLowerCase().trim();
            const match = STATUSES.find(s => s.toLowerCase() === lowerText || s.toLowerCase().includes(lowerText));
            if (!match) {
              addBotMessage("⚠️ Pilih status dari opsi di bawah:", { suggestions: STATUSES });
              return;
            }
            dispatch({ type: "ADVANCE_WIZARD", step: "mod_note", data: { newStatus: match } });
            promptWizardStep("mod_note");
            break;
          }
          case "mod_note": {
            if (text.length < 5) {
              addBotMessage("⚠️ Catatan terlalu singkat. Berikan tanggapan yang jelas:");
              return;
            }
            dispatch({ type: "ADVANCE_WIZARD", step: "mod_confirm", data: { note: text } });
            promptWizardStep("mod_confirm");
            break;
          }
          case "mod_confirm": {
            const lower = text.toLowerCase();
            if (lower.includes("simpan") || lower.includes("ya") || lower.includes("✅")) {
              submitModeration();
            } else if (lower.includes("batal") || lower.includes("❌")) {
              cancelWizard();
            } else {
              addBotMessage("Pilih tindakan:", { suggestions: ["✅ Simpan Moderasi", "❌ Batal"] });
            }
            break;
          }
        }
        return;
      }

      // Handle Create Flow
      switch (step) {
        case "category": {
          const lowerText = text.toLowerCase().trim();
          const match = CATEGORIES.find(
            (c) => c.toLowerCase() === lowerText || c.toLowerCase().includes(lowerText)
          );
          if (!match) {
            addBotMessage("⚠️ Kategori tidak valid. Pilih salah satu dari opsi di bawah:", {
              suggestions: CATEGORIES,
            });
            return;
          }
          dispatch({ type: "ADVANCE_WIZARD", step: "title", data: { category: match } });
          promptWizardStep("title");
          break;
        }
        case "title": {
          if (text.length < 10) {
            addBotMessage("⚠️ Judul terlalu pendek (minimal 10 karakter). Coba lagi:");
            return;
          }
          dispatch({ type: "ADVANCE_WIZARD", step: "description", data: { title: text } });
          promptWizardStep("description");
          break;
        }
        case "description": {
          if (text.length < 30) {
            addBotMessage("⚠️ Deskripsi terlalu pendek (minimal 30 karakter). Coba lagi:");
            return;
          }
          dispatch({ type: "ADVANCE_WIZARD", step: "urgency", data: { description: text } });
          promptWizardStep("urgency");
          break;
        }
        case "urgency": {
          const lowerText = text.toLowerCase().trim();
          const match = URGENCIES.find(
            (u) => u.toLowerCase() === lowerText || u.toLowerCase().includes(lowerText)
          );
          if (!match) {
            addBotMessage("⚠️ Pilih tingkat urgensi:", { suggestions: URGENCIES });
            return;
          }
          dispatch({ type: "ADVANCE_WIZARD", step: "identity", data: { urgency: match } });
          promptWizardStep("identity");
          break;
        }
        case "identity": {
          const lowerText = text.toLowerCase().trim();
          if (lowerText.includes("anonim")) {
            dispatch({
              type: "ADVANCE_WIZARD",
              step: "visibility",
              data: { reporterName: "Anonim", reporterEmail: userEmail },
            });
            promptWizardStep("visibility");
          } else if (lowerText.includes("nama") || lowerText.includes(userName.toLowerCase())) {
            dispatch({
              type: "ADVANCE_WIZARD",
              step: "identity-role",
              data: { reporterName: userName, reporterEmail: userEmail },
            });
            promptWizardStep("identity-role");
          } else {
            addBotMessage("⚠️ Pilih salah satu:", { suggestions: ["Dengan Nama Saya", "Anonim"] });
          }
          break;
        }
        case "identity-role": {
          const lowerText = text.toLowerCase().trim();
          const match = ROLES.find(
            (r) => r.toLowerCase() === lowerText || r.toLowerCase().includes(lowerText)
          );
          if (!match) {
            addBotMessage("⚠️ Pilih peran Anda:", { suggestions: ROLES });
            return;
          }
          dispatch({ type: "ADVANCE_WIZARD", step: "visibility", data: { reporterRole: match } });
          promptWizardStep("visibility");
          break;
        }
        case "visibility": {
          const lowerText = text.toLowerCase().trim();
          let isPublic: boolean | undefined;
          if (lowerText.includes("publik") || lowerText.includes("ya")) isPublic = true;
          else if (lowerText.includes("privat") || lowerText.includes("tidak")) isPublic = false;
          if (isPublic === undefined) {
            addBotMessage("⚠️ Pilih visibilitas:", { suggestions: ["Ya, Publik", "Tidak, Privat"] });
            return;
          }
          dispatch({ type: "ADVANCE_WIZARD", step: "attachment", data: { isPublic } });
          promptWizardStep("attachment");
          break;
        }
        case "attachment": {
          finishAttachmentAndConfirm({});
          break;
        }
        case "confirm": {
          const lower = text.toLowerCase();
          if (lower.includes("kirim") || lower.includes("ya") || lower.includes("✅")) {
            submitReport();
          } else if (lower.includes("batal") || lower.includes("❌")) {
            cancelWizard();
          } else {
            addBotMessage("Pilih tindakan:", { suggestions: ["✅ Kirim Aduan", "❌ Batal"] });
          }
            break;
        }
      }
    },
    [addBotMessage, promptWizardStep, cancelWizard, userName, userEmail, submitReport, submitModeration, finishAttachmentAndConfirm]
  );

  // ── Track a ticket by ID ──
  const trackTicket = useCallback(
    async (ticketId: string) => {
      dispatch({ type: "SET_LOADING", loading: true });
      try {
        const reports = await api.getReports();
        const found = reports.find(
          (r: Report) => r.id.toLowerCase() === ticketId.toLowerCase()
        );
        if (found) {
          addBotMessage(`📋 Berikut detail aduan **${found.id}**:`, { ticketCard: found });
        } else {
          addBotMessage(
            `⚠️ Tiket **${ticketId}** tidak ditemukan. Pastikan kode tiket benar.`
          );
        }
      } catch {
        addBotMessage("❌ Gagal mengambil data. Coba lagi nanti.");
      } finally {
        dispatch({ type: "SET_LOADING", loading: false });
      }
    },
    [addBotMessage]
  );

  // ── Load my reports ──
  const loadMyReports = useCallback(async () => {
    dispatch({ type: "SET_LOADING", loading: true });
    try {
      const reports = await api.getReports();
      const mine = reports.filter(
        (r: Report) =>
          r.reporterEmail.toLowerCase() === userEmail.toLowerCase()
      );
      if (mine.length === 0) {
        addBotMessage("📭 Anda belum memiliki aduan. Buat aduan baru?", {
          quickActions: [
            { label: "Buat Aduan Baru", icon: "pen-line", action: "create" },
            { label: "Kembali ke Menu", icon: "home", action: "menu" },
          ],
        });
      } else {
        addBotMessage(`📋 Anda memiliki **${mine.length}** aduan:`, { ticketList: mine });
      }
    } catch {
      addBotMessage("❌ Gagal mengambil data.");
    } finally {
      dispatch({ type: "SET_LOADING", loading: false });
    }
  }, [addBotMessage, userEmail]);

  // ── Load Pending Moderation (Admin) ──
  const loadPendingModeration = useCallback(async () => {
    if (!isAdmin) return;
    dispatch({ type: "SET_LOADING", loading: true });
    try {
      const reports = await api.getReports();
      const pending = reports.filter(
        (r: Report) => r.status === ReportStatus.MENUNGGU || r.moderationStatus === "PENDING" || r.category === ReportCategory.LAINNYA
      );
      if (pending.length === 0) {
        addBotMessage("✨ Hebat! Tidak ada aduan baru yang perlu dimoderasi saat ini.", {
          quickActions: [{ label: "Panel Admin", icon: "settings", action: "admin" }]
        });
      } else {
        addBotMessage(`🛡️ Ada **${pending.length}** aduan yang menunggu verifikasi/moderasi Anda:`, {
          ticketList: pending,
          quickActions: [{ label: "Buka Panel Admin", icon: "external-link", action: "admin" }]
        });
      }
    } catch {
      addBotMessage("❌ Gagal mengambil data aduan.");
    } finally {
      dispatch({ type: "SET_LOADING", loading: false });
    }
  }, [addBotMessage, isAdmin]);

  // ── Handle quick action buttons ──
  const handleQuickAction = useCallback(
    (action: string) => {
      switch (action) {
        case "create":
          addUserMessage("📝 Buat Aduan Baru");
          startWizard();
          break;
        case "mine":
          addUserMessage("📋 Aduan Saya");
          loadMyReports();
          break;
        case "moderate":
          addUserMessage("🛡️ Cek Aduan Pending");
          loadPendingModeration();
          break;
        case "admin":
          navAdmin.current();
          break;
        case "menu":
          showMainMenu();
          break;
        default:
          break;
      }
    },
    [addUserMessage, addBotMessage, startWizard, loadMyReports, loadPendingModeration, showMainMenu]
  );

  // ── Handle suggestion chip click ──
  const handleSuggestion = useCallback(
    (text: string) => {
      addUserMessage(text);
      if (state.wizard) {
        processWizardInput(text, state.wizard);
      }
    },
    [addUserMessage, state.wizard, processWizardInput]
  );

  // ── Handle free-text user input ──
  const handleUserInput = useCallback(
    (text: string) => {
      addUserMessage(text);

      // If wizard active, process the step
      if (state.wizard) {
        if (text.toLowerCase() === "batal" || text.toLowerCase() === "cancel") {
          cancelWizard();
          return;
        }
        processWizardInput(text, state.wizard);
        return;
      }

      // Detect ticket ID pattern (still supported silently!)
      const ticketPattern = /LH-\d{8}-\d{4}/i;
      const match = text.match(ticketPattern);
      if (match) {
        trackTicket(match[0].toUpperCase());
        return;
      }

      // Keyword detection
      const lower = text.toLowerCase();
      if (lower.includes("buat") || lower.includes("lapor") || lower.includes("aduan baru")) {
        startWizard();
      } else if (lower.includes("aduan saya") || lower.includes("my report")) {
        loadMyReports();
      } else if (isAdmin && (lower.includes("moderasi") || lower.includes("pending") || lower.includes("perlu dicek") || lower.includes("menunggu") || lower.includes("baru"))) {
        loadPendingModeration();
      } else if (lower === "menu" || lower === "home") {
        showMainMenu();
      } else if (lower.match(/\b(halo|hai|hi|hei|selamat (pagi|siang|sore|malam)|assalamu)\b/i)) {
        showMainMenu();
      } else if (lower.includes("cukup") || lower.includes("terima kasih") || lower.includes("makasih") || lower.includes("sudah")) {
        addBotMessage("Sama-sama! Senang bisa membantu Anda hari ini. Jika ada hal lain yang dibutuhkan, jangan ragu untuk menyapa saya kembali. Semoga hari Anda menyenangkan! ✨", {
          quickActions: [{ label: "Kembali ke Menu", icon: "home", action: "menu" }]
        });
      } else {
        const prompt = isAdmin
          ? "Maaf, saya belum mengerti. Ketik **\"buat aduan\"**, **\"moderasi\"** untuk cek laporan baru, atau masuk ke **Panel Admin**."
          : "Maaf, saya belum mengerti. Silakan ketik **\"buat aduan\"** untuk laporan baru atau **\"aduan saya\"** untuk daftar aduan Anda.";
          
        addBotMessage(prompt, {
          quickActions: [
            { label: "Buat Aduan Baru", icon: "pen-line", action: "create" },
            ...(isAdmin ? [
              { label: "Perlu Moderasi", icon: "shield-alert", action: "moderate" },
              { label: "Panel Admin", icon: "settings", action: "admin" }
            ] : [
              { label: "Aduan Saya", icon: "list", action: "mine" }
            ]),
          ],
        });
      }
    },
    [
      addUserMessage,
      addBotMessage,
      state.wizard,
      processWizardInput,
      cancelWizard,
      trackTicket,
      startWizard,
      loadMyReports,
      loadPendingModeration,
      showMainMenu,
      isAdmin,
    ]
  );

  const clearChat = useCallback(() => {
    dispatch({ type: "CLEAR" });
    dispatch({
      type: "ADD_MESSAGE",
      message: welcomeMsg,
    });
  }, [welcomeMsg]); 

  return (
    <ChatContext.Provider
      value={{
        messages: state.messages,
        wizard: state.wizard,
        isLoading: state.isLoading,
        addBotMessage,
        addUserMessage,
        handleQuickAction,
        handleSuggestion,
        handleUserInput,
        handleFileUpload,
        startWizard,
        startModeration,
        cancelWizard,
        submitReport,
        trackTicket,
        loadMyReports,
        loadPendingModeration,
        clearChat,
        userEmail,
        userName,
        isAdmin,
      }}
    >
      {children}
    </ChatContext.Provider>
  );
}
