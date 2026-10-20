# Dokumentasi alur aduan — Lapor FTI Chatbot

> Versi: Oktober 2026 · Berdasarkan kode sumber aktif

---

## Ringkasan sistem

**Lapor FTI** adalah portal aspirasi dan keluhan resmi Fakultas Teknologi Industri UII. Sistem ini berbasis chatbot yang memandu pelapor melalui wizard percakapan, didukung backend Express + SQLite dengan autentikasi Google OAuth (terbatas domain `@uii.ac.id` dan subdomain).

---

## 1. Autentikasi & akses

```mermaid
flowchart TD
    A[User buka aplikasi] --> B{Session cookie valid?}
    B -- Ya --> C[GET /api/auth/me → resolve role]
    B -- Tidak --> D[Tampil LoginGateChatbot]
    D --> E[Klik Login dengan Google]
    E --> F[GET /api/auth/google/start → redirect OAuth]
    F --> G[Google OAuth consent screen]
    G --> H[GET /api/auth/google/callback]
    H --> I{Email domain UII?}
    I -- Tidak --> J[Redirect /?authError=domain_not_allowed]
    I -- Ya --> K{Ada di admin_users?}
    K -- Ya --> L[Assign role dari DB]
    K -- Tidak, DB kosong --> M[Bootstrap SUPER_ADMIN]
    K -- Tidak --> N[role = undefined / Pelapor biasa]
    L & M & N --> O[Sign JWT → set session cookie]
    O --> P[Redirect ke /]
```

**Role yang ada:**

| Role | Hak akses |
|---|---|
| Pelapor (no role) | Submit aduan, lacak aduan milik sendiri |
| `MODERATOR` | Moderasi aduan sesuai divisi |
| `STAFF` | Tindak lanjut tiket yang didisposisikan ke email mereka |
| `PIMPINAN` | Baca semua aduan, tidak bisa mutasi |
| `SUPER_ADMIN` | Akses penuh ke semua aduan dan manajemen admin |

> **Dev shortcut:** `POST /api/auth/dev-login` menggunakan akun dummy `dummy.pelapor@students.uii.ac.id`, hanya aktif saat `NODE_ENV !== production`.

---

## 2. Alur buat aduan (Pelapor)

Seluruh proses dikelola via `ChatContext` → state machine `wizard` tipe `CREATE_REPORT`.

```mermaid
flowchart TD
    Start([User klik 'Buat Aduan Baru'\natau ketik 'buat'/'lapor']) --> S1

    S1["Step 1: category\n📋 Pilih kategori"]
    S1 --> V1{Valid?}
    V1 -- Tidak --> S1
    V1 -- Ya --> S2

    S2["Step 2: title\n✏️ Judul singkat ≥ 10 karakter"]
    S2 --> V2{≥ 10 char?}
    V2 -- Tidak --> S2
    V2 -- Ya --> S3

    S3["Step 3: description\n📝 Detail aduan ≥ 30 karakter"]
    S3 --> V3{≥ 30 char?}
    V3 -- Tidak --> S3
    V3 -- Ya --> S4

    S4["Step 4: urgency\n⚡ Tingkat urgensi"]
    S4 --> V4{Valid?}
    V4 -- Tidak --> S4
    V4 -- Ya --> S5

    S5["Step 5: identity\n👤 Nama / Anonim?"]
    S5 --> V5{Anonim?}
    V5 -- Ya --> S7["Step 7: visibility"]
    V5 -- Tidak / Nama saya --> S6

    S6["Step 6: identity-role\n🎓 Peran di FTI"]
    S6 --> V6{Valid role?}
    V6 -- Tidak --> S6
    V6 -- Ya --> S7

    S7["Step 7: visibility\n🔒 Publik / Privat?"]
    S7 --> V7{Valid?}
    V7 -- Tidak --> S7
    V7 -- Ya --> S8

    S8["Step 8: attachment\n📎 Upload file (opsional)"]
    S8 --> C1{Upload file?}
    C1 -- Ya --> UP[POST /api/uploads → dapat path]
    UP --> CONFIRM
    C1 -- Lewati --> CONFIRM

    CONFIRM["Step 9: confirm\n📄 Ringkasan ditampilkan\n✅ Kirim / ❌ Batal"]
    CONFIRM --> V9{Konfirmasi?}
    V9 -- Batal --> Cancel([Wizard dibatalkan])
    V9 -- Kirim --> POST["POST /api/reports\nStatus awal: Menunggu Verifikasi"]
    POST --> TK["🎉 Tiket ID: LH-YYYYMMDD-XXXX\nditerima di chatbot"]
    POST --> EMAIL["📧 Email notifikasi ke Moderator\nsesuai divisi kategori"]
```

