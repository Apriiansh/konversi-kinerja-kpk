# PERHITUNGAN KONVERSI KINERJA

Dokumen berisi perhitungan Angka Kredit (AK) konversi kinerja sesuai **Peraturan BKN No. 3 Tahun 2023**, dengan beberapa kondisi/skenario. Semua angka di sini dihitung dari rumus dan nilai master yang **benar-benar dipakai di backend**, sehingga dapat diverifikasi ulang.

- Sumber rumus: `app/Services/HitungKonversiService.php`
- Sumber booster: `app/Services/BoosterIjazahService.php`
- Sumber data master: `database/seeders/MasterDataSeeder.php`

---

## 1. Rumus & Konstanta

### 1.1 Rumus Konversi AK

```
AK = (jumlah_bulan / 12) × persentase_predikat × koefisien_tahunan_jenjang
```

- `jumlah_bulan` : 1–12 (durasi periode kinerja dalam setahun).
- `persentase_predikat` : 0.25 – 1.50 (dari predikat kinerja).
- `koefisien_tahunan` : nilai tetap per jenjang jabatan.
- Hasil dibulatkan ke **2 desimal** (`round($ak, 2)`).

### 1.2 Master Jenjang Jabatan

| Jenjang | Koefisien Tahunan | Kebutuhan AK Kenaikan Pangkat (KP) | Kebutuhan AK Naik Jenjang |
|---|---|---|---|
| Ahli Pertama | 12.50 | 50 | 100 |
| Ahli Muda | 25.00 | 100 | 200 |
| Ahli Madya | 37.50 | 150 | 450 |
| Ahli Utama | 50.00 | 200 | 9999 |

### 1.3 Master Predikat Kinerja

| Predikat | Persentase Konversi |
|---|---|
| Sangat Baik | 150% (1.50) |
| Baik | 100% (1.00) |
| Butuh Perbaikan | 75% (0.75) |
| Kurang | 50% (0.50) |
| Sangat Kurang | 25% (0.25) |

### 1.4 Rumus Booster Ijazah (+25%)

```
AK_Bonus = 25% × kebutuhan_ak_kp_jenjang_saat_ini
```

Bonus hanya diberikan jika memenuhi syarat otomatis (lihat bagian 7).

---

## 2. Skenario A — Per Triwulan (Q1–Q4, Bulan Parsial)

Contoh: **Ahli Pertama** (koefisien 12.5), predikat **Baik** (100%).

| Periode | Bulan | Perhitungan | AK (2 desimal) |
|---|---|---|---|
| Triwulan 1 (Q1) | 3 | (3/12) × 1.00 × 12.5 = 3.125 | **3.13** |
| Triwulan 2 (Q2) | 6 | (6/12) × 1.00 × 12.5 = 6.25 | **6.25** |
| Triwulan 3 (Q3) | 9 | (9/12) × 1.00 × 12.5 = 9.375 | **9.38** |
| Triwulan 4 / Tahunan (Q4) | 12 | (12/12) × 1.00 × 12.5 = 12.5 | **12.50** |
| Semester 1 | 6 | (6/12) × 1.00 × 12.5 = 6.25 | **6.25** |
| Semester 2 | 12 | (12/12) × 1.00 × 12.5 = 12.5 | **12.50** |

> Catatan: Q4 = 12 bulan berarti perhitungan 1 tahun penuh. Bulan parsial memberi AK proporsional.

---

## 3. Skenario B — Variasi Predikat

Contoh: **Ahli Pertama** (koefisien 12.5), durasi **12 bulan**.

| Predikat | % | Perhitungan | AK |
|---|---|---|---|
| Sangat Baik | 150% | (12/12) × 1.50 × 12.5 = 18.75 | **18.75** |
| Baik | 100% | (12/12) × 1.00 × 12.5 = 12.5 | **12.50** |
| Butuh Perbaikan | 75% | (12/12) × 0.75 × 12.5 = 9.375 | **9.38** |
| Kurang | 50% | (12/12) × 0.50 × 12.5 = 6.25 | **6.25** |
| Sangat Kurang | 25% | (12/12) × 0.25 × 12.5 = 3.125 | **3.13** |

