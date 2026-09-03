# Design System — Konversi Kinerja v2
> Sistem Penilaian Kinerja & Konversi Angka Kredit Jabatan Fungsional
> **Stack:** React 19 + Vite + Tailwind CSS v4 + Shadcn UI

---

## 1. Identitas Visual & Filosofi Desain

Aplikasi ini adalah alat kerja resmi kepegawaian. Desain **bukan** portofolio, **bukan** landing page — ia harus terasa seperti **sistem enterprise pemerintah yang serius, bersih, dan dapat dipercaya**, mengacu pada identitas visual KPK RI yang tegas dan akuntabel.

**Tiga Prinsip Utama:**
- **Clarity First** — Data harus terbaca tanpa usaha. Tidak ada dekorasi yang mengganggu fungsi.
- **Institutional Authority** — Merah dan Putih bukan sekadar warna, tapi simbol legalitas dan kepercayaan.
- **Functional Density** — Informasi padat namun tidak berdesakan. Setiap piksel punya tujuan.

---

## 2. Palet Warna

### Primary — KPK Institutional Red
| Token | Hex | Penggunaan |
|---|---|---|
| `kpk-700` | `#16080d` | Background login, heading gelap |
| `kpk-800` | `#3b0d16` | Gradient sidebar (dark) |
| `kpk-900` | `#6b1118` | Gradient banner header utama |
| `kpk-base` | `#ba191d` | **Warna merah utama KPK** — CTA, active state, badge |
| `kpk-hover` | `#a31519` | Hover state tombol merah |
| `kpk-light` | `#e11d24` | Aksen pada gradient |
| `kpk-50` | `#fef2f2` | Background chip/badge merah muda |
| `kpk-100` | `#fee2e2` | Border badge merah muda |

### Neutral — Surface & Text
| Token | Hex | Penggunaan |
|---|---|---|
| `white` | `#ffffff` | Card, modal, sidebar background |
| `surface` | `#fbfbfb` | Page background (bukan putih polos) |
| `gray-50` | `#fafbfc` | Field info background, zebra row |
| `gray-100` | `#f3f4f6` | Filter pills inactive, divider |
| `gray-200` | `#e5e7eb` | Border card, border input |
| `gray-400` | `#9ca3af` | Placeholder, label sekunder |
| `gray-500` | `#6b7280` | Label form, caption |
| `gray-700` | `#374151` | Teks menu navigation |
| `gray-900` | `#111827` | Body text utama, judul tabel |
| `foreground` | `#1e293b` | Teks utama keseluruhan |

### Semantic Colors
| Status | Warna | Hex |
|---|---|---|
| Sangat Baik | Emerald | `#059669` / bg `#ecfdf5` |
| Baik | Blue | `#1d4ed8` / bg `#eff6ff` |
| Butuh Perbaikan | Amber | `#d97706` / bg `#fffbeb` |
| Kurang | Orange | `#ea580c` / bg `#fff7ed` |
| Sangat Kurang | Red | `#dc2626` / bg `#fef2f2` |
| DISETUJUI | Emerald | `#059669` |
| DIAJUKAN | Blue | `#1d4ed8` |
| DITOLAK | Red | `#dc2626` |

---

## 3. Tipografi — Tahoma First

Font utama adalah **Tahoma** — *native Windows font* yang selama ini konsisten digunakan di lingkungan perkantoran pemerintah. Terasa familiar, otoritatif, dan efisien.

```css
font-family: "Tahoma", "Segoe UI", -apple-system, BlinkMacSystemFont, Roboto, sans-serif;
```

### Skala Tipografi

| Nama | Size | Weight | Penggunaan |
|---|---|---|---|
| `display` | `text-3xl` (30px) | `font-black` | Heading halaman login, banner hero |
| `heading-xl` | `text-xl` (20px) | `font-extrabold` | Judul halaman dashboard |
| `heading-lg` | `text-base` (16px) | `font-extrabold` | Heading section, judul card |
| `heading-sm` | `text-sm` (14px) | `font-extrabold` | Sub-heading, judul tabel |
| `body` | `text-sm` (14px) | `font-medium` | Teks konten utama |
| `caption` | `text-xs` (12px) | `font-medium` | Label field, deskripsi |
| `label` | `text-[11px]` | `font-bold` | Header tabel, badge teks |
| `mono` | `font-mono` | `font-extrabold` | NIP, AK value, angka numerik |

