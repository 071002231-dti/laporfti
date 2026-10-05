import express from "express";
import path from "path";
import cookieParser from "cookie-parser";
import rateLimit from "express-rate-limit";
import reportsRouter from "./routes/reports";
import uploadsRouter from "./routes/uploads";
import settingsRouter from "./routes/settings";
import authRouter from "./routes/auth";
import adminUsersRouter from "./routes/adminUsers";
import { requireLogin } from "./middleware/requireAdmin";

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
