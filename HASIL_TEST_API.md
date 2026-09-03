# HASIL TEST API — Konversi Kinerja v2

Dokumen ini berisi hasil pengujian API backend, baik **uji otomatis (PHPUnit)** maupun **uji langsung (live test)** terhadap server yang berjalan.

- Tanggal uji: 2026-09-03
- Backend: Laravel 13.30.1 (PostgreSQL live, SQLite `:memory:` untuk test)
- Frontend: React + Vite (proxy `/api` → `http://localhost:8000`)
- Auth: **Bearer token** via Laravel Sanctum

---

## 1. Uji Otomatis — PHPUnit

```bash
php artisan test
```

**Hasil: 9 tests passed, 36 assertions.**

| Test | Status |
|---|---|
| KonversiKinerjaTest -> evaluasi kinerja & rumus BKN | ✅ PASS |
| KonversiKinerjaTest -> alur booster ijazah +25% | ✅ PASS |
| PegawaiRekapitulasiTest -> admin membuat pegawai baru | ✅ PASS |
| PegawaiRekapitulasiTest -> pegawai hanya lihat datanya sendiri | ✅ PASS |
| PegawaiRekapitulasiTest -> rekapitulasi rincian PAK & triwulan | ✅ PASS |
| PegawaiRekapitulasiTest -> ringkasan hanya admin | ✅ PASS |
| PegawaiRekapitulasiTest -> update & hapus pegawai | ✅ PASS |
| ExampleTest (Unit + Feature) | ✅ PASS |

> Catatan: test memakai SQLite in-memory agar tidak merusak data PostgreSQL live.

---

## 2. Uji Langsung (Live) — Admin Token

Login `admin@kpk.go.id` / `password123` → **200**, dapat token bearer.

| Endpoint | Method | Hasil |
|---|---|---|
| `/api/login` | POST | ✅ 200 |
| `/api/me` | GET | ✅ 200 |
| `/api/user` | GET | ✅ 200 |
| `/api/pegawai` | GET | ✅ 200 |
| `/api/rekapitulasi` | GET | ✅ 200 |
| `/api/rekapitulasi/ringkasan` | GET | ✅ 200 |
| `/api/notifikasi` | GET | ✅ 200 |
| `/api/pengajuan-pendidikan` | GET | ✅ 200 |

Contoh respons `/api/login` (token di potong):

```json
{
  "message": "Login berhasil.",
  "token": "4|7ab9Wjx2WAXuI...",
  "user": { "name": "Ahmad Fajar, S.Kom", "email": "pegawai@kpk.go.id", "role": "PEGAWAI" }
}
```

---

## 3. Uji Langsung (Live) — Pegawai Token

Login `pegawai@kpk.go.id` / `password123` → **200**.

| Endpoint | Method | Hasil |
|---|---|---|
| `/api/me` | GET | ✅ 200 |
| `/api/pegawai` | GET | ✅ 200 (hanya data sendiri) |
| `/api/rekapitulasi/ringkasan` | GET | ✅ 403 (hanya admin) |
| `/api/evaluasi` (tanpa `predikat_id`) | POST | ✅ 422 (validasi gagal) |

---

## 4. Uji Keamanan Auth

| Skenario | Hasil |
|---|---|
| Request dengan token valid | ✅ 200 |
| Request **tanpa** token | ✅ **401** |
| Request dengan token **salah** | ✅ **401** |
| Akses resource admin sebagai pegawai | ✅ **403** |

---

## 5. Verifikasi Frontend ↔ Backend (Proxy Vite)

Frontend dev (`localhost:5173`) mem-proxy `/api/*` ke backend (`localhost:8000`).

```powershell
POST http://localhost:5173/api/login
Body: {"email":"pegawai@kpk.go.id","password":"password123"}
```

**Hasil: 200** dengan token → **frontend berhasil terhubung ke backend.**

---

## 6. Kesimpulan

- ✅ Auth **bearer token (Sanctum)** berfungsi penuh (login/logout/me).
- ✅ Semua endpoint yang tersedia berperilaku sesuai (auth, role-check, validasi).
- ✅ 401 untuk tanpa/salah token, 403 untuk akses terlarang.
- ✅ Frontend React terhubung ke backend melalui Vite proxy dengan header `Authorization: Bearer`.
- ✅ Test PHPUnit memakai SQLite in-memory sehingga aman dari data live.

**Catatan:** untuk menguji lewat Postman/axios, cukup kirim header
`Authorization: Bearer <token>` — bukan cookie.
