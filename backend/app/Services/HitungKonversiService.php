<?php

namespace App\Services;

use App\Models\EvaluasiKinerja;
use App\Models\MasterPredikatKinerja;
use App\Models\Pegawai;

class HitungKonversiService
{
    /**
     * Hitung Angka Kredit (AK) berdasarkan PerBKN 3/2023.
     * Rumus: (Bulan / 12) x Persentase Predikat x Koefisien Tahunan
     *
     * @param string $pegawaiId
     * @param string $predikatId
     * @param int $periodeBulan
     * @return float
     */
    public function hitungAk(string $pegawaiId, string $predikatId, int $periodeBulan): float
    {
        $pegawai = Pegawai::with('pangkatGolongan.jenjangJabatan')->findOrFail($pegawaiId);
        $predikat = MasterPredikatKinerja::findOrFail($predikatId);

        $koefisienTahunan = $pegawai->pangkatGolongan->jenjangJabatan->koefisien_tahunan;
        $persentaseKonversi = $predikat->persentase_konversi;

        // Hitung berdasarkan rumus
        $ak = ($periodeBulan / 12) * $persentaseKonversi * $koefisienTahunan;

        return round($ak, 2);
    }
}
