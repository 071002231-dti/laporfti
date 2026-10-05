import { Router } from "express";
import { z } from "zod";
import ExcelJS from "exceljs";
import { db } from "../db/connection";
import { generateTicketId } from "../lib/ticketId";
import { requireAdmin, requireModerator, requireActionable, SESSION_COOKIE_NAME } from "../middleware/requireAdmin";
import { verifyAdminSession, AdminSession } from "../lib/jwt";
import { logAudit } from "../lib/auditLog";
import { sendNotificationEmail } from "../lib/email";
import { generateReportsSummaryPdf, generateReportDetailPdf } from "../lib/reportPdf";
import { divisionForCategory, categoriesForDivision } from "../../src/lib/divisions";
import { ReportCategory, ReportStatus } from "../../src/types";
import { PORTAL_LINK } from "../../src/utils/whatsapp";
import type { Report, ReportComment } from "../../src/types";

const router = Router();

type ReportRow = {
  id: string;
  title: string;
  description: string;
  category: string;
  status: string;
  urgency: string;
  reporter_name: string;
  reporter_role: string | null;
  reporter_email: string;
  reporter_whatsapp: string | null;
  submitted_by_email: string | null;
  is_public: number;
  moderation_status: string;
  attachment_name: string | null;
  attachment_path: string | null;
  disposed_to_email: string | null;
  disposition_note: string | null;
  disposed_by: string | null;
  disposed_at: string | null;
  created_at: string;
  updated_at: string;
};

type TimelineRow = {
  report_id: string;
  status: string;
  note: string;
  timestamp: string;
  actor_name: string | null;
  actor_email: string | null;
};
type CommentRow = { id: string; report_id: string; sender_name: string; sender_role: "Admin" | "Mahasiswa"; content: string; created_at: string };

const getTimelineStmt = db.prepare("SELECT * FROM report_timeline WHERE report_id = ? ORDER BY id ASC");
const getCommentsStmt = db.prepare("SELECT * FROM report_comments WHERE report_id = ? ORDER BY created_at ASC");

function toReport(row: ReportRow): Report {
  const timeline = (getTimelineStmt.all(row.id) as TimelineRow[]).map((t) => ({
    status: t.status as Report["status"],
    note: t.note,
    timestamp: t.timestamp,
    actorName: t.actor_name ?? undefined,
  }));
  const comments = (getCommentsStmt.all(row.id) as CommentRow[]).map((c) => ({
    id: c.id,
    senderName: c.sender_name,
    senderRole: c.sender_role,
    content: c.content,
    createdAt: c.created_at,
  })) as ReportComment[];

  return {
    id: row.id,
    title: row.title,
    description: row.description,
    category: row.category as Report["category"],
    status: row.status as Report["status"],
    urgency: row.urgency as Report["urgency"],
    reporterName: row.reporter_name,
    reporterRole: (row.reporter_role as Report["reporterRole"]) ?? undefined,
    reporterEmail: row.reporter_email,
    reporterWhatsapp: row.reporter_whatsapp ?? undefined,
    isPublic: !!row.is_public,
    moderationStatus: row.moderation_status as Report["moderationStatus"],
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    attachmentName: row.attachment_name ?? undefined,
    attachmentPath: row.attachment_path ?? undefined,
    disposedToEmail: row.disposed_to_email ?? undefined,
    dispositionNote: row.disposition_note ?? undefined,
    disposedBy: row.disposed_by ?? undefined,
    disposedAt: row.disposed_at ?? undefined,
    timeline,
    comments,
  };
}

// Whether the given session may act on (update status / reply as Admin) this
// specific report, based on role scope: Super Admin acts on anything,
// Moderators only within their division, Staff only on tickets disposed to them.
function canActOnReport(session: AdminSession, row: ReportRow): boolean {
  if (session.role === "SUPER_ADMIN") return true;
  if (session.role === "MODERATOR") {
    return divisionForCategory(row.category as Report["category"]) === session.division;
  }
  if (session.role === "STAFF") {
    return row.disposed_to_email === session.email;
  }
  return false;
}

function getSession(req: import("express").Request): AdminSession | null {
  const token = req.cookies?.[SESSION_COOKIE_NAME];
  return token ? verifyAdminSession(token) : null;
}