**Kategori yang tersedia:**

| Enum | Label |
|---|---|
| `AKADEMIK` | Akademik & Kurikulum |
| `SARPRAS` | Fasilitas & Sarana Prasarana |
| `PELAYANAN` | Layanan Administrasi & Staf |
| `IT` | Sistem Informasi & IT Portal |
| `KEMAHASISWAAN` | Kemahasiswaan, Minat & Beasiswa |
| `KEUANGAN` | Keuangan & Biaya Kuliah |
| `ETIKA` | Etika, Perundungan & Pelecehan |
| `LAINNYA` | Lainnya |

**Tingkat urgensi:** Rendah · Sedang · Tinggi / Darurat

**Visibilitas:**
- **Publik** → masuk antrian moderasi feed publik (`moderationStatus = PENDING`)
- **Privat** → hanya bisa dilacak via kode tiket oleh pelapor

---

## 3. Status aduan & transisi

```mermaid
stateDiagram-v2
    [*] --> MenungguVerifikasi : Aduan terkirim
    MenungguVerifikasi --> SedangDiproses : Admin/Moderator update status
    SedangDiproses --> SelesaiDitindaklanjuti : Penanganan selesai
    SedangDiproses --> LaporanDiarsipkan : Ditolak/tidak valid
    MenungguVerifikasi --> LaporanDiarsipkan : Ditolak langsung
    SelesaiDitindaklanjuti --> [*]
    LaporanDiarsipkan --> [*]
```

Setiap perubahan status **dicatat di `report_timeline`** dengan: status, catatan, timestamp, nama/email aktor.

---

## 4. Alur moderasi via chatbot (Admin)

Admin dengan role `MODERATOR` atau `SUPER_ADMIN` bisa memoderasi aduan langsung dari chatbot menggunakan wizard tipe `MODERATE_REPORT`.

```mermaid
flowchart TD
    A[Admin klik 'Perlu Moderasi'] --> B["loadPendingModeration()\nFilter: status=Menunggu ATAU\nmoderationStatus=PENDING ATAU\ncategory=Lainnya"]
    B --> C[Tampil daftar tiket pending]
    C --> D[Admin klik tiket → startModeration]

    D --> M1["mod_category\n📦 Pindah kategori?\n(ketik 'tidak'/'sudah sesuai' = skip)"]
    M1 --> M2["mod_status\n⚙️ Set status baru:\nSedang Diproses / Selesai / Diarsipkan"]
    M2 --> M3["mod_note\n📝 Catatan/tanggapan\nuntuk pelapor (≥ 5 karakter)"]
    M3 --> M4["mod_confirm\n✅ Simpan / ❌ Batal"]
    M4 --> M5{Konfirmasi?}
    M5 -- Batal --> Cancel([Wizard dibatalkan])
    M5 -- Simpan --> API1["PATCH /api/reports/:id/category\n(jika kategori berubah)"]
    API1 --> API2["PATCH /api/reports/:id/status\n+ catat timeline"]
    API2 --> Done["✅ Moderasi selesai\nkembali ke menu utama"]
```

---

## 5. Alur lengkap di Panel Admin (browser)

Selain via chatbot, admin punya **Panel Admin** berfitur lebih lengkap.

```mermaid
flowchart LR
    subgraph Moderator/SuperAdmin
        A[Lihat semua tiket\nsesuai scope divisi] --> B[Update status + catatan]
        A --> C[Moderasi publikasi:\nAPPROVED / REJECTED]
        A --> D[Disposisi ke Staff\nPATCH /disposition]
        A --> E[Export Excel / PDF rekap]
    end

    subgraph Staff
        F[Lihat tiket yang\ndidisposisikan ke email mereka] --> G[Update status + reply komentar]
    end

    subgraph Pimpinan
        H[Baca semua aduan\ntanpa bisa mutasi]
    end
```

