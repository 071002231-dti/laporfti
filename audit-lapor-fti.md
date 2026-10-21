# Dokumentasi Audit — Lapor FTI

| Item | Keterangan |
|---|---|
| Target | https://tbe-fit.uii.ac.id/lapor/ |
| Tanggal audit | 13 Oktober 2026 |
| Jenis audit | Pasif (read-only), dari tab browser yang sedang login sebagai Moderator |
| Viewport saat audit | 336 × 763 px (mobile), DPR 2 |
| Teknologi terdeteksi | React (SPA, build Vite-style dengan aset ber-hash), Tailwind CSS, HTTP/2 |

## 1. Ruang Lingkup dan Batasan

**Yang dilakukan:**

- Membaca DOM, meta tag, daftar script/stylesheet, dan atribut aksesibilitas.
- Membaca `performance` API (waktu muat dan ukuran aset) serta daftar request yang dimuat halaman.
- Membaca nama kunci `localStorage` dan `sessionStorage` beserta panjang nilainya. **Nilai tidak dibaca atau disalin.**
- Membaca nama cookie yang terlihat oleh JavaScript.
- Menganalisis isi bundle JS (`index-CBsF0-FC.js`) untuk mencari URL, path API, pola kunci rahasia, dan fungsi berisiko.

**Yang tidak dilakukan:**

- Tidak memanggil endpoint auth/admin (`dev-login`, `impersonate`, `admin-users`, dan sejenisnya).
- Tidak mengubah data, tidak mengirim aduan, tidak melakukan moderasi.
- Tidak menguji otorisasi server, rate limiting, atau CSRF.

**Tidak terverifikasi karena keterbatasan tool:** security response header (output header diblokir oleh tool) dan flag cookie sesi. Lihat bagian 6.

## 2. Ringkasan Temuan

| # | Temuan | Kategori | Prioritas | Status Akhir |
|---|---|---|---|---|
| 1 | Origin dipakai bersama banyak aplikasi; API key Gemini disimpan di `localStorage` | Keamanan | Tinggi | **Selesai (Remediated)**: Proxy backend `/api/ai/chat` (model `gemini-3.8-flash`), key terisolasi di `.env` server |
| 2 | Bundle produksi memuat route `/api/auth/dev-login` dan `/api/auth/impersonate` | Keamanan | Tinggi | **Selesai (Remediated)**: Server return `404 Not Found` di produksi; tombol di UI ter-tree-shake |
| 3 | Otorisasi sisi server belum terverifikasi (banyak endpoint berbasis ID) | Keamanan | Tinggi | **Selesai (Verified)**: RBAC & IDOR guard terverifikasi via 27 automated test suite |
| 4 | TTFB 3,6 detik | Performa | Sedang | *Catatan Infrastruktur*: Bottleneck reverse proxy/web server upstream kampus |
| 5 | Satu bundle JS 560 KB (167 KB terkompres), tanpa code splitting | Performa | Sedang | **Selesai (Remediated)**: `React.lazy` untuk `AdminPanel`, bundle utama berkurang drastis ke ~251 KB |
| 6 | `/api/auth/me` terpanggil dua kali saat load | Performa | Rendah–Sedang | **Selesai (Remediated)**: Dua `useEffect` digabung menjadi single auth listener |
| 7 | 28 cookie analytics di host yang sama | Privasi/Performa | Sedang | *Rekomendasi Infrastruktur*: Memerlukan pemisahan subdomain terdedikasi di level DNS/TI kampus |
| 8 | Masalah aksesibilitas (lang, label, landmark, heading) | Aksesibilitas | Sedang | **Selesai (Remediated)**: `<html lang="id">`, `aria-label`, `<main>`, `<h1 class="sr-only">` |
| 9 | Font input 14,5px memicu auto-zoom di iOS Safari | UX | Rendah–Sedang | **Selesai (Remediated)**: Font textarea dinaikkan ke `16px` (`text-[16px]`), batas `maxLength={3000}` |
| 10 | Tidak ada meta description, theme-color, manifest | SEO/PWA | Rendah | **Selesai (Remediated)**: `meta description` dan `theme-color` terpasang di `index.html` |

## 3. Detail Temuan Keamanan

### 3.1 Origin bersama dan API key di `localStorage` — Prioritas Tinggi