// Role-based WHERE scoping shared by admin-only report listings (the admin
// dashboard's GET / and the Excel export): Moderators see only their
// division's categories, Staff see only tickets disposed to them, Super
// Admin and Pimpinan see everything (no filter, so this returns empty).
function buildAdminScopeFilter(session: AdminSession): { conditions: string[]; params: unknown[] } {
  const conditions: string[] = [];
  const params: unknown[] = [];
  if (session.role === "MODERATOR") {
    const categories = categoriesForDivision(session.division);
    if (categories.length === 0) {
      conditions.push("1 = 0");
    } else {
      conditions.push(`category IN (${categories.map(() => "?").join(",")})`);
      params.push(...categories);
    }
  } else if (session.role === "STAFF") {
    conditions.push("disposed_to_email = ?");
    params.push(session.email);
  }
  return { conditions, params };
}

// Optional status/category query-param filters shared by the Excel and PDF
// rekap exports — mutates conditions/params in place, ignoring anything that
// doesn't match a known enum value.
function applyExportFilters(req: import("express").Request, conditions: string[], params: unknown[]): void {
  const statusFilter = typeof req.query.status === "string" ? req.query.status : undefined;
  if (statusFilter && (Object.values(ReportStatus) as string[]).includes(statusFilter)) {
    conditions.push("status = ?");
    params.push(statusFilter);
  }
  const categoryFilter = typeof req.query.category === "string" ? req.query.category : undefined;
  if (categoryFilter && (Object.values(ReportCategory) as string[]).includes(categoryFilter)) {
    conditions.push("category = ?");
    params.push(categoryFilter);
  }
}

const createReportSchema = z.object({
  title: z.string().min(10).max(300),
  description: z.string().min(30).max(5000),
  category: z.string().min(1),
  urgency: z.string().min(1),
  reporterName: z.string().min(1).max(150),
  reporterRole: z.string().optional(),
  reporterEmail: z.string().email(),
  reporterWhatsapp: z.string().max(30).optional(),
  isPublic: z.boolean(),
  attachmentName: z.string().max(255).optional(),
  attachmentPath: z.string().max(500).optional(),
});

const commentSchema = z.object({
  senderName: z.string().min(1).max(150),
  senderRole: z.enum(["Admin", "Mahasiswa"]),
  content: z.string().min(1).max(3000),
});

const statusSchema = z.object({
  status: z.string().min(1),
  note: z.string().min(1).max(1000),
});

const dispositionSchema = z.object({
  assigneeEmail: z.string().email(),
  note: z.string().max(1000).optional(),
});

const moderationSchema = z.object({
  decision: z.enum(["APPROVED", "REJECTED"]),
});

const categorySchema = z.object({
  category: z.nativeEnum(ReportCategory),
  note: z.string().max(500).optional(),
});

// GET /api/reports
router.get("/", (req, res) => {
  const session = getSession(req);

  let sql = "SELECT * FROM reports";
  let conditions: string[] = [];
  let params: unknown[] = [];

  if (session?.role === "MODERATOR" || session?.role === "STAFF") {
    ({ conditions, params } = buildAdminScopeFilter(session));
  } else if (!session && req.query.isPublic === "1") {
    // Unauthenticated request explicitly asking for the public feed subset.
    conditions.push("is_public = 1");
  } else if (session && !session.role) {
    // Logged-in but non-admin (plain UII account, e.g. student/staff/dosen
    // reporter): the approved public feed, PLUS their own reports regardless
    // of publication/moderation status (so they can always track what they
    // submitted) — never other users' private or unapproved reports.
    // submitted_by_email is the authoritative match (set server-side from
    // the session at creation time, can't be spoofed via the form); the
    // LOWER(reporter_email) comparison is a fallback for reports submitted
    // before that column existed.
    conditions.push(
      "(is_public = 1 AND moderation_status = 'APPROVED') OR submitted_by_email = ? OR LOWER(reporter_email) = ?"
    );
    params.push(session.email.toLowerCase(), session.email.toLowerCase());
  }
  // SUPER_ADMIN, PIMPINAN, and unauthenticated bulk fetches (no isPublic
  // param) get the full list — the latter preserves the existing public
  // quick-track / "lacak laporan privat by ticket ID" flows, which look up
  // the report client-side from this array using the ticket ID as a bearer
  // secret rather than a separate authenticated lookup.

  if (conditions.length) sql += " WHERE " + conditions.join(" AND ");
  sql += " ORDER BY created_at DESC";
  const rows = db.prepare(sql).all(...params) as ReportRow[];
  res.json(rows.map(toReport));
});