> **Aturan Angka:** Semua nilai numerik penting (NIP, nilai AK, golongan) menggunakan `font-mono` + `tracking-tight`.

---

## 4. Komponen Dasar

### 4.1 Button

```
Primary (Merah KPK):
  bg-[#ba191d] hover:bg-[#a31519] text-white
  rounded-xl px-4 py-2.5 text-xs font-extrabold
  shadow-sm transition-all

Secondary:
  bg-white border border-gray-200 text-gray-700
  hover:bg-gray-50 rounded-xl

Danger/Destructive:
  bg-red-50 text-red-700 hover:bg-red-100 border border-red-200

Ghost (menu sidebar):
  text-gray-700 hover:text-gray-900 hover:bg-gray-100 rounded-xl
```

**Aturan:** Tidak ada `cursor-default`, selalu pakai `cursor-pointer`. Semua tombol action utama menggunakan varian merah. Tombol sekunder/cancel selalu abu-abu atau ghost.

### 4.2 Card

```
Standard Card:
  bg-white rounded-xl border border-gray-200/80 p-4 sm:p-5 shadow-xs

Highlighted Card (KPK):
  bg-gradient-to-br from-red-900 to-[#ba191d] text-white rounded-xl p-4 shadow-md
  (digunakan untuk menampilkan Total AK Kumulatif)

Info Field Box:
  bg-[#fafbfc] border border-gray-200/70 rounded-lg p-2.5 sm:p-3
  (digunakan di dalam card profil untuk menampilkan nilai individual)
```

### 4.3 Badge & Chip

```
Role Badge:
  px-2.5 py-0.5 rounded-full text-[11px] font-extrabold
  - Admin:   text-[#ba191d] bg-red-50 border border-red-200
  - Pegawai: text-gray-700 bg-gray-100 border border-gray-200

Status Kepegawaian:
  inline-block px-2.5 py-0.5 text-[10px] font-extrabold rounded-full border
  - PNS:     bg-emerald-50 text-emerald-700 border-emerald-200
  - PPPK:    bg-blue-50 text-blue-700 border-blue-200
  - Non-PNS: bg-amber-50 text-amber-700 border-amber-200

Predikat Kinerja:
  - Sangat Baik:     bg-emerald-50 text-emerald-700 border-emerald-200
  - Baik:            bg-blue-50 text-blue-700 border-blue-200
  - Butuh Perbaikan: bg-amber-50 text-amber-700 border-amber-200
  - Kurang:          bg-orange-50 text-orange-700 border-orange-200
  - Sangat Kurang:   bg-red-50 text-red-700 border-red-200

"Jalur" Badge (Label Fitur):
  text-[10px] font-bold px-2 py-0.5 rounded
  bg-red-100 text-[#ba191d]
```

### 4.4 Form Input

```
Standard Input:
  w-full px-3 py-2 text-xs font-medium
  bg-gray-50 border border-gray-200 rounded-lg
  text-gray-800 placeholder-gray-400
  focus:bg-white focus:outline-none
  focus:border-gray-400 focus:ring-1 focus:ring-gray-300
  transition-colors

File Upload Area:
  border-2 border-dashed border-gray-200 rounded-xl p-8
  hover:border-[#ba191d]/40 hover:bg-red-50/30
  text-center transition-all cursor-pointer
  (active/drag: border-[#ba191d] bg-red-50/60)

Select:
  Same styling as Input
  appearance-none + custom caret icon merah

Label:
  text-xs font-bold text-gray-700 mb-1.5 block
```

### 4.5 Tabel Data

