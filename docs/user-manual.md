# Manual Penggunaan — Lapor FTI

Portal aspirasi dan pengaduan untuk sivitas akademika Fakultas Teknologi Industri (FTI) Universitas Islam Indonesia. Dokumen ini untuk pengguna aplikasi (pelapor maupun admin) — bukan dokumentasi teknis pengembangan (lihat `docs/rbac-workflow-guide.md` dan `docs/progress-*.md` untuk itu).

Akses: https://tbe-fit.uii.ac.id/lapor/

## Daftar Isi
1. [Login](#1-login)
2. [Panduan untuk Pelapor](#2-panduan-untuk-pelapor)
3. [Panduan untuk Admin (Staff / Moderator / Pimpinan / Super Admin)](#3-panduan-untuk-admin)
4. [Ringkasan Hak Akses per Role](#4-ringkasan-hak-akses-per-role)
5. [Kategori Laporan & Divisi Penanggung Jawab](#5-kategori-laporan--divisi-penanggung-jawab)
6. [Pertanyaan Umum / Troubleshooting](#6-pertanyaan-umum--troubleshooting)

---

## 1. Login

Seluruh aplikasi (bukan cuma panel admin) mewajibkan login dengan akun **Google UII** — email `@uii.ac.id` atau subdomain apa pun seperti `@students.uii.ac.id`. Tidak ada pendaftaran akun terpisah; klik **"Login dengan Google"** di halaman awal dan pilih akun UII Anda.

- Kalau akun Anda **tidak** terdaftar sebagai admin oleh Super Admin, Anda otomatis masuk sebagai **Pelapor** — lihat tampilan biasa (Beranda, Buat Laporan, dst), tanpa tombol admin sama sekali.
- Kalau akun Anda **terdaftar** dengan role admin (Super Admin/Moderator/Staff/Pimpinan), Anda langsung masuk ke **Panel Admin** setiap kali login — tidak ada tampilan pelapor untuk akun admin.

Kalau login gagal dengan pesan domain tidak diizinkan, pastikan Anda memakai email UII, bukan email pribadi (Gmail biasa, dsb).

---

## 2. Panduan untuk Pelapor

Berlaku untuk semua akun UII yang **belum** terdaftar sebagai admin — mahasiswa, dosen, tendik, alumni. Setelah login, ada 5 tab di header:

### 2.1 Beranda
Ringkasan portal, tombol cepat "Buat Aduan/Aspirasi", pencarian cepat kode tiket, dan kontak WhatsApp hotline resmi (kalau sudah diatur Super Admin).

### 2.2 Buat Laporan
Form pengajuan aduan/aspirasi baru. Isi yang perlu dilengkapi:

| Field | Keterangan |
|---|---|
| Sembunyikan Nama (Anonim) | Kalau dicentang, nama Anda disembunyikan dari staf/moderator dan publik |
| Status Civitas | Mahasiswa / Dosen FTI / Tenaga Kependidikan (Tendik) / Alumni |
| Nama Lengkap, NIM/No. Identitas | Wajib diisi kecuali memilih Anonim |
| Alamat Email | Terisi otomatis dari akun Google Anda, bisa diubah kalau perlu email lain untuk tindak lanjut |
| No. WhatsApp | Opsional — kalau diisi, Anda akan menerima notifikasi status via WhatsApp |
| Kategori | Pilih salah satu dari 8 kategori (lihat [bagian 5](#5-kategori-laporan--divisi-penanggung-jawab)) — menentukan divisi mana yang menangani |
| Tingkat Urgensi | Rendah / Sedang / Tinggi-Darurat |
| Judul & Deskripsi | Judul singkat, deskripsi detail (minimal 30 karakter) |
| Lampiran Bukti (opsional) | Gambar (PNG/JPG/GIF/WEBP) atau PDF, **maksimal 2MB**. Gambar yang lebih besar otomatis dikompres di browser Anda; PDF di atas 2MB akan ditolak dengan pesan jelas — kompres dulu sebelum upload |
| Publikasikan di Umpan Publik | Kalau dicentang, laporan **akan ditinjau dulu oleh Moderator/Super Admin** sebelum tampil di tab "Laporan Publik" — tidak langsung tayang. Identitas Anda tetap tersembunyi kalau memilih Anonim |

Setelah terkirim, Anda mendapat **kode tiket** (format `LH-YYYYMMDD-XXXX`) untuk melacak status, dan tombol kirim notifikasi ke WhatsApp Anda sendiri.

### 2.3 Lacak Laporan
Masukkan kode tiket untuk melihat status terkini, linimasa penanganan, dan balasan resmi dari staf. Anda juga bisa menambahkan komentar/tanggapan balik di sini.

### 2.4 Laporan Saya
Daftar semua laporan yang pernah Anda kirim dengan akun yang sedang login (dicocokkan berdasarkan email pelapor), apa pun statusnya — tidak perlu ingat kode tiket satu-satu.

### 2.5 Laporan Publik
Menampilkan laporan yang dipilih "Publikasikan" oleh pelapornya **dan** sudah disetujui Moderator/Super Admin. Bisa difilter per kategori dan status, serta cari kata kunci.

---

## 3. Panduan untuk Admin

Berlaku untuk akun dengan role **Super Admin**, **Moderator**, **Staff**, atau **Pimpinan**. Setelah login, langsung masuk ke Panel Admin (tidak ada tampilan pelapor).

### 3.1 Tampilan Umum
- **Daftar Pengaduan** (kolom kiri) — daftar laporan sesuai cakupan akses Anda (lihat [tabel role](#4-ringkasan-hak-akses-per-role)), dengan filter cepat: Semua / Moderasi (khusus Moderator & Super Admin, laporan publik yang menunggu persetujuan) / Menunggu / Sedang / Selesai.
- Klik satu laporan untuk membuka **detail** (kolom kanan): isi aduan, lampiran bukti (gambar ditampilkan langsung), dan beberapa aksi tergantung role Anda.

### 3.2 Aksi di Detail Laporan
| Section | Siapa yang bisa pakai | Fungsi |
|---|---|---|
| **Ubah Kategori** | Moderator, Super Admin | Perbaiki kategori kalau laporan salah kategori saat disubmit. Kalau kategori baru pindah divisi, disposisi yang sudah ada otomatis di-reset |
| **Disposisi Tugas** | Moderator, Super Admin (semua role bisa lihat statusnya) | Tugaskan laporan ke Staff tertentu di divisi terkait, dengan catatan opsional |
| **Moderasi Publikasi** | Moderator, Super Admin | Muncul kalau pelapor memilih "Publikasikan" — tombol Setujui Tayang / Tolak Tayang menentukan apakah laporan muncul di tab Laporan Publik |
| **Tindak Lanjut & Update Status** | Super Admin, Moderator, Staff (kalau tiket didisposisikan ke dirinya) | Ubah status laporan (Menunggu/Diproses/Selesai/Diarsipkan) + catatan yang tampil di linimasa untuk pelapor |
| **Kirim Balasan Resmi** | Super Admin, Moderator, Staff | Kirim tanggapan tertulis yang tersimpan di sistem; kalau pelapor mencantumkan WhatsApp, otomatis membuka jendela WA siap kirim |
| **Cetak PDF** (tombol di header detail) | Semua role admin | Unduh dokumen PDF resmi satu laporan: kop surat, detail lengkap, linimasa, balasan, area tanda tangan |
| **Notifikasi WA** (tombol di header detail) | Semua role admin | Kirim update status terkini langsung ke WhatsApp pelapor |

**Pimpinan** hanya bisa melihat semua bagian di atas tanpa bisa mengubah apa pun (mode baca saja) — cocok untuk memantau tanpa ikut mengeksekusi.

### 3.3 Ekspor Data (semua role admin)
Di banner atas panel admin: dua dropdown filter (Status, Kategori) diikuti tombol **Unduh Excel** dan **Unduh PDF** (rekap tabel). Keduanya otomatis mengikuti cakupan akses role Anda — Moderator hanya dapat data divisinya, Staff hanya tiket miliknya, Super Admin/Pimpinan dapat semua data.

### 3.4 Khusus Super Admin
Tiga tombol tambahan di banner atas:

- **Pengaturan WA Hotline** — atur nomor WhatsApp publik yang tampil di Beranda pelapor sebagai kontak darurat/cepat (terpisah dari notifikasi per-laporan).
- **Kelola Akun Admin** — tambah akun admin baru (bisa pilih cepat dari direktori FTI atau isi manual), ubah role/divisi akun yang sudah ada, **Revoke Sesi** (paksa akun tertentu logout dari semua perangkat — berguna kalau ada kecurigaan akun disalahgunakan atau staf resign), dan hapus akses admin. Super Admin tidak bisa mengubah/menghapus/revoke akun miliknya sendiri lewat menu ini (demi keamanan).
- **Audit Log** — riwayat semua aksi sensitif (login, update status, disposisi, moderasi, ubah kategori, ubah hotline, kelola akun admin, revoke sesi), bisa difilter per email admin.

---

## 4. Ringkasan Hak Akses per Role

| Role | Lihat Laporan | Ubah Status/Balas | Disposisi/Ubah Kategori | Moderasi Publikasi | Kelola Akun & Hotline | Audit Log |
|---|---|---|---|---|---|---|
| **Super Admin** | Semua laporan | ✅ | ✅ | ✅ | ✅ | ✅ |
| **Moderator** | Hanya divisinya | ✅ (di divisinya) | ✅ (di divisinya) | ✅ (di divisinya) | ❌ | ❌ |
| **Staff** | Hanya tiket yang didisposisikan ke dirinya | ✅ (tiket miliknya) | ❌ | ❌ | ❌ | ❌ |
| **Pimpinan** | Semua laporan (termasuk sensitif) | ❌ (baca saja) | ❌ | ❌ | ❌ | ❌ |

Setiap akun Moderator/Staff terikat ke satu divisi (Administrasi Akademik / Administrasi Umum & Rumah Tangga / Teknologi Informasi / Administrasi Keuangan / Kemahasiswaan) — laporan otomatis terfilter di server berdasar kategorinya, bukan cuma disembunyikan di tampilan.

---

## 5. Kategori Laporan & Divisi Penanggung Jawab

| Kategori Laporan | Divisi Penanggung Jawab |
|---|---|
| Akademik & Kurikulum | Administrasi Akademik |
| Fasilitas & Sarana Prasarana | Administrasi Umum & Rumah Tangga |
| Layanan Administrasi & Staf | Administrasi Umum & Rumah Tangga |
| Sistem Informasi & IT Portal | Teknologi Informasi |
| Keuangan & Biaya Kuliah | Administrasi Keuangan |
| Kemahasiswaan, Minat & Beasiswa | Kemahasiswaan (Wakil Dekan Kemahasiswaan) |
| Etika, Perundungan & Pelecehan | Kemahasiswaan (Wakil Dekan Kemahasiswaan) |
| Lainnya | Administrasi Umum & Rumah Tangga (divisi *catch-all*) |

Kalau pelapor salah pilih kategori, Moderator/Super Admin dapat memperbaikinya lewat **Ubah Kategori** (lihat [3.2](#32-aksi-di-detail-laporan)) tanpa perlu pelapor mengirim ulang laporan.

---

## 6. Pertanyaan Umum / Troubleshooting

**Upload lampiran gagal.**
Pastikan file berupa gambar (PNG/JPG/GIF/WEBP) atau PDF, dan ukuran di bawah 2MB (gambar besar otomatis dikompres, PDF besar harus dikompres manual dulu). Kalau tetap gagal, pesan error sekarang menyebutkan penyebab spesifiknya (ukuran/tipe file/lainnya) — laporkan pesan tersebut ke Super Admin untuk ditelusuri lebih lanjut.

**Laporan yang saya centang "Publikasikan" tidak muncul di Laporan Publik.**
Laporan publik butuh persetujuan Moderator/Super Admin dulu (lihat status "Menunggu Moderasi" di panel admin) — bukan tayang otomatis begitu dikirim.

**Saya salah pilih kategori saat submit laporan.**
Tidak perlu kirim ulang — minta Moderator/Super Admin divisi terkait (atau divisi mana pun yang saat ini melihat laporan Anda) memperbaikinya lewat fitur "Ubah Kategori" di panel admin.

**Link di pesan WhatsApp mengarah ke domain lama.**
Link resmi portal di semua template WhatsApp adalah `https://uii.id/LaporFTI`. Kalau ada tautan lain yang muncul, kemungkinan itu dari tab browser admin yang sudah lama terbuka sebelum aplikasi diperbarui — coba reload penuh (hard refresh) halaman admin.

**Saya login sebagai admin tapi tidak melihat tab Beranda/Buat Laporan seperti pelapor biasa.**
Ini memang perilaku normal — akun dengan role admin (Super Admin/Moderator/Staff/Pimpinan) selalu diarahkan langsung ke Panel Admin, tidak ke tampilan pelapor. Untuk mencoba alur sebagai pelapor, gunakan akun UII lain yang tidak terdaftar sebagai admin.