// GET /api/reports/export — Excel summary of reports scoped to the caller's
// role, same rules as GET /. Registered before GET /:id so "export" isn't
// swallowed as a ticket id param.
router.get("/export", requireAdmin, async (req, res) => {
  const { conditions, params } = buildAdminScopeFilter(req.admin!);
  applyExportFilters(req, conditions, params);

  let sql = "SELECT * FROM reports";
  if (conditions.length) sql += " WHERE " + conditions.join(" AND ");
  sql += " ORDER BY created_at DESC";
  const rows = db.prepare(sql).all(...params) as ReportRow[];

  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet("Laporan");
  sheet.columns = [
    { header: "Kode Tiket", key: "id", width: 18 },
    { header: "Judul", key: "title", width: 40 },
    { header: "Kategori", key: "category", width: 28 },
    { header: "Urgensi", key: "urgency", width: 14 },
    { header: "Status", key: "status", width: 22 },
    { header: "Status Publikasi", key: "publicationStatus", width: 16 },
    { header: "Status Moderasi", key: "moderationStatus", width: 16 },
    { header: "Nama Pelapor", key: "reporterName", width: 24 },
    { header: "Peran Pelapor", key: "reporterRole", width: 20 },
    { header: "Email Pelapor", key: "reporterEmail", width: 28 },
    { header: "Tanggal Dibuat", key: "createdAt", width: 20 },
    { header: "Terakhir Diperbarui", key: "updatedAt", width: 20 },
  ];
  sheet.getRow(1).font = { bold: true };

  for (const row of rows) {
    sheet.addRow({
      id: row.id,
      title: row.title,
      category: row.category,
      urgency: row.urgency,
      status: row.status,
      publicationStatus: row.is_public ? "Publik" : "Privat",
      moderationStatus: row.is_public ? row.moderation_status : "-",
      reporterName: row.reporter_name,
      reporterRole: row.reporter_role ?? "-",
      reporterEmail: row.reporter_email,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    });
  }

  const filename = `laporan-lapor-fit-${new Date().toISOString().slice(0, 10)}.xlsx`;
  res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
  res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
  await workbook.xlsx.write(res);
  res.end();
});

// GET /api/reports/export-pdf — same scope/filters as /export, rendered as a
// printable landscape PDF table instead of a spreadsheet.
router.get("/export-pdf", requireAdmin, (req, res) => {
  const { conditions, params } = buildAdminScopeFilter(req.admin!);
  applyExportFilters(req, conditions, params);

  let sql = "SELECT * FROM reports";
  if (conditions.length) sql += " WHERE " + conditions.join(" AND ");
  sql += " ORDER BY created_at DESC";
  const rows = db.prepare(sql).all(...params) as ReportRow[];

  const statusFilter = typeof req.query.status === "string" ? req.query.status : undefined;
  const categoryFilter = typeof req.query.category === "string" ? req.query.category : undefined;
  const filterLabel = `Filter: Status = ${statusFilter || "Semua"} · Kategori = ${categoryFilter || "Semua"}`;

  const filename = `rekap-lapor-fit-${new Date().toISOString().slice(0, 10)}.pdf`;
  res.setHeader("Content-Type", "application/pdf");
  res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
  const doc = generateReportsSummaryPdf(rows, filterLabel);
  doc.pipe(res);
});

// GET /api/reports/:id
router.get("/:id", (req, res) => {
  const row = db.prepare("SELECT * FROM reports WHERE id = ?").get(req.params.id) as ReportRow | undefined;
  if (!row) return res.status(404).json({ error: "not_found" });
  res.json(toReport(row));
});

// GET /api/reports/:id/export-pdf — formal single-ticket printout (letterhead,
// full detail, handling timeline, signature block) for physical filing.
// Any admin role may print a ticket they can view; unlike the mutating
// endpoints this isn't restricted to canActOnReport's division/assignment
// scope, since printing is a read action, not a state change.
router.get("/:id/export-pdf", requireAdmin, (req, res) => {
  const row = db.prepare("SELECT * FROM reports WHERE id = ?").get(req.params.id) as ReportRow | undefined;
  if (!row) return res.status(404).json({ error: "not_found" });

  const filename = `laporan-${row.id}.pdf`;
  res.setHeader("Content-Type", "application/pdf");
  res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
  const doc = generateReportDetailPdf(toReport(row));
  doc.pipe(res);
});