```
Container: overflow-x-auto border border-gray-200/70 rounded-xl

<thead>:
  bg-gray-50 border-b border-gray-200/80
  text-gray-500 font-extrabold text-[11px] uppercase tracking-wider
  py-3 px-3.5

<tbody>:
  divide-y divide-gray-100 font-medium bg-white

<tr>:
  hover:bg-gray-50/80 transition-colors

Nilai AK di tabel:
  font-mono font-bold text-gray-900

Empty State:
  colspan penuh, text-center py-10 text-gray-400 text-xs
```

---

## 5. Arsitektur Layout

### 5.1 Struktur Global

```
┌─────────────────────────────────────────────────┐
│  HEADER (fixed, h-16)                           │
│  Logo KPK | Breadcrumb | Notifikasi | Avatar    │
├──────────────┬──────────────────────────────────┤
│              │                                  │
│  SIDEBAR     │    MAIN CONTENT AREA             │
│  (fixed)     │    p-4 sm:p-6 overflow-y-auto    │
│              │                                  │
│  w-16 (rail) │                                  │
│  w-60 (full) │                                  │
│              │                                  │
└──────────────┴──────────────────────────────────┘
```

### 5.2 Header (Top Bar)

- **Height:** `h-16` (64px), `fixed top-0 left-0 right-0 z-40`
- **Background:** `bg-white border-b border-gray-200`
- **Kiri:** Logo KPK (SVG/PNG) + teks "Sistem Konversi Kinerja"
- **Kanan:** Ikon lonceng notifikasi (dengan badge merah jika ada unread) + Avatar + Nama user
- **Separator:** Border bawah tipis `border-gray-200`

### 5.3 Sidebar

- **Mode Desktop:** Fixed kiri, `top-16 bottom-0`, bisa collapse ke rail `w-16` atau expand `w-60`
- **Mode Mobile:** Slide-over drawer dari kiri, dimulai dari `top-16`
- **Background:** `bg-white border-r border-gray-200`
- **Active nav item:** `bg-[#ba191d] text-white rounded-xl` (merah solid)
- **Inactive nav item:** `text-gray-700 hover:bg-gray-100 rounded-xl`
- **Tooltip mode rail:** Popup tooltip kecil saat hover di mode collapsed
- **Profil card:** Di atas sidebar, dengan avatar + nama + jabatan. Click buka `ProfileModal`.

### 5.4 Main Content Grid

```
Spacing:  p-4 sm:p-6, space-y-4 (antar section)
Max-width: Tidak dibatasi (memanfaatkan seluruh area)
```

---

## 6. Halaman-Halaman Utama

### 6.1 Login Page

**Layout:** Fullscreen, centered, latar belakang animasi.

- **Background:** `linear-gradient(135deg, #16080d, #3b0d16, #6b1118)` + 3 blob merah mengambang (animasi CSS)
- **Partikel naik:** `position: absolute, animation: particle-rise` — partikel titik putih naik perlahan
- **Card Login:** `bg-white/95 backdrop-blur-sm`, rounded-2xl, shadow-xl, lebar 400px
  - Logo KPK di tengah atas
  - Heading: "Sistem Konversi Kinerja" — `text-xl font-black text-gray-900`
  - Sub: "PerBKN No. 3 Tahun 2023" — badge merah kecil
  - Input Email + Password dengan label "Email Kedinasan" / "Kata Sandi"
  - Tombol Submit merah penuh lebar dengan efek `shimmer-sweep` saat loading
  - Footer: versi sistem, hak cipta

### 6.2 Dashboard Admin

**Sections (top to bottom):**

1. **Welcome Banner** — `bg-white rounded-xl border`, ucapan selamat datang + tombol "Tambah Pegawai Baru" merah
2. **Quick Action Modules** — 2-column grid card (Inisialisasi Saldo + Penilaian Triwulan)
3. **4 Stat Cards** — Total Pegawai, PNS, PPPK, Non-PNS
4. **Daftar Pegawai Table** — Search + filter pills (Semua/PNS/PPPK/Non-PNS) + tabel

