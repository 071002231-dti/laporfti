import { Router } from "express";
import { GoogleGenAI } from "@google/genai";
import { z } from "zod";

const router = Router();

// ── Sistem Prompt ────────────────────────────────────────────────────────────
// Dikontekstualisasikan untuk domain Lapor FTI agar Gemini tidak menjawab
// hal-hal di luar lingkup portal aduan.
const SYSTEM_INSTRUCTION = `
Kamu adalah Asisten Lapor FTI, chatbot resmi Portal Aspirasi & Keluhan Mahasiswa
Fakultas Teknologi Industri Universitas Islam Indonesia (FTI UII).

Tugasmu adalah membantu civitas akademika FTI dalam:
- Memahami cara mengajukan aduan atau aspirasi.
- Menjelaskan alur penanganan laporan (dari "Menunggu Verifikasi" → "Diproses" → "Selesai/Ditolak").
- Menjawab pertanyaan umum seputar layanan FTI UII.
- Membimbing pengguna menggunakan fitur portal (buat aduan, cek status, dll).

Kategori aduan yang tersedia: IT & Sistem Informasi, Sarana & Prasarana, Akademik,
Kemahasiswaan, Keuangan, Pelayanan, dan Lainnya.

Batasan peranmu:
- Jangan mengakses, memodifikasi, atau menyebutkan data laporan spesifik milik orang lain.
- Jangan menjawab pertanyaan di luar lingkup FTI UII atau portal aduan (misal: soal ujian,
  rekomendasi film, pemrograman umum, dll).
- Jangan berpura-pura menjadi manusia.
- Jika tidak yakin, arahkan pengguna ke admin atau staf FTI terkait.

Gunakan Bahasa Indonesia yang sopan, singkat, dan jelas. Gunakan format markdown sederhana
jika diperlukan (bold, list), namun hindari tabel panjang.
`.trim();

// ── Schema validasi request ──────────────────────────────────────────────────
const historyItemSchema = z.object({
  role: z.enum(["user", "model"]),
  parts: z.array(z.object({ text: z.string().max(4000) })).max(5),
});

const chatSchema = z.object({
  message: z.string().min(1).max(3000),
  // Maks 10 giliran (20 item) history agar konteks tidak membengkak
  history: z.array(historyItemSchema).max(20).optional(),
});

// ── POST /api/ai/chat ────────────────────────────────────────────────────────
// Endpoint ini berada di balik requireLogin (diatur di server/app.ts),
// sehingga hanya civitas akademika yang sudah login yang bisa mengaksesnya.
router.post("/chat", async (req, res) => {
  // Cek ketersediaan key di runtime — gagal dengan pesan yang jelas
  // daripada crash dengan stack trace jika key belum diset.
  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (!apiKey) {
    return res.status(503).json({
      error: "ai_not_configured",
      message: "Fitur AI belum dikonfigurasi. Hubungi administrator.",
    });
  }

  const parsed = chatSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({
      error: "invalid_payload",
      details: parsed.error.flatten(),
    });
  }

  const { message, history = [] } = parsed.data;

  try {
    const genai = new GoogleGenAI({ apiKey });

    const chat = genai.chats.create({
      model: "gemini-3.8-flash",
      config: {
        systemInstruction: SYSTEM_INSTRUCTION,
        // Batasi panjang output agar tidak terlalu verbose
        maxOutputTokens: 1024,
        temperature: 0.5,
      },
      history,
    });

    const result = await chat.sendMessage({ message });
    const reply = result.text ?? "";

    res.json({ reply });
  } catch (err: unknown) {
    // Log detail di server, kirim pesan generik ke client
    // agar detail error (termasuk key) tidak bocor ke browser.
    console.error("[AI] Gemini upstream error:", err);

    const isQuotaError =
      err instanceof Error && err.message.toLowerCase().includes("quota");

    res.status(502).json({
      error: isQuotaError ? "ai_quota_exceeded" : "ai_upstream_error",
      message: isQuotaError
        ? "Batas penggunaan AI sementara tercapai. Coba lagi nanti."
        : "Layanan AI sedang tidak tersedia. Coba lagi nanti.",
    });
  }
});

export default router;