// POST /api/reports
router.post("/", (req, res) => {
  const parsed = createReportSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "invalid_payload", details: parsed.error.flatten() });
  }
  const body = parsed.data;
  const now = new Date().toISOString();
  const id = generateTicketId();

  const insertReport = db.prepare(`
    INSERT INTO reports (
      id, title, description, category, status, urgency,
      reporter_name, reporter_role, reporter_email, reporter_whatsapp, submitted_by_email,
      is_public, attachment_name, attachment_path, created_at, updated_at
    ) VALUES (
      @id, @title, @description, @category, 'Menunggu Verifikasi', @urgency,
      @reporterName, @reporterRole, @reporterEmail, @reporterWhatsapp, @submittedByEmail,
      @isPublic, @attachmentName, @attachmentPath, @createdAt, @updatedAt
    )
  `);
  const insertTimeline = db.prepare(`
    INSERT INTO report_timeline (report_id, status, note, timestamp, actor_name, actor_email) VALUES (?, ?, ?, ?, ?, ?)
  `);

  const run = db.transaction(() => {
    insertReport.run({
      id,
      title: body.title,
      description: body.description,
      category: body.category,
      urgency: body.urgency,
      reporterName: body.reporterName,
      reporterRole: body.reporterRole ?? null,
      reporterEmail: body.reporterEmail,
      reporterWhatsapp: body.reporterWhatsapp ?? null,
      submittedByEmail: req.admin!.email.toLowerCase(),
      isPublic: body.isPublic ? 1 : 0,
      attachmentName: body.attachmentName ?? null,
      attachmentPath: body.attachmentPath ?? null,
      createdAt: now,
      updatedAt: now,
    });
    insertTimeline.run(
      id,
      "Menunggu Verifikasi",
      "Laporan berhasil terkirim melalui Portal Lapor FTI. Menunggu peninjauan awal oleh staf administrasi FTI.",
      now,
      "Sistem",
      null
    );
  });
  run();

  // Not awaited — email delivery is a courtesy, shouldn't delay the
  // reporter's response. sendNotificationEmail catches its own errors.
  const division = divisionForCategory(body.category as Report["category"]);
  if (division) {
    let moderators = db
      .prepare("SELECT email, name FROM admin_users WHERE role = 'MODERATOR' AND division = ?")
      .all(division) as { email: string; name: string | null }[];
    // No Moderator registered for this division yet (e.g. its lead is
    // currently Super Admin instead) — fall back to Super Admins so the
    // report still notifies someone rather than nobody.
    if (moderators.length === 0) {
      moderators = db.prepare("SELECT email, name FROM admin_users WHERE role = 'SUPER_ADMIN'").all() as {
        email: string;
        name: string | null;
      }[];
    }
    for (const moderator of moderators) {
      sendNotificationEmail(
        moderator.email,
        `[Lapor FTI] Laporan Baru: ${id}`,
        `Halo ${moderator.name || "Moderator"},\n\n` +
          `Ada laporan baru masuk ke divisi Anda:\n\n` +
          `Kode Tiket: ${id}\n` +
          `Judul: ${body.title}\n` +
          `Kategori: ${body.category}\n` +
          `Urgensi: ${body.urgency}\n\n` +
          `Silakan tinjau di panel admin:\n${PORTAL_LINK}\n\n` +
          `_Email otomatis dari Lapor FTI, Fakultas Teknologi Industri UII._`
      );
    }
  }

  const row = db.prepare("SELECT * FROM reports WHERE id = ?").get(id) as ReportRow;
  res.status(201).json(toReport(row));
});

// PATCH /api/reports/:id/status
router.patch("/:id/status", requireActionable, (req, res) => {
  const parsed = statusSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "invalid_payload", details: parsed.error.flatten() });
  }
  const existing = db.prepare("SELECT * FROM reports WHERE id = ?").get(req.params.id) as ReportRow | undefined;
  if (!existing) return res.status(404).json({ error: "not_found" });
  if (!canActOnReport(req.admin!, existing)) {
    return res.status(403).json({ error: "forbidden" });
  }

  const now = new Date().toISOString();
  const run = db.transaction(() => {
    db.prepare("UPDATE reports SET status = ?, updated_at = ? WHERE id = ?").run(parsed.data.status, now, req.params.id);
    db.prepare(
      "INSERT INTO report_timeline (report_id, status, note, timestamp, actor_name, actor_email) VALUES (?, ?, ?, ?, ?, ?)"
    ).run(
      req.params.id,
      parsed.data.status,
      parsed.data.note,
      now,
      req.admin!.name || req.admin!.email,
      req.admin!.email
    );
  });
  run();

  logAudit({
    actorEmail: req.admin!.email,
    action: "REPORT_STATUS_UPDATED",
    targetType: "report",
    targetId: req.params.id,
    details: `Status diubah ke "${parsed.data.status}": ${parsed.data.note}`,
  });

  const row = db.prepare("SELECT * FROM reports WHERE id = ?").get(req.params.id) as ReportRow;
  res.json(toReport(row));
});

