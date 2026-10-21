# Dokumentasi Remediasi Audit Keamanan & Deployment Produksi — Lapor FTI

| Item | Keterangan |
|---|---|
| **Aplikasi** | Portal Lapor FTI (Fakultas Teknologi Industri UII) |
| **Target Produksi** | `https://tbe-fit.uii.ac.id/lapor/` |
| **Server VPS** | `10.30.30.171` (Process: PM2 `laporfti-api` di port 8787) |
| **Tanggal Eksekusi** | 20 Oktober 2026 |
| **Status Deployment** | Sukses (Live & Terverifikasi) |

---

## 1. Ringkasan Eksekutif

Kegiatan ini mengeksekusi rekomendasi dari dokumen audit awal (`audit-lapor-fti.md`) untuk menutup risiko keamanan, mengoptimasi performa bundle, memperbaiki standar aksesibilitas, dan mengimplementasikan arsitektur proxy backend untuk integrasi Google Gemini AI.

Seluruh perubahan telah diuji secara otomatis (27 skenario uji lulus 100%), disinkronisasikan ke Git repository, di-deploy ke server VPS produksi, dan diverifikasi secara visual melalui antarmuka web langsung.

---

## 2. Rincian Remediasi yang Diterapkan

### 2.1. Arsitektur AI Proxy Backend (Keamanan Kunci API)
* **Masalah Awal**: API key Gemini berisiko terekspos jika disimpan di sisi browser (`localStorage`).
* **Implementasi**:
  * Dibuat route proxy baru `POST /api/ai/chat` di `server/routes/ai.ts`.
  * API key disimpan eksklusif di server environment (`.env`), tidak pernah dikirim ke klien.
  * Model yang digunakan: **`gemini-3.8-flash`** (menggantikan model versi lama yang telah dihentikan Google).
  * System Instruction kontekstual disematkan di server agar AI membatasi jawaban hanya seputar lingkup aduan FTI UII dan menolak perintah pemrograman atau hal di luar domain kampus.
  * Endpoint diproteksi middleware `requireLogin` (hanya dapat diakses setelah login akun UII).

### 2.2. Isolasi Jalur Pengujian Pengembangan (Dev-Login Guard)
* **Masalah Awal**: String `/api/auth/dev-login` ditemukan di bundle produksi dan berpotensi menjadi celah akses tanpa login Google.
* **Implementasi**:
  * Backend (`server/routes/auth.ts`): Menambahkan guard `NODE_ENV !== "development"`. Jika diakses di mode produksi/staging, route otomatis mengembalikan `404 Not Found` dan mencatat peringatan keamanan pada log server.
  * Frontend (`src/App.tsx`): Tombol dan handler `handleDevLogin` dibungkus kondisi `import.meta.env.DEV`, sehingga otomatis ter-tree-shake (hilang total) dari bundle build produksi.

### 2.3. Penegakan HTTP Security Response Headers
* **Implementasi di `server/app.ts`**:
  * `Content-Security-Policy`: Membatasi script origin, style Tailwind, font Google, dan Google OAuth redirect.
  * `Strict-Transport-Security`: `max-age=31536000; includeSubDomains` (otomatis aktif di produksi).
  * `X-Frame-Options: DENY`: Mencegah serangan clickjacking.
  * `X-Content-Type-Options: nosniff`: Mencegah MIME-sniffing.
  * `Referrer-Policy: strict-origin-when-cross-origin`.
  * `Permissions-Policy: camera=(), microphone=(), geolocation=()`.
  * Cookie sesi `lh_session` menggunakan atribut `HttpOnly`, `SameSite=Lax`, dan `Path=/`.

### 2.4. Optimasi Performa & Code Splitting
* **Masalah Awal**: Bundle monolitik sebesar 560 KB tanpa pemisahan modul.
* **Implementasi**:
  * Penerapan `React.lazy` dan `Suspense` untuk modul `AdminPanel` di `src/App.tsx`.
  * Bundle terpecah saat build: Chunk `AdminPanel` terisolasi (~50-88 KB) dan bundle utama berkurang secara signifikan (~251 KB di produksi).
  * Penghapusan request ganda `/api/auth/me` saat inisialisasi aplikasi dengan menggabungkan `useEffect`.

### 2.5. Aksesibilitas, UX, & SEO
* **`index.html`**: Diperbarui dengan `<html lang="id">`, `meta description`, dan `meta theme-color`.
* **iOS Safari Auto-zoom**: Ukuran font textarea pada `src/chat/ChatInput.tsx` dinaikkan menjadi `16px` (`text-[16px]`).
* **Batas Input Klien**: Atribut `maxLength={3000}` ditambahkan pada form aduan.
* **Aksesibilitas Label**: Penambahan `aria-label` eksplisit pada tombol kirim, hamburger menu, dan input chat.
* **Struktur Semantik**: Penambahan tag landmark `<main>` dan heading screen-reader (`<h1 className="sr-only">`).

---

## 3. Hasil Pengujian dan Verifikasi

### 3.1. Pengujian Otomatis Lokal (27 Skenario)
* **Keamanan Header**: XFO, XCTO, Referrer, Permissions, dan CSP terkonfirmasi sesuai standar.
* **Otentikasi & Otorisasi**:
  * Request unauthenticated ke `/api/ai/chat`, `/api/admin-users`, `/api/reports` mengembalikan `401 Unauthorized`.
  * Akses admin oleh akun pelapor biasa mengembalikan `403 Forbidden`.
  * Akses Super Admin mengembalikan `200 OK`.
  * Public feed (`/api/reports?isPublic=1`) bersih dari data sensitif pelapor (email/WhatsApp).
* **AI Endpoint**: Pengujian prompt kontekstual mengembalikan status `200 OK` dengan respons valid dari Google GenAI.

### 3.2. Pengujian Produksi Live (`https://tbe-fit.uii.ac.id/lapor/`)
* **Uji HTTP / Curl**:
  * Halaman publik menyajikan aset terbaru melalui Cloudflare.
  * `POST /api/auth/dev-login` menghasilkan `HTTP/2 404 Not Found`.
  * `POST /api/ai/chat` menghasilkan `HTTP/2 401 Unauthorized`.
* **Uji Browser Visual (Puppeteer)**:
  * Gerbang login resmi (*"Lapor FTI Chatbot — Fakultas Teknologi Industri UII"*) tampil utuh.
  * Tombol `Dev Login` terverifikasi tidak ada pada DOM (`hasDevLogin: false`).
  * Autentikasi terpusat pada tombol *Masuk dengan Google* (@uii.ac.id).

---

## 4. Riwayat Git dan Perintah Operasional VPS

### 4.1. Informasi Commit
* **Branch**: `v2-chatbot`
* **Commit**: `30507ca` — *feat(security): implement Gemini proxy backend and apply audit remediations*
* **Remote Repository**: `https://github.com/071002231-dti/laporfti.git`

### 4.2. Prosedur Build Produksi di VPS
Karena aplikasi berjalan di subpath `/lapor/`, build Vite wajib menyertakan base path:
```bash
cd /var/www/html/laporfti
git pull upstream v2-chatbot
VITE_BASE_PATH=/lapor/ npm run build
pm2 restart all --update-env
```
