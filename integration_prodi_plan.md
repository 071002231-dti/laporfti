# Laporan Penyelesaian Bug & Rencana Integrasi Program Studi (Prodi)
**Tanggal:** 6 Oktober 2026

## 1. Ringkasan Pekerjaan Hari Ini
Pagi ini, kita telah melakukan serangkaian pengujian *End-to-End* (E2E) untuk memverifikasi alur Lapor FTI dari ujung ke ujung.

### A. Temuan Pengujian (E2E Testing)
- **Status & Disposisi:** Telah diverifikasi bahwa status aduan ("Menunggu Verifikasi", "Sedang Diproses", "Selesai") dan riwayat (*timeline*) tercatat secara akurat di database.
- **Logika Disposisi Staf:** Sistem berfungsi dengan tepat dalam menjaga batasan Divisi. Moderator hanya dapat mendisposisikan aduan kepada Staf yang berada di divisi yang sama, dan sistem mencatat rekam jejak (*audit log*) secara transparan. Disposisi hanya mengubah *Assignee* (PIC) tanpa memaksakan perubahan status aduan, memberikan fleksibilitas operasional penuh.
- **Bug Privasi Data Publik:** Ditemukan *bug* pada `GET /api/reports?isPublic=1` untuk *unauthenticated user* (publik tanpa login) di mana tiket dengan status `PENDING` bisa berpotensi terekspos karena filter `moderation_status` belum diterapkan.

### B. Perbaikan & Deployment
- **Fix:** Menambahkan logika filter `moderation_status = 'APPROVED'` pada Endpoint *public feed*.
- **Fix:** Memindahkan inisialisasi API `/api/reports?isPublic=1` di `server/app.ts` agar di-*register* mendahului *middleware* `requireLogin` khusus untuk *guest user*. Hal ini menghindari *dead code* dan memastikan feed publik bisa diakses tanpa cookie sesi, tetapi tetap aman dari kebocoran data sensitif (nama, email, no WA disembunyikan).
- **Deployment ke 10.30.30.171:** Perubahan pada `server/app.ts` dan `server/routes/reports.ts` telah di-*deploy* ke VPS secara *hot-swap* menggunakan sinkronisasi `scp` dan *restart* otomatis *process* Node.js, menjaga kestabilan *branch* Git di _production_.

---

## 2. Rencana Pengembangan: Integrasi Admin Prodi
Fase selanjutnya adalah menghubungkan Lapor FTI dengan tingkatan operasional Program Studi, sehingga mahasiswa dapat secara spesifik mengarahkan laporannya (misal: urusan akademik spesifik prodi, atau laboratorium khusus) ke Admin Prodi terkait.

### Fase 1: Pembaruan Data Model (Database)
- **Modifikasi Tabel `reports`:** Menambah kolom `target_prodi` (VARCHAR, Nullable).
- **Modifikasi Tabel `admin_users`:** Menambah kolom `prodi_id` (VARCHAR, Nullable).
- **Konsep Akses:**
  - `prodi_id = NULL`: Bertindak sebagai Admin Fakultas (melihat aduan dengan `target_prodi IS NULL`).
  - `prodi_id = 'Informatika'`: Bertindak sebagai Admin Prodi Informatika (melihat aduan dengan `target_prodi = 'Informatika'`).

### Fase 2: Pembaruan Antarmuka Chatbot (Frontend)
- **Pertanyaan Bercabang (Branching):** Di dalam alur `ChatContext.tsx`, jika pengguna (*role* = Mahasiswa) memilih kategori yang relevan, tambahkan *step* konfirmasi:
  > *"Apakah laporan ini ditujukan secara umum ke Fakultas, atau spesifik untuk Program Studi Anda?"*
- Jika pengguna memilih "Program Studi", tampilkan *dropdown* daftar Prodi di FTI UII (Informatika, Teknik Industri, Teknik Kimia, dll). Data ini kemudian dikirim dalam *payload* `POST /api/reports` sebagai atribut `target_prodi`.

### Fase 3: Logika Routing & Hak Akses (Backend)
- **Filter Dashboard:** Di dalam `server/routes/reports.ts`, fungsi `buildAdminScopeFilter` diperbarui agar admin yang memiliki nilai `prodi_id` di profil sesi JWT-nya hanya dapat melakukan kueri (*fetch*) tiket yang `target_prodi`-nya cocok.
- **Pendelegasian & Re-routing:** Super Admin dan Pimpinan Fakultas mempertahankan akses global. Fitur Ubah Kategori (*re-route*) di panel admin ditambahkan menu "Ubah Tujuan Prodi" untuk mendelegasikan silang aduan jika mahasiswa salah memilih sasaran di awal (misal: aduan level prodi yang masuk ke fakultas).

### Langkah Selanjutnya (Action Items)
1. Mengeksekusi modifikasi skema tabel SQLite (membuat *patch* migrasi untuk menambahkan kolom `target_prodi` dan `prodi_id`).
2. Membuat seed data uji coba untuk akun Admin Prodi (misal: `admin.informatika@uii.ac.id`).
3. Mengubah antarmuka *wizard chatbot* di _React frontend_.