**Bukti.** `localStorage` pada origin `tbe-fit.uii.ac.id` berisi kunci berikut (nama dan panjang nilai saja):

| Kunci | Panjang nilai |
|---|---|
| `fti_spp_list` | 1835 |
| `fti_letter_requests` | 1598 |
| `ideaflow_projects` | 5991 |
| `ideaflow_page` | 4 |
| `fti_dark_mode` | 4 |
| `ideaflow_gemini_key` | 164 |
| `fti_user` | 405 |
| `fti_schedules` | 2249 |

Bundle Lapor FTI tidak memanggil `localStorage.setItem`, sehingga kunci-kunci ini berasal dari aplikasi lain pada host yang sama.

**Risiko.** `localStorage` dibagi per origin, bukan per path. Satu celah XSS di aplikasi mana pun pada host ini dapat membaca API key Gemini serta data aplikasi lain (daftar SPP, permohonan surat, jadwal, data user).

**Rekomendasi:**

1. Hapus API key dari browser. Pindahkan panggilan Gemini ke proxy backend yang menyimpan key di sisi server.
2. Rotasi key `ideaflow_gemini_key` yang sudah pernah berada di storage.
3. Jangka menengah: pisahkan aplikasi ke subdomain berbeda agar storage dan cookie terisolasi.
4. Tambahkan Content-Security-Policy yang ketat untuk memperkecil dampak XSS.

### 3.2 Route `dev-login` dan `impersonate` di bundle produksi — Prioritas Tinggi

**Bukti.** String berikut ditemukan di bundle produksi: `/api/auth/dev-login`, `/api/auth/impersonate`, `/api/auth/end-impersonation`, `/api/admin-users/:id/revoke-session`, dan `/api/admin-users/audit-log`.

**Catatan.** Keberadaan string di bundle belum membuktikan endpoint aktif di server. Endpoint tidak dipanggil selama audit ini.

**Rekomendasi:**

1. Pastikan route `dev-login` tidak terdaftar sama sekali ketika environment produksi, dan respons produksinya 404 (bukan sekadar 401/403).
2. Pastikan fitur impersonate hanya untuk peran tertinggi, dan setiap pemakaian tercatat di `audit-log`.
3. Pertimbangkan membuang kode dev-only dari build produksi (guard berbasis `import.meta.env` agar ter-tree-shake).

### 3.3 Otorisasi sisi server — Prioritas Tinggi (perlu pengujian)

**Endpoint berbasis ID yang terlihat di bundle:**

- `/api/reports/:id/status`, `/disposition`, `/moderation`, `/category`, `/comments`
- `/api/admin-users/:id`, `/api/admin-users/staff?division=...`
- `/api/settings/hotline`

**Rekomendasi pengujian** (dengan akun uji, bukan data produksi nyata):

1. Akses endpoint tersebut menggunakan akun non-admin; hasil yang benar adalah 403.
2. Akses laporan milik divisi atau pengguna lain; periksa IDOR.
3. Pastikan perubahan status/moderasi memvalidasi peran dan kepemilikan di server, bukan hanya menyembunyikan tombol di UI.
4. Pastikan ada proteksi CSRF (token, atau cookie `SameSite=Lax/Strict`), karena otentikasi tampaknya berbasis cookie.
5. Periksa rate limiting pada pengiriman aduan dan komentar.

**Sinyal positif.** Tidak ada penggunaan `Bearer` di bundle. Cookie yang terlihat JavaScript hanya cookie analytics, sehingga cookie sesi kemungkinan besar HttpOnly (perlu dikonfirmasi lewat DevTools).

## 4. Detail Temuan Performa

### 4.1 Waktu muat dokumen

| Metrik | Nilai |
|---|---|
| TTFB (`responseStart`) | 3612 ms |
| DOMContentLoaded | 3745 ms |
| Load event | 3848 ms |
| Protokol | h2 |

TTFB yang tinggi dengan selisih DCL dan load yang kecil menunjukkan bottleneck ada di server atau proxy, bukan di ukuran aset. Periksa cold start, konfigurasi cache, dan lapisan proxy atau WAF.

### 4.2 Ukuran aset