### 6.3 Dashboard Pegawai

**Sections (top to bottom):**

1. **Welcome Banner** — Nama, NIP, status kepegawaian. Soft gradient ambient di pojok kanan
2. **3 AK Summary Cards** — AK Lama | AK Baru | Total AK Kumulatif (card ketiga merah KPK gradient)
3. **2-Column Profile Grid:**
   - **Kiri:** Foto avatar, nama, jabatan, unit kerja. Fitur **Privacy Blur** — tombol mata tersembunyi data sensitif. Decorative wave SVG di bagian bawah card
   - **Kanan:** 7 field box (NIP, Status, Jabatan, Unit Kerja, Email, Telp, Alamat) — dengan Privacy Blur juga

### 6.4 Inisialisasi Saldo Awal (Jalur 1)

**Sections:**

1. **Banner Header Merah Gradient** — Judul + deskripsi singkat
2. **Upload Excel Area** — Drag & Drop zone, border dashed, hover merah
3. **Status dry-run validation** — Table preview sukses/error sebelum commit
4. **Tabel Saldo Pegawai** — Daftar pegawai dengan kolom AK Dasar, AK Lama, AK Baru, AK Kumulatif

### 6.5 Penilaian Triwulanan (Jalur 2)

**Sections:**

1. **Banner Header Biru** — Untuk jalur ini, biru (bukan merah) karena sifatnya lebih transaksional
2. **Filter Bar** — Filter Tahun + Triwulan + Search
3. **Tombol aksi:** "Tambah Manual" (modal) + "Import Excel"
4. **Tabel Penilaian** — NIP, Nama, Triwulan, Predikat (badge berwarna), AK Diperoleh, tombol lock/hapus

### 6.6 Rekapitulasi & PAK

**Sections:**

1. **Banner Header Merah Gradient Besar** — Judul + keterangan regulasi BKN
2. **Filter + Search + Tombol Cetak**
3. **Tabel PAK** — per baris expandable untuk lihat detail triwulan Q1-Q4
4. **Detail PAK Modal** — breakdown lengkap per triwulan + progress bar menuju target KP

### 6.7 Kalkulator BKN

**Sections:**

1. **Banner Header Merah** — Judul + tagline simulasi
2. **2-Column Grid:**
   - **Kiri (7 cols):** Form input (Jenjang, Saldo Awal, Predikat per Triwulan Q1-Q4)
   - **Kanan (5 cols):** Hasil Live Real-Time — Total AK, Progress bar, estimasi tahun tercapai
3. **Tabel Breakdown** — Detail 4 triwulan dengan formula yang ditampilkan

### 6.8 Pengajuan Pendidikan (Booster +25%)

**Sections:**

1. **Banner Header** — Status alur (diagram sederhana: Ajukan → Verifikasi → Disetujui/Ditolak)
2. **Form Upload** — Jenjang pendidikan, jurusan, institusi, tahun lulus + upload Ijazah + Bukti BKN
3. **Tabel Riwayat Pengajuan** — Status badge (DIAJUKAN/DISETUJUI/DITOLAK) + AK Bonus yang diperoleh

### 6.9 Riwayat Aktivitas (Admin only)

1. **Filter** — Berdasarkan Modul, Aksi, tanggal, nama user
2. **Timeline-style Table** — Waktu | User | Modul | Aksi | Deskripsi | Link ke detail data

---

## 7. Pola Interaksi

### 7.1 Modal

- **Overlay:** `bg-black/50 backdrop-blur-xs`
- **Panel:** `bg-white rounded-2xl shadow-2xl` — masuk dari bawah (`slideInUp`) atau center (`scale-in`)
- **Header modal:** `border-b border-gray-100 pb-4 mb-4`
- **Tombol tutup:** pojok kanan atas, `text-gray-400 hover:text-gray-700`

### 7.2 Loading & Empty State