// PATCH /api/reports/:id/disposition — assign a ticket to a Staff account
// within the acting Moderator's own division (or any division for Super Admin).
router.patch("/:id/disposition", requireModerator, (req, res) => {
  const parsed = dispositionSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "invalid_payload", details: parsed.error.flatten() });
  }
  const existing = db.prepare("SELECT * FROM reports WHERE id = ?").get(req.params.id) as ReportRow | undefined;
  if (!existing) return res.status(404).json({ error: "not_found" });
  if (!canActOnReport(req.admin!, existing)) {
    return res.status(403).json({ error: "forbidden" });
  }

  const assigneeEmail = parsed.data.assigneeEmail.toLowerCase();
  const assignee = db.prepare("SELECT * FROM admin_users WHERE email = ?").get(assigneeEmail) as
    | { email: string; name: string | null; role: string; division: string | null }
    | undefined;
  if (!assignee || assignee.role !== "STAFF") {
    return res.status(400).json({ error: "assignee_not_staff" });
  }
  const reportDivision = divisionForCategory(existing.category as Report["category"]);
  if (assignee.division !== reportDivision) {
    return res.status(400).json({ error: "assignee_wrong_division" });
  }

  const now = new Date().toISOString();
  db.prepare(
    "UPDATE reports SET disposed_to_email = ?, disposition_note = ?, disposed_by = ?, disposed_at = ?, updated_at = ? WHERE id = ?"
  ).run(assigneeEmail, parsed.data.note ?? null, req.admin!.email, now, now, req.params.id);

  logAudit({
    actorEmail: req.admin!.email,
    action: "REPORT_DISPOSITIONED",
    targetType: "report",
    targetId: req.params.id,
    details: `Didisposisikan ke ${assigneeEmail}${parsed.data.note ? `: ${parsed.data.note}` : ""}`,
  });

  sendNotificationEmail(
    assigneeEmail,
    `[Lapor FTI] Tugas Baru: ${req.params.id}`,
    `Halo ${assignee.name || "Staff"},\n\n` +
      `Anda mendapat disposisi tugas baru dari ${req.admin!.email}:\n\n` +
      `Kode Tiket: ${req.params.id}\n` +
      `Judul: ${existing.title}\n` +
      `Kategori: ${existing.category}\n` +
      (parsed.data.note ? `Catatan: ${parsed.data.note}\n\n` : "\n") +
      `Silakan tindak lanjuti di panel admin:\n${PORTAL_LINK}\n\n` +
      `_Email otomatis dari Lapor FTI, Fakultas Teknologi Industri UII._`
  );

  const row = db.prepare("SELECT * FROM reports WHERE id = ?").get(req.params.id) as ReportRow;
  res.json(toReport(row));
});

// PATCH /api/reports/:id/moderation — approve or reject an isPublic report
// for the public feed. Same actors as disposition: Super Admin anywhere,
// Moderators only within their own division.
router.patch("/:id/moderation", requireModerator, (req, res) => {
  const parsed = moderationSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "invalid_payload", details: parsed.error.flatten() });
  }
  const existing = db.prepare("SELECT * FROM reports WHERE id = ?").get(req.params.id) as ReportRow | undefined;
  if (!existing) return res.status(404).json({ error: "not_found" });
  if (!canActOnReport(req.admin!, existing)) {
    return res.status(403).json({ error: "forbidden" });
  }

  const now = new Date().toISOString();
  db.prepare("UPDATE reports SET moderation_status = ?, updated_at = ? WHERE id = ?").run(
    parsed.data.decision,
    now,
    req.params.id
  );

  logAudit({
    actorEmail: req.admin!.email,
    action: "REPORT_MODERATED",
    targetType: "report",
    targetId: req.params.id,
    details: `Moderasi publikasi: ${parsed.data.decision}`,
  });

  const row = db.prepare("SELECT * FROM reports WHERE id = ?").get(req.params.id) as ReportRow;
  res.json(toReport(row));
});