---

## 4. Skenario C — Per Jenjang Jabatan

Contoh: durasi **12 bulan**, predikat **Sangat Baik** (150%).

| Jenjang | Koefisien | Perhitungan | AK/Tahun |
|---|---|---|---|
| Ahli Pertama | 12.5 | (12/12) × 1.50 × 12.5 = 18.75 | **18.75** |
| Ahli Muda | 25.0 | (12/12) × 1.50 × 25.0 = 37.5 | **37.50** |
| Ahli Madya | 37.5 | (12/12) × 1.50 × 37.5 = 56.25 | **56.25** |
| Ahli Utama | 50.0 | (12/12) × 1.50 × 50.0 = 75 | **75.00** |

---

## 5. Skenario D — Target Kenaikan Pangkat (KP)

Berapa tahun penuh dengan predikat **Sangat Baik** agar AK kumulatif mencapai kebutuhan KP tiap jenjang.

| Jenjang | Target KP | AK/Tahun (SB) | Estimasi Tahun (matematis) | Estimasi Praktis |
|---|---|---|---|---|
| Ahli Pertama | 50 | 18.75 | 50 / 18.75 = **2.67** | **3 tahun** |
| Ahli Muda | 100 | 37.50 | 100 / 37.50 = **2.67** | **3 tahun** |
| Ahli Madya | 150 | 56.25 | 150 / 56.25 = **2.67** | **3 tahun** |
| Ahli Utama | 200 | 75.00 | 200 / 75.00 = **2.67** | **3 tahun** |

### 5.1 Contoh titik kumulatif mencapai target (Ahli Pertama)

Target KP = **50**, predikat Sangat Baik → +18.75/tahun:

| Tahun | AK Baru Tahunan | AK Kumulatif | Capai Target? |
|---|---|---|---|
| Tahun 1 | 18.75 | 18.75 | Belum |
| Tahun 2 | 18.75 | 37.50 | Belum |
| Tahun 3 | 18.75 | 56.25 | **Ya (melewati 50)** |

> Kumulatif baru melampaui target 50 pada **awal triwulan tahun ke-3** (56.25 > 50). Dengan asumsi semua akumulasi berasal dari kinerja Sangat Baik.

---

## 6. Skenario E — Matriks Lengkap (Semua Kombinasi)

AK dalam **12 bulan** untuk setiap kombinasi Jenjang × Predikat.

| Jenjang | Sangat Baik (150%) | Baik (100%) | Butuh Perbaikan (75%) | Kurang (50%) | Sangat Kurang (25%) |
|---|---|---|---|---|---|
| **Ahli Pertama** (12.5) | 18.75 | 12.50 | 9.38 | 6.25 | 3.13 |
| **Ahli Muda** (25.0) | 37.50 | 25.00 | 18.75 | 12.50 | 6.25 |
| **Ahli Madya** (37.5) | 56.25 | 37.50 | 28.13 | 18.75 | 9.38 |
| **Ahli Utama** (50.0) | 75.00 | 50.00 | 37.50 | 25.00 | 12.50 |

Contoh hitung (Ahli Madya, Butuh Perbaikan): (12/12) × 0.75 × 37.5 = 28.125 → **28.13**.

---

## 7. Booster Ijazah (+25% AK)

### 7.1 Syarat Otomatis

Syarat berikut harus **seluruhnya terpenuhi** (`app/Services/BoosterIjazahService.php`):

1. **Pendidikan lebih tinggi** — jenjang yang diajukan lebih tinggi dari pendidikan terakhir pegawai.
2. **Predikat kinerja minimal "Baik"** — evaluasi terakhir memiliki persentase konversi ≥ 100%.
3. **Belum pernah dapat bonus** untuk jenjang/strata yang sama (status `DISETUJUI`).

Jika gagal salah satu → status `DITOLAK_SYARAT`.

### 7.2 Nilai Bonus per Jenjang

```
AK_Bonus = 25% × kebutuhan_ak_kp_jenjang
```