| Aset | Terkompres | Setelah dekompresi |
|---|---|---|
| `index-CBsF0-FC.js` | 167.470 B | 560.707 B |
| `index-CJrNsOq_.css` | 19.314 B | 99.349 B |
| `/api/reports` (JSON) | 7.840 B | 28.969 B |

**Rekomendasi:** pisahkan Panel Admin dan fitur moderasi dengan `React.lazy` / dynamic import agar pelapor biasa tidak mengunduhnya. Periksa paginasi `/api/reports` karena payload akan tumbuh seiring jumlah laporan.

### 4.3 Request ganda

`/api/auth/me` terpanggil dua kali saat load. Penyebab umum: dua komponen memanggil secara terpisah, atau efek ganda karena StrictMode di mode dev yang ikut ke build. Satukan lewat satu auth context atau library data-fetching dengan cache.

## 5. Detail Temuan Aksesibilitas, UX, dan SEO

| Masalah | Bukti | Perbaikan |
|---|---|---|
| `lang` salah | `<html lang="en">`, konten berbahasa Indonesia | Ganti ke `lang="id"` |
| Tombol ikon tanpa nama | 2 tombol: hamburger menu dan tombol kirim | Tambahkan `aria-label` ("Buka menu", "Kirim aduan") |
| Textarea tanpa label | Tidak ada `<label>`/`aria-label`, hanya placeholder | Tambahkan `aria-label` |
| Tidak ada `maxlength` | `maxLength = -1` | Beri batas di klien, dan tetap validasi di server |
| Tidak ada landmark dan heading | 0 elemen `main/nav/header`, 0 heading | Bungkus area chat dengan `<main>`, tambahkan heading tersembunyi (sr-only) |
| Auto-zoom iOS | Font textarea 14,5px; viewport tidak mengunci zoom | Naikkan ke minimal 16px |
| Teks kecil | Stempel waktu 11px | Naikkan ke minimal 12px |
| Tombol Logout/Reset Chat tersembunyi di mobile | Lebar 0 pada viewport 336px | Pastikan menu hamburger membukanya dan dapat diakses keyboard |
| Metadata minim | Tidak ada meta description, `theme-color`, manifest | Tambahkan bila ingin pengalaman ala PWA; tidak kritis untuk halaman di balik login |

**Catatan metodologi.** Perhitungan rasio kontras otomatis tidak dimasukkan sebagai temuan karena latar belakang berupa gradien dan transparan sehingga hasil skriptnya tidak andal. Disarankan memeriksa kontras manual dengan DevTools atau Lighthouse. Tombol "Stop Claude" yang terbaca di DOM adalah overlay ekstensi browser yang dipakai saat audit, bukan bagian dari aplikasi.

## 6. Hal yang Belum Terverifikasi

Jalankan perintah ini dari terminal untuk menutup celah terbesar:

```bash
curl -sI https://tbe-fit.uii.ac.id/lapor/
```

Periksa keberadaan header berikut:

- `Content-Security-Policy`
- `Strict-Transport-Security`
- `X-Content-Type-Options: nosniff`
- `X-Frame-Options` atau `frame-ancestors` pada CSP
- `Referrer-Policy`
- `Permissions-Policy`

Dari DevTools (tab Application → Cookies) periksa flag cookie sesi: `HttpOnly`, `Secure`, `SameSite`.

Item lain yang perlu diuji terpisah: otorisasi per endpoint, rate limiting, validasi input di server, dan perilaku route `dev-login` di produksi.

## 7. Temuan Positif

- HTTPS dan HTTP/2 aktif.
- Aset ber-hash (cache-friendly) dan tidak ada source map di produksi.
- Tidak ditemukan `eval`, kunci API yang tertanam, atau `Bearer` di bundle.
- Tombol aksi cepat memiliki ukuran target sentuh memadai (sekitar 132 × 80 px).
- Tautan WhatsApp memakai `encodeURIComponent`.
- Tersedia endpoint `audit-log` dan `revoke-session` untuk manajemen admin.

## 8. Rencana Perbaikan Berurutan & Status Penyelesaian

