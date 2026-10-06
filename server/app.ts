import express from "express";
import path from "path";
import cookieParser from "cookie-parser";
import rateLimit from "express-rate-limit";
import reportsRouter from "./routes/reports";
import uploadsRouter from "./routes/uploads";
import settingsRouter from "./routes/settings";
import authRouter from "./routes/auth";
import adminUsersRouter from "./routes/adminUsers";
import { requireLogin, SESSION_COOKIE_NAME } from "./middleware/requireAdmin";
import { db } from "./db/connection";
import { verifyAdminSession } from "./lib/jwt";

const UPLOAD_DIR = process.env.UPLOAD_DIR || "./uploads";

export function createApp() {
  const app = express();
  // Trust the single nginx hop in front of Node so req.ip / X-Forwarded-For
  // resolve to the real client IP instead of nginx's own socket — needed for
  // express-rate-limit to key by client, not by "everyone behind nginx".
  app.set("trust proxy", 1);
  app.use(express.json({ limit: "1mb" }));
  app.use(cookieParser());

  const publicWriteLimiter = rateLimit({
    windowMs: 60 * 1000,
    limit: 20,
    standardHeaders: true,
    legacyHeaders: false,
  });

  app.use("/api/reports", (req, res, next) => {
    if (req.method === "POST") return publicWriteLimiter(req, res, next);
    next();
  });
  app.use("/api/uploads", publicWriteLimiter);

  // /api/auth/* must stay reachable before login exists (start/callback/me/logout).
  app.use("/api/auth", authRouter);

  // GET /api/reports?isPublic=1 — public feed, no login required.
  //
  // Only reports with is_public=1 AND moderation_status='APPROVED' are
  // returned, so unauthenticated callers (landing page, public embeds) can
  // read the approved feed without a UII account.
  //
  // Must be registered BEFORE the requireLogin fence below. When the
  // caller IS authenticated, their session cookie is present and valid —
  // in that case we fall through to the gated reportsRouter which already
  // handles per-role scoping and includes the caller's own private reports.
  app.get("/api/reports", (req, res, next) => {
    if (req.query.isPublic !== "1") return next();

    // Authenticated callers: fall through to requireLogin + reportsRouter.
    const token = req.cookies?.[SESSION_COOKIE_NAME];
    const session = token ? verifyAdminSession(token) : null;
    if (session) return next();

    // Genuinely unauthenticated: serve only APPROVED public reports.
    // Reporter identity fields are intentionally omitted from this response
    // to protect privacy (names, emails, WhatsApp are not exposed publicly).
    type Row = Record<string, unknown>;
    const rows = db
      .prepare(
        "SELECT * FROM reports WHERE is_public = 1 AND moderation_status = 'APPROVED' ORDER BY created_at DESC"
      )
      .all() as Row[];

    const getTimeline = db.prepare(
      "SELECT status, note, timestamp, actor_name FROM report_timeline WHERE report_id = ? ORDER BY id ASC"
    );

    const feed = rows.map((row) => ({
      id: row.id,
      title: row.title,
      category: row.category,
      status: row.status,
      urgency: row.urgency,
      isPublic: !!row.is_public,
      moderationStatus: row.moderation_status,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      timeline: (getTimeline.all(row.id as string) as Row[]).map((t) => ({
        status: t.status,
        note: t.note,
        timestamp: t.timestamp,
        actorName: t.actor_name ?? undefined,
      })),
    }));

    return res.json(feed);
  });

  // Everything else requires a logged-in UII account (student or staff) —
  // the whole app is gated, not just the admin panel.
  app.use("/api", requireLogin);

  app.use("/api/reports", reportsRouter);
  app.use("/api/uploads", uploadsRouter);
  app.use("/api/settings", settingsRouter);
  app.use("/api/admin-users", adminUsersRouter);

  app.use("/uploads", express.static(path.resolve(process.cwd(), UPLOAD_DIR)));

  if (process.env.NODE_ENV === "production") {
    const distDir = path.resolve(process.cwd(), "dist");
    app.use(express.static(distDir));
    app.get("*", (_req, res) => {
      res.sendFile(path.join(distDir, "index.html"));
    });
  } else {
    app.get("/", (_req, res) => {
      res.json({
        service: "Lapor FTI API",
        status: "ok",
        note: "This is the backend API server. The frontend runs separately on the Vite dev server (default port 3000).",
      });
    });
  }

  return app;
}