```
Skeleton Loading:
  animate-pulse bg-gray-100 rounded-lg
  (gunakan pada card dan baris tabel saat data loading)

Empty Table:
  colspan penuh, py-12
  Ikon abu-abu kecil + teks "Belum ada data" + hint action

Error State:
  border border-red-200 bg-red-50 rounded-xl p-4
  text-red-700 text-xs font-medium
```

### 7.3 Toast / Notifikasi Inline

```
Success: bg-emerald-50 border-emerald-200 text-emerald-800
Error:   bg-red-50 border-red-200 text-red-800
Info:    bg-blue-50 border-blue-200 text-blue-800

Position: pojok kanan bawah, slide in dari kanan
Auto-dismiss: 4 detik
```

### 7.4 Konfirmasi Aksi Berbahaya

- Tidak menggunakan `window.confirm()` — gunakan **Dialog modal custom** Shadcn
- Tombol konfirmasi: `bg-red-600 text-white` untuk aksi destruktif
- Tombol batal: ghost / secondary

---

## 8. Animasi & Motion

> Semua animasi harus subtle dan fungsional, bukan dekoratif berlebihan.

| Elemen | Animasi | Duration |
|---|---|---|
| Halaman masuk | `opacity: 0 → 1`, `y: 10 → 0` | 300-350ms |
| Card & section | stagger `delay: 0.05s` per elemen | 300ms |
| Sidebar mobile | slide dari kiri `x: -100% → 0` | 220ms `easeOut` |
| Modal | scale-in `scale: 0.95 → 1` + fade | 200ms |
| Tombol aksi | `whileHover: scale(1.02)`, `whileTap: scale(0.98)` | — |
| Login blob | float + rotate lambat | 16-24s infinite |
| Login particles | rise vertikal | random 8-14s |

---

## 9. Implementasi di Tailwind CSS v4

### 9.1 Konfigurasi Tema (`src/index.css`)

```css
@import "tailwindcss";

:root {
  --kpk-base:    #ba191d;
  --kpk-hover:   #a31519;
  --kpk-dark:    #6b1118;
  --kpk-darker:  #3b0d16;
  --kpk-darkest: #16080d;
  --background:  #fbfbfb;
  --foreground:  #1e293b;
}

@theme inline {
  --color-background: var(--background);
  --color-foreground: var(--foreground);
  --color-kpk:        var(--kpk-base);
  --color-kpk-hover:  var(--kpk-hover);
  --font-sans: "Tahoma", "Segoe UI", -apple-system, BlinkMacSystemFont, Roboto, sans-serif;
}

body {
  background-color: var(--background);
  color: var(--foreground);
  font-family: "Tahoma", "Segoe UI", -apple-system, BlinkMacSystemFont, Roboto, sans-serif;
  letter-spacing: -0.01em;
  -webkit-font-smoothing: antialiased;
}
```

### 9.2 Konfigurasi Shadcn UI (`components.json`)

```json
{
  "style": "default",
  "tailwind": { "baseColor": "neutral", "cssVariables": true },
  "aliases": { "components": "@/components", "utils": "@/lib/utils" }
}
```

Semua komponen Shadcn (Button, Dialog, Table, Badge, Form) di-override menggunakan class Tailwind kita, sehingga tidak terasa "generik".

---

## 10. Checklist Anti AI-Slop

- [ ] Tidak ada rounded-full pada tombol besar (gunakan rounded-xl)
- [ ] Tidak ada gradient pelangi atau warna-warni berlebihan
- [ ] Tidak ada ikon emoji sebagai pengganti ikon SVG
- [ ] Tidak ada font Google yang tidak konsisten dengan Tahoma
- [ ] Tidak ada animasi `bounce` atau `ping` berlebihan
- [ ] Setiap angka numerik penting menggunakan `font-mono`
- [ ] Tombol CTA utama SELALU merah KPK `#ba191d`
- [ ] Card selalu `bg-white` dengan `border` tipis, bukan warna lain
- [ ] Privacy blur pada data sensitif (NIP, Alamat, Nomor Telepon) harus dipertahankan dari proyek lama
- [ ] Tabel selalu memiliki `hover:bg-gray-50/80` untuk readability baris