// PATCH /api/reports/:id/category — reclassify a miscategorized report so it
// routes to the correct division. Same actors as disposition/moderation.
// If the new category maps to a different division than the old one, any
// existing disposition is cleared — a staff member in the old division
// shouldn't keep a ticket that's no longer theirs.
router.patch("/:id/category", requireModerator, (req, res) => {
  const parsed = categorySchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "invalid_payload", details: parsed.error.flatten() });
  }
  const existing = db.prepare("SELECT * FROM reports WHERE id = ?").get(req.params.id) as ReportRow | undefined;
  if (!existing) return res.status(404).json({ error: "not_found" });
  if (!canActOnReport(req.admin!, existing)) {
    return res.status(403).json({ error: "forbidden" });
  }

  const oldCategory = existing.category;
  const newCategory = parsed.data.category;
  const oldDivision = divisionForCategory(oldCategory as Report["category"]);
  const newDivision = divisionForCategory(newCategory as Report["category"]);
  const movedDivision = oldDivision !== newDivision;
  const now = new Date().toISOString();

  const run = db.transaction(() => {
    if (movedDivision) {
      db.prepare(
        "UPDATE reports SET category = ?, disposed_to_email = NULL, disposition_note = NULL, disposed_by = NULL, disposed_at = NULL, updated_at = ? WHERE id = ?"
      ).run(newCategory, now, req.params.id);
    } else {
      db.prepare("UPDATE reports SET category = ?, updated_at = ? WHERE id = ?").run(newCategory, now, req.params.id);
    }

    const noteText =
      `Kategori diubah dari "${oldCategory}" ke "${newCategory}" oleh ${req.admin!.email}` +
      (parsed.data.note ? `: ${parsed.data.note}` : "") +
      (movedDivision ? " — disposisi sebelumnya direset karena berpindah divisi." : "");
    db.prepare(
      "INSERT INTO report_timeline (report_id, status, note, timestamp, actor_name, actor_email) VALUES (?, ?, ?, ?, ?, ?)"
    ).run(
      req.params.id,
      existing.status,
      noteText,
      now,
      req.admin!.name || req.admin!.email,
      req.admin!.email
    );
  });
  run();

  logAudit({
    actorEmail: req.admin!.email,
    action: "REPORT_CATEGORY_CHANGED",
    targetType: "report",
    targetId: req.params.id,
    details: `Kategori diubah dari "${oldCategory}" ke "${newCategory}"${parsed.data.note ? `: ${parsed.data.note}` : ""}`,
  });

  const row = db.prepare("SELECT * FROM reports WHERE id = ?").get(req.params.id) as ReportRow;
  res.json(toReport(row));
});

// POST /api/reports/:id/comments
router.post("/:id/comments", (req, res) => {
  const parsed = commentSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "invalid_payload", details: parsed.error.flatten() });
  }

  const existing = db.prepare("SELECT * FROM reports WHERE id = ?").get(req.params.id) as ReportRow | undefined;
  if (!existing) return res.status(404).json({ error: "not_found" });

  if (parsed.data.senderRole === "Admin") {
    const session = getSession(req);
    if (!session) return res.status(401).json({ error: "unauthorized" });
    if (!canActOnReport(session, existing)) {
      return res.status(403).json({ error: "forbidden" });
    }
  }

  const now = new Date().toISOString();
  const commentId = (parsed.data.senderRole === "Admin" ? "c-staff-" : "c-") + Math.random().toString(36).slice(2, 11);

  const run = db.transaction(() => {
    db.prepare(
      "INSERT INTO report_comments (id, report_id, sender_name, sender_role, content, created_at) VALUES (?, ?, ?, ?, ?, ?)"
    ).run(commentId, req.params.id, parsed.data.senderName, parsed.data.senderRole, parsed.data.content, now);
    db.prepare("UPDATE reports SET updated_at = ? WHERE id = ?").run(now, req.params.id);
  });
  run();

  const row = db.prepare("SELECT * FROM reports WHERE id = ?").get(req.params.id) as ReportRow;
  res.status(201).json(toReport(row));
});

export default router;
