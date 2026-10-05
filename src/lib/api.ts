import { Report, ReportComment, ReportStatus, ReportCategory, AdminRole } from "../types";
import { Division } from "./divisions";

// The app can be served from a subpath in production (e.g. "/lapor/"), so
// every API call must be prefixed with Vite's BASE_URL rather than assuming
// root ("/"). Centralized here so callers just pass "api/reports" etc.
export function apiUrl(path: string): string {
  return `${import.meta.env.BASE_URL}${path.replace(/^\//, "")}`;
}

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(apiUrl(path), {
    headers: { "Content-Type": "application/json" },
    ...options,
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || `Request failed: ${res.status}`);
  }
  return res.json();
}

export function getReports(): Promise<Report[]> {
  return request<Report[]>("/api/reports");
}

export function getReport(id: string): Promise<Report> {
  return request<Report>(`/api/reports/${encodeURIComponent(id)}`);
}

export function createReport(payload: Omit<Report, "id" | "status" | "createdAt" | "updatedAt" | "timeline" | "comments">): Promise<Report> {
  return request<Report>("/api/reports", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function updateReportStatus(ticketId: string, status: ReportStatus, note: string): Promise<Report> {
  return request<Report>(`/api/reports/${encodeURIComponent(ticketId)}/status`, {
    method: "PATCH",
    body: JSON.stringify({ status, note }),
  });
}

export function dispositionReport(ticketId: string, assigneeEmail: string, note?: string): Promise<Report> {
  return request<Report>(`/api/reports/${encodeURIComponent(ticketId)}/disposition`, {
    method: "PATCH",
    body: JSON.stringify({ assigneeEmail, note }),
  });
}

export function moderateReport(ticketId: string, decision: "APPROVED" | "REJECTED"): Promise<Report> {
  return request<Report>(`/api/reports/${encodeURIComponent(ticketId)}/moderation`, {
    method: "PATCH",
    body: JSON.stringify({ decision }),
  });
}

export function updateReportCategory(ticketId: string, category: ReportCategory, note?: string): Promise<Report> {
  return request<Report>(`/api/reports/${encodeURIComponent(ticketId)}/category`, {
    method: "PATCH",
    body: JSON.stringify({ category, note }),
  });
}

// Plain URL, not a fetch — clicking it as a normal same-origin navigation
// sends the session cookie automatically and lets the browser handle the
// Content-Disposition download, no blob handling needed.
export function exportReportsUrl(filters?: { status?: string; category?: string }): string {
  const query = new URLSearchParams();
  if (filters?.status && filters.status !== "ALL") query.set("status", filters.status);
  if (filters?.category && filters.category !== "ALL") query.set("category", filters.category);
  const qs = query.toString();
  return apiUrl("api/reports/export") + (qs ? `?${qs}` : "");
}

export function exportReportsPdfUrl(filters?: { status?: string; category?: string }): string {
  const query = new URLSearchParams();
  if (filters?.status && filters.status !== "ALL") query.set("status", filters.status);
  if (filters?.category && filters.category !== "ALL") query.set("category", filters.category);
  const qs = query.toString();
  return apiUrl("api/reports/export-pdf") + (qs ? `?${qs}` : "");
}

export function exportReportPdfUrl(ticketId: string): string {
  return apiUrl(`api/reports/${encodeURIComponent(ticketId)}/export-pdf`);
}

export function addComment(ticketId: string, comment: Omit<ReportComment, "id" | "createdAt">): Promise<Report> {
  return request<Report>(`/api/reports/${encodeURIComponent(ticketId)}/comments`, {
    method: "POST",
    body: JSON.stringify(comment),
  });
}

export async function uploadFile(file: File): Promise<{ path: string; name: string }> {
  const formData = new FormData();
  formData.append("file", file);
  const res = await fetch(apiUrl("api/uploads"), { method: "POST", body: formData });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || `Upload failed: ${res.status}`);
  }
  return res.json();
}

export function getHotline(): Promise<{ phone: string; label: string; updatedAt: string | null }> {
  return request("/api/settings/hotline");
}

export function updateHotline(payload: { phone: string; label?: string }): Promise<{ phone: string; label?: string; updatedAt: string }> {
  return request("/api/settings/hotline", {
    method: "PUT",
    body: JSON.stringify(payload),
  });
}

export interface AuthMe {
  authenticated: boolean;
  email?: string;
  name?: string;
  role?: AdminRole;
  division?: Division;
  impersonating?: boolean;
  impersonatedBy?: string;
}

export function getMe(): Promise<AuthMe> {
  return request<AuthMe>("/api/auth/me");
}

export async function logout(): Promise<void> {
  await request("/api/auth/logout", { method: "POST" });
}

// Super Admin-only "login as" — see server/routes/auth.ts for the audit-log
// and access-control rules enforced server-side.
export async function impersonate(email: string): Promise<{ ok: true }> {
  return request("/api/auth/impersonate", {
    method: "POST",
    body: JSON.stringify({ email }),
  });
}

export async function endImpersonation(): Promise<{ ok: true }> {
  return request("/api/auth/end-impersonation", { method: "POST" });
}

// Dev-only: log in as a dummy reporter account without going through Google
// OAuth. The server rejects this outside development.
export async function devLogin(): Promise<void> {
  await request("/api/auth/dev-login", { method: "POST" });
}

export interface AdminUserEntry {
  email: string;
  name?: string;
  role: AdminRole;
  division?: Division;
  addedBy?: string;
  createdAt: string;
}

export function getAdminUsers(): Promise<AdminUserEntry[]> {
  return request<AdminUserEntry[]>("/api/admin-users");
}

export function inviteAdminUser(payload: { email: string; name?: string; role: AdminRole; division?: Division }): Promise<AdminUserEntry> {
  return request<AdminUserEntry>("/api/admin-users", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function updateAdminUserRole(email: string, role: AdminRole, division?: Division): Promise<AdminUserEntry> {
  return request<AdminUserEntry>(`/api/admin-users/${encodeURIComponent(email)}`, {
    method: "PATCH",
    body: JSON.stringify({ role, division }),
  });
}

export async function removeAdminUser(email: string): Promise<void> {
  await request(`/api/admin-users/${encodeURIComponent(email)}`, { method: "DELETE" });
}

export function getStaffInDivision(division: Division): Promise<AdminUserEntry[]> {
  return request<AdminUserEntry[]>(`/api/admin-users/staff?division=${encodeURIComponent(division)}`);
}

export async function revokeAdminSession(email: string): Promise<{ ok: true; revokedAt: string }> {
  return request(`/api/admin-users/${encodeURIComponent(email)}/revoke-session`, { method: "POST" });
}

export interface AuditLogEntry {
  id: string;
  actorEmail: string;
  action: string;
  targetType?: string;
  targetId?: string;
  details?: string;
  createdAt: string;
}

export function getAuditLog(filters?: { actorEmail?: string }): Promise<AuditLogEntry[]> {
  const query = new URLSearchParams();
  if (filters?.actorEmail) query.set("actorEmail", filters.actorEmail);
  const qs = query.toString();
  return request<AuditLogEntry[]>(`/api/admin-users/audit-log${qs ? `?${qs}` : ""}`);
}
