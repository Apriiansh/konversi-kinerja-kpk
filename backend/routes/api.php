<?php

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;
use App\Http\Controllers\AuthController;
use App\Http\Controllers\EvaluasiKinerjaController;
use App\Http\Controllers\PengajuanPendidikanController;
use App\Http\Controllers\NotifikasiController;
use App\Http\Controllers\PegawaiController;
use App\Http\Controllers\RekapitulasiController;

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
        return $request->user()->load('pegawai.pangkatGolongan.jenjangJabatan');
    });

    // Evaluasi Kinerja (Penetapan Predikat & Kunci Kinerja)
    Route::get('/evaluasi', [EvaluasiKinerjaController::class, 'index']);
    Route::post('/evaluasi', [EvaluasiKinerjaController::class, 'store']);
    Route::post('/evaluasi/simulasi', [EvaluasiKinerjaController::class, 'simulasi']); // Preview hitung AK tanpa simpan
    Route::post('/evaluasi/{id}/lock', [EvaluasiKinerjaController::class, 'lock']);

    // Pengajuan Pendidikan & Booster Ijazah (+25% AK)
    Route::get('/pengajuan-pendidikan', [PengajuanPendidikanController::class, 'index']);
    Route::post('/pengajuan-pendidikan', [PengajuanPendidikanController::class, 'store']);
    Route::get('/pengajuan-pendidikan/{id}', [PengajuanPendidikanController::class, 'show']);
    Route::post('/pengajuan-pendidikan/{id}/verifikasi', [PengajuanPendidikanController::class, 'verifikasi']);

    // Notifikasi Pegawai / Admin
    Route::get('/notifikasi', [NotifikasiController::class, 'index']);
    Route::patch('/notifikasi/{id}/baca', [NotifikasiController::class, 'markAsRead']);
    Route::post('/notifikasi/baca-semua', [NotifikasiController::class, 'markAllAsRead']);

    // Pegawai (CRUD)
    Route::get('/pegawai', [PegawaiController::class, 'index']);
    Route::post('/pegawai', [PegawaiController::class, 'store']);
    Route::get('/pegawai/{id}', [PegawaiController::class, 'show']);
    Route::put('/pegawai/{id}', [PegawaiController::class, 'update']);
    Route::delete('/pegawai/{id}', [PegawaiController::class, 'destroy']);

    // Rekapitulasi / PAK
    Route::get('/rekapitulasi', [RekapitulasiController::class, 'index']);
    Route::get('/rekapitulasi/ringkasan', [RekapitulasiController::class, 'ringkasan']);
    Route::get('/rekapitulasi/{pegawaiId}/{tahun}', [RekapitulasiController::class, 'show'])->whereNumber('tahun');
    Route::post('/rekapitulasi/{pegawaiId}/{tahun}/finalisasi', [RekapitulasiController::class, 'finalisasi'])->whereNumber('tahun');
    Route::post('/rekapitulasi/{pegawaiId}/pak-pelantikan', [RekapitulasiController::class, 'simpanPakPelantikan']);
    Route::post('/rekapitulasi/{pegawaiId}/saldo-historis', [RekapitulasiController::class, 'simpanSaldoHistoris']);
});