| Jenjang Saat Ini | Kebutuhan KP | 25% | AK Bonus |
|---|---|---|---|
| Ahli Pertama | 50 | 25% × 50 | **12.50** |
| Ahli Muda | 100 | 25% × 100 | **25.00** |
| Ahli Madya | 150 | 25% × 150 | **37.50** |
| Ahli Utama | 200 | 25% × 200 | **50.00** |

### 7.3 Contoh Perhitungan

**Kasus:** Pegawai **Ahli Pertama** (target KP 50) menyelesaikan **S2**, predikat terakhir **Sangat Baik**, belum pernah bonus S2.

```
AK_Bonus = 25% × 50 = 12.50
```

> Nilai ini sudah diverifikasi di test `KonversiKinerjaTest` (ak_bonus = 12.50).

**Kasus ditolak sistem:** Pegawai mengajukan **S1** padahal pendidikan terakhir sudah **S1** → tidak lebih tinggi → `DITOLAK_SYARAT`.

---

## 8. Contoh Rekapitulasi PAK

Struktur data `penetapan_ak` dan cara pembacaannya:

| Kolom | Arti |
|---|---|
| `ak_dasar` | AK dasar sesuai pangkat/golongan (nilai awal struktur). |
| `ak_lama` | Akumulasi AK sebelum tahun berjalan (saldo awal). |
| `ak_baru` | AK yang diperoleh pada tahun berjalan (dari kinerja). |
| `ak_kumulatif` | Total `ak_lama` + `ak_baru` (saldo akhir). |

### 8.1 Contoh Angka (Ahli Muda, tahun 2025)

Skema pengisian awal (dari `InisialisasiSaldoAkSeeder`):

- `ak_dasar` = 100 (golongan III/d)
- `ak_lama` = 100
- `ak_baru` = 0
- `ak_kumulatif` = 100

Setelah kinerja tahun berjalan (predikat Sangat Baik, 12 bulan):

- `ak_baru` = **37.50**
- `ak_kumulatif` = 100 + 37.50 = **137.50**

### 8.2 Rincian Triwulan (sesuai `RekapitulasiController`)

Contoh pegawai Ahli Pertama, predikat Sangat Baik, tersebar 12 bulan:

| Triwulan | Bulan | AK Diperoleh per Periode (3 Bulan) | AK Akumulasi Berjalan (Cumulative) |
|---|---|---|---|
| Q1 | 1–3 | 3 × 1.5625 = 4.6875 | **4.69** |
| Q2 | 4–6 | 3 × 1.5625 = 4.6875 | **9.38** |
| Q3 | 7–9 | 3 × 1.5625 = 4.6875 | **14.06** |
| Q4 | 10–12 | 3 × 1.5625 = 4.6875 | **18.75** |

> AK per bulan (Ahli Pertama, Sangat Baik) = (1/12) × 1.50 × 12.5 = 1.5625.
> Total 12 bulan = 4 × 4.6875 = **18.75 AK**, sinkron dengan Bagian 3, 4, dan 9.

---

## 9. Contoh Perhitungan Lengkap (Langkah Detail)

**Kasus:** Pegawai **Ahli Pertama**, predikat **Sangat Baik** (150%), **12 bulan** penuh.

```
Rumus: AK = (jumlah_bulan / 12) × persentase_predikat × koefisien_tahunan

AK = (12 / 12) × 1.50 × 12.5
   = 1 × 1.50 × 12.5
   = 18.75 AK
```

**Verifikasi:** nilai **18.75** sesuai output endpoint `POST /api/evaluasi` dan test `KonversiKinerjaTest`.

**Kasus semi-tahunan (6 bulan), Ahli Muda, predikat Baik:**

```
AK = (6 / 12) × 1.00 × 25.0
   = 0.5 × 1.00 × 25.0
   = 12.50 AK
```

---

## Verifikasi Keseluruhan

- ✅ Skenario A–E berasal dari rumus & nilai master yang persis sama dengan backend.
- ✅ Nilai acuan **18.75** (evaluasi) & **12.50** (booster) sudah lolos uji otomatis & live test.
- ✅ Struktur rekapitulasi PAK mengikuti field yang ada di tabel `penetapan_ak`.

> Untuk informasi hasil uji API menyeluruh (auth, endpoint, keamanan), lihat file `HASIL_TEST_API.md`.