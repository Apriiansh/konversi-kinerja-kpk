<?php

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;
use App\Http\Controllers\AuthController;
use App\Http\Controllers\EvaluasiKinerjaController;
use App\Http\Controllers\MasterDataController;
use App\Http\Controllers\PengajuanPendidikanController;
use App\Http\Controllers\ImportExportController;
use App\Http\Controllers\NotifikasiController;
use App\Http\Controllers\PegawaiController;
use App\Http\Controllers\RekapitulasiController;
use App\Http\Controllers\RiwayatAktivitasController;

// Public info master data
Route::get('/master-data', [MasterDataController::class, 'index']);

// Public Auth Endpoints
Route::post('/login', [AuthController::class, 'login']);

// Fallback untuk unauthenticated request (mencegah error "Route [login] not defined").
Route::get('/login', function () {
    return response()->json(['message' => 'Unauthenticated.'], 401);
})->name('login');

// Authenticated Endpoints
Route::middleware('auth:sanctum')->group(function () {
    Route::post('/logout', [AuthController::class, 'logout']);
    Route::get('/me', [AuthController::class, 'me']);
    Route::get('/user', function (Request $request) {
        return $request->user()->load('pegawai.pangkatGolongan.jenjangJabatan', 'pegawai.jenjangJabatan');
    });

    // Evaluasi Kinerja (Penetapan Predikat & Kunci Kinerja)
    Route::get('/evaluasi', [EvaluasiKinerjaController::class, 'index']);
    Route::post('/evaluasi', [EvaluasiKinerjaController::class, 'store']);
    Route::post('/evaluasi/simulasi', [EvaluasiKinerjaController::class, 'simulasi']); // Preview hitung AK tanpa simpan
    Route::post('/evaluasi/{id}/lock', [EvaluasiKinerjaController::class, 'lock']);

    // CRUD Evaluasi
    Route::get('evaluasi/context/{pegawaiId}/{tahun}', [EvaluasiKinerjaController::class, 'context'])->whereNumber('tahun');
    Route::get('evaluasi/{id}', [EvaluasiKinerjaController::class, 'show']);
    Route::put('evaluasi/{id}', [EvaluasiKinerjaController::class, 'update']);
    Route::delete('evaluasi/{id}', [EvaluasiKinerjaController::class, 'destroy']);

    // Pengajuan Pendidikan & Booster Ijazah (+25% AK)
    Route::get('/pengajuan-pendidikan', [PengajuanPendidikanController::class, 'index']);
    Route::post('/pengajuan-pendidikan', [PengajuanPendidikanController::class, 'store']);
    Route::get('/pengajuan-pendidikan/{id}', [PengajuanPendidikanController::class, 'show']);
    Route::post('/pengajuan-pendidikan/{id}/verifikasi', [PengajuanPendidikanController::class, 'verifikasi']);
    Route::delete('/pengajuan-pendidikan/{id}', [PengajuanPendidikanController::class, 'destroy']);

    // Notifikasi Pegawai / Admin
    Route::get('/notifikasi', [NotifikasiController::class, 'index']);
    Route::patch('/notifikasi/{id}/baca', [NotifikasiController::class, 'markAsRead']);
    Route::post('/notifikasi/baca-semua', [NotifikasiController::class, 'markAllAsRead']);

    // Riwayat Aktivitas
    Route::get('/aktivitas', [RiwayatAktivitasController::class, 'index']);

    // Kampus — autocomplete dari mytable.name (searchable, manual fallback)
    Route::get('/kampus', function (Illuminate\Http\Request $request) {
        $search = trim((string) $request->query('search', ''));
        $limit = min(20, max(5, (int) $request->query('limit', 10)));
        $q = Illuminate\Support\Facades\DB::table('mytable')->select('id', 'name', 'country');
        if ($search !== '') {
            $q->where('name', 'ilike', "%{$search}%");
        }
        // prioritaskan Indonesia
        $q->orderByRaw("CASE WHEN country = 'Indonesia' THEN 0 ELSE 1 END")->orderBy('name');
        return response()->json(['data' => $q->limit($limit)->get()]);
    });

    // Prodi — autocomplete dari myprodi.nm_prodi (searchable, manual fallback)
    Route::get('/prodi', function (Illuminate\Http\Request $request) {
        $search = trim((string) $request->query('search', ''));
        $jenjang = trim((string) $request->query('jenjang', ''));
        $limit = min(20, max(5, (int) $request->query('limit', 10)));
        $q = Illuminate\Support\Facades\DB::table('myprodi')->select('id', 'nm_prodi', 'kel_jenj', 'kode_prodi', 'nm_jenj_didik');
        if ($search !== '') {
            $q->where('nm_prodi', 'ilike', "%{$search}%");
        }
        // filter by jenjang if provided (map D3/S1/S2/S3 -> kel_jenj like S-2 etc)
        if ($jenjang !== '') {
            $map = ['D3' => 'D-III', 'S1' => 'S-1', 'S2' => 'S-2', 'S3' => 'S-3'];
            $kel = $map[strtoupper($jenjang)] ?? null;
            if ($kel) $q->where('kel_jenj', $kel);
        }
        $q->orderBy('nm_prodi');
        return response()->json(['data' => $q->limit($limit)->get()]);
    });

    // Pegawai (CRUD)
    Route::get('/pegawai', [PegawaiController::class, 'index']);
    Route::post('/pegawai', [PegawaiController::class, 'store']);
    Route::get('/pegawai/{id}', [PegawaiController::class, 'show']);
    Route::put('/pegawai/{id}', [PegawaiController::class, 'update']);
    Route::delete('/pegawai/{id}', [PegawaiController::class, 'destroy']);

    // Rekapitulasi / PAK
    Route::get('/rekapitulasi', [RekapitulasiController::class, 'index']);
    Route::get('/rekapitulasi/ringkasan', [RekapitulasiController::class, 'ringkasan']);
    Route::get('/rekapitulasi/export', [ImportExportController::class, 'export']);
    Route::get('/rekapitulasi/{pegawaiId}/{tahun}/live', [RekapitulasiController::class, 'showLive'])->whereNumber('tahun');
    Route::get('/rekapitulasi/{pegawaiId}/{tahun}', [RekapitulasiController::class, 'show'])->whereNumber('tahun');
    Route::post('/rekapitulasi/{pegawaiId}/{tahun}/finalisasi', [RekapitulasiController::class, 'finalisasi'])->whereNumber('tahun');
    Route::post('/rekapitulasi/{pegawaiId}/pak-pelantikan', [RekapitulasiController::class, 'simpanPakPelantikan']);
    Route::post('/rekapitulasi/{pegawaiId}/saldo-historis', [RekapitulasiController::class, 'simpanSaldoHistoris']);

    // Modul Import & Auto-Konversi Kinerja Massal (All-in-One)
    Route::get('/import/template', [ImportExportController::class, 'downloadTemplate']);
    Route::post('/import/preview', [ImportExportController::class, 'preview']);
    Route::post('/import/proses', [ImportExportController::class, 'proses']);
});