**Role-scoping query otomatis:**
- `MODERATOR` → hanya kategori dalam divisinya
- `STAFF` → hanya `disposed_to_email = session.email`
- `SUPER_ADMIN` / `PIMPINAN` → semua aduan

---

## 6. Lacak tiket

Pelapor bisa melacak tiket tanpa membuka menu khusus:

- Ketik **kode tiket** langsung di chat → pattern `/LH-\d{8}-\d{4}/i` terdeteksi otomatis
- Klik **"Aduan Saya"** → filter `reporterEmail = userEmail`

---

## 7. Notifikasi email

| Trigger | Penerima | Isi |
|---|---|---|
| Aduan baru terkirim | Moderator divisi terkait (fallback ke SUPER_ADMIN) | Kode tiket, judul, kategori, urgensi, link portal |
| Disposisi ke Staff | Staff yang ditunjuk | Kode tiket, judul, catatan disposisi, link portal |

Email dikirim **async** (tidak menahan response HTTP) via `sendNotificationEmail`.

---

## 8. Audit log

Setiap aksi admin (update status, disposisi, moderasi publikasi, ubah kategori, impersonasi) dicatat di tabel `audit_log` melalui `logAudit()` dengan: `actorEmail`, `action`, `targetType`, `targetId`, `details`, `timestamp`.

---

## 9. Feed publik

Aduan `isPublic = true` **hanya muncul di feed publik** jika `moderationStatus = 'APPROVED'`. Aduan privat tidak muncul di feed apapun kecuali oleh pemiliknya sendiri atau admin.

---

## 10. Ringkasan API endpoint

| Method | Endpoint | Auth | Fungsi |
|---|---|---|---|
| `GET` | `/api/auth/google/start` | — | Mulai OAuth |
| `GET` | `/api/auth/google/callback` | — | OAuth callback |
| `POST` | `/api/auth/dev-login` | — (dev only) | Login dummy |
| `GET` | `/api/auth/me` | Cookie | Cek sesi |
| `POST` | `/api/auth/logout` | Cookie | Logout |
| `POST` | `/api/auth/impersonate` | SUPER_ADMIN | Login sebagai user lain |
| `POST` | `/api/auth/end-impersonation` | Login | Akhiri impersonasi |
| `GET` | `/api/reports` | Cookie (scoped) | Daftar aduan |
| `POST` | `/api/reports` | Login | Buat aduan baru |
| `GET` | `/api/reports/:id` | — | Detail satu aduan |
| `PATCH` | `/api/reports/:id/status` | Actionable admin | Update status |
| `PATCH` | `/api/reports/:id/disposition` | Moderator+ | Disposisi ke Staff |
| `PATCH` | `/api/reports/:id/moderation` | Moderator+ | Approve/reject feed publik |
| `PATCH` | `/api/reports/:id/category` | Moderator+ | Ubah kategori |
| `POST` | `/api/reports/:id/comments` | Login | Tambah komentar |
| `GET` | `/api/reports/export` | Admin | Export Excel |
| `GET` | `/api/reports/export-pdf` | Admin | Export PDF rekap |
| `GET` | `/api/reports/:id/export-pdf` | Admin | Export PDF satu tiket |
| `POST` | `/api/uploads` | Login | Upload lampiran |

---

## 11. Struktur data tiket

```typescript
interface Report {
  id: string;                  // "LH-YYYYMMDD-XXXX"
  title: string;
  description: string;
  category: ReportCategory;
  status: ReportStatus;        // Menunggu Verifikasi → Sedang Diproses → Selesai / Diarsipkan
  urgency: UrgencyLevel;       // Rendah | Sedang | Tinggi / Darurat
  reporterName: string;        // "Anonim" jika anonim
  reporterRole?: ReporterRole; // Mahasiswa | Dosen FTI | Tendik | Alumni
  reporterEmail: string;
  reporterWhatsapp?: string;
  isPublic: boolean;
  moderationStatus?: "PENDING" | "APPROVED" | "REJECTED";
  createdAt: string;
  updatedAt: string;
  attachmentName?: string;
  attachmentPath?: string;
  disposedToEmail?: string;
  dispositionNote?: string;
  disposedBy?: string;
  disposedAt?: string;
  timeline: { status, note, timestamp, actorName? }[];
  comments: ReportComment[];
}
```