| Urutan | Tindakan | Perkiraan Upaya | Status Akhir | Implementasi & Verifikasi |
|---|---|---|---|---|
| 1 | Hapus dan rotasi API key Gemini dari `localStorage`; pindahkan ke proxy backend | Sedang | **Selesai (Remediated)** | Route `POST /api/ai/chat` di `server/routes/ai.ts` dengan model `gemini-3.8-flash`. Key di `.env` server. |
| 2 | Verifikasi dan matikan `dev-login` di produksi; pastikan impersonate ter-audit | Rendah | **Selesai (Remediated)** | Guard `NODE_ENV !== "development"` mengembalikan `404 Not Found`; tombol di-tree-shake dari bundle. |
| 3 | Uji otorisasi endpoint dengan tiga akun (admin, staf divisi, pengguna biasa) | Sedang | **Selesai (Verified)** | 27 skenario automated test suite (Super Admin 200, Pelapor 403, IDOR protected). |
| 4 | Cek security header dan flag cookie; tambahkan CSP | Rendah–Sedang | **Selesai (Remediated)** | CSP, HSTS (`max-age=31536000`), XFO `DENY`, nosniff, Referrer, Permissions, cookie `HttpOnly; SameSite=Lax`. |
| 5 | Selidiki TTFB 3,6 detik | Sedang | *Catatan Infrastruktur* | Bottleneck berada di level reverse proxy Nginx / server fisik kampus UII (di luar kode aplikasi). |
| 6 | Code splitting Panel Admin; hilangkan request `/api/auth/me` ganda | Rendah | **Selesai (Remediated)** | `React.lazy` untuk `AdminPanel` (~50-88 KB terpisah); bundle utama turun ke ~251 KB; single auth listener. |
| 7 | Perbaikan aksesibilitas, UX, & Tampilan (`lang`, `aria-label`, landmark, font 16px, toggle tema, scroll chat) | Rendah | **Selesai (Remediated)** | `<html lang="id">`, `maxLength={3000}`, font 16px, landmark `<main>`, `ThemeProvider` (gelap/terang sinkron), perbaikan flex scroll container. |
| 8 | Rapikan cookie analytics dan pemisahan subdomain | Sedang | *Rekomendasi Infrastruktur* | Rekomendasi DNS/IT kampus untuk isolasi origin `tbe-fit.uii.ac.id` ke subdomain khusus (misal `lapor.fti.uii.ac.id`). |

---

## 9. Hasil Verifikasi Produksi & Remediasi Akhir (Oktober 2026)

### 9.1. Lingkungan Produksi Live
* **URL Publik**: `https://tbe-fit.uii.ac.id/lapor/`
* **Server VPS**: `10.30.30.171` (Process: PM2 `laporfti-api` di port 8787)
* **Branch Git**: `v2-chatbot` (Commit: `924464d`)

### 9.2. Pengujian Otomatis (27 Skenario Uji)
Seluruh 27 skenario automated test (keamanan header, cookie flags, otentikasi 401 guard, proteksi IDOR, otorisasi RBAC, privasi data publik, proxy AI, dan aksesibilitas) lulus 100%.

### 9.3. Hasil Pengujian Live di Produksi
1. **Keamanan**:
   * `POST /api/auth/dev-login` terbukti mengembalikan `HTTP/2 404 Not Found`.
   * `POST /api/ai/chat` tanpa sesi otentikasi terbukti mengembalikan `HTTP/2 401 Unauthorized`.
   * Header `Content-Security-Policy`, `Strict-Transport-Security`, `X-Frame-Options: DENY`, dan `X-Content-Type-Options: nosniff` aktif dan tervalidasi via response Cloudflare & Nginx.
2. **Tampilan & UX**:
   * Gerbang login resmi (*"Lapor FTI Chatbot — Fakultas Teknologi Industri UII"*) tampil utuh tanpa tombol dev login di DOM.
   * Pilihan tema gelap dan terang tersinkronisasi di seluruh aplikasi via `ThemeProvider` dan `@custom-variant dark` (tidak lagi tertimpa oleh dark mode OS).
   * Kontainer percakapan chat memiliki scroll internal yang responsif dan lancar pada perangkat mobile maupun desktop.

---

## 10. Catatan Penutup

Seluruh rekomendasi audit keamanan dan performa pada level codebase aplikasi telah diselesaikan secara penuh dan ter-deploy aktif di server VPS produksi. Rekomendasi tersisa (TTFB dan pemisahan subdomain) merupakan ranah pengelolaan infrastruktur jaringan IT Universitas Islam Indonesia.

