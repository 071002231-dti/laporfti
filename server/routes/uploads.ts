import { Router } from "express";
import multer from "multer";
import path from "path";
import crypto from "crypto";
import fs from "fs";

const UPLOAD_DIR = process.env.UPLOAD_DIR || "./uploads";

// uploads/ is gitignored, so a fresh clone (e.g. a VPS deploy) won't have it
// on disk — multer's diskStorage destination callback doesn't create
// directories itself and fails with ENOENT if it's missing.
fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const ALLOWED_MIME = new Set(["image/png", "image/jpeg", "image/gif", "image/webp", "application/pdf"]);

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, UPLOAD_DIR),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname);
    const safeName = `${Date.now()}-${crypto.randomBytes(6).toString("hex")}${ext}`;
    cb(null, safeName);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 2 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (!ALLOWED_MIME.has(file.mimetype)) {
      return cb(new Error("unsupported_file_type"));
    }
    cb(null, true);
  },
});

const router = Router();

router.post("/", (req, res) => {
  // Invoked manually (rather than as route middleware) so multer errors —
  // fileFilter rejection, LIMIT_FILE_SIZE, disk errors — can be turned into
  // a JSON response here. Otherwise they fall through to Express's default
  // HTML error page, which the frontend can't parse, and every distinct
  // failure collapses into the same generic "upload failed" message.
  upload.single("file")(req, res, (err: unknown) => {
    if (err) {
      if (err instanceof multer.MulterError && err.code === "LIMIT_FILE_SIZE") {
        return res.status(413).json({ error: "file_too_large" });
      }
      if (err instanceof Error && err.message === "unsupported_file_type") {
        return res.status(400).json({ error: "unsupported_file_type" });
      }
      console.error("Upload error:", err);
      return res.status(500).json({ error: "upload_failed" });
    }
    if (!req.file) return res.status(400).json({ error: "no_file" });
    res.status(201).json({ path: req.file.filename, name: req.file.originalname });
  });
});

export default router;
