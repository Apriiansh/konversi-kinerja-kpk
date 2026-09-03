<?php

namespace App\Services;

use App\Models\EvaluasiKinerja;
use App\Models\MasterPredikatKinerja;
use App\Models\Pegawai;

class HitungKonversiService
{
    /**
     * Hitung Angka Kredit (AK) berdasarkan PerBKN 3/2023 (Formula A - Periodik).
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

        $koefisienTahunan = (float) $pegawai->pangkatGolongan->jenjangJabatan->koefisien_tahunan;
        $persentaseKonversi = (float) $predikat->persentase_konversi;

        // Hitung berdasarkan rumus
        $ak = ($periodeBulan / 12) * $persentaseKonversi * $koefisienTahunan;

        return round($ak, 2);
    }

    /**
     * Hitung jumlah bulan aktif dalam tahun tertentu berdasarkan TMT Jabatan pegawai.
     *
     * @param Pegawai $pegawai
     * @param int $tahun
     * @return int
     */
    public function hitungBulanAktif(Pegawai $pegawai, int $tahun): int
    {
        if (!$pegawai->tmt_jabatan) {
            return 12;
        }

        $tmt = \Carbon\Carbon::parse($pegawai->tmt_jabatan);
        if ($tmt->year < $tahun) {
            return 12;
        }

        if ($tmt->year > $tahun) {
            return 0;
        }

        // Contoh: TMT Maret (Bulan 3) di tahun yang sama -> 12 - 3 + 1 = 10 bulan aktif
        return max(1, min(12, 12 - $tmt->month + 1));
    }

    /**
     * Formula B: Normalisasi Akhir Tahun KPK (Jika Belum Naik Jabatan).
     * Predikat TW4 bertindak sebagai jangkar (anchor) retrospektif untuk menyetahunkan perolehan AK tahun berjalan.
     * Rumus: (Total Bulan Aktif / 12) x Persentase Predikat TW4 x Koefisien Tahunan
     *
     * @param string $pegawaiId
     * @param int $tahun
     * @param string|null $predikatTw4Id Jika null, akan diambil dari evaluasi TW4 terkunci
     * @return array
     */
    public function hitungAkTahunan(string $pegawaiId, int $tahun, ?string $predikatTw4Id = null): array
    {
        $pegawai = Pegawai::with('pangkatGolongan.jenjangJabatan')->findOrFail($pegawaiId);
        $koefisienTahunan = (float) $pegawai->pangkatGolongan->jenjangJabatan->koefisien_tahunan;

        // Cari evaluasi TW4 jika predikatTw4Id tidak disediakan langsung
        if (!$predikatTw4Id) {
            $evaluasiTw4 = EvaluasiKinerja::with('predikat')
                ->where('pegawai_id', $pegawaiId)
                ->where('tahun', $tahun)
                ->where(function ($q) {
                    $q->where('triwulan', 4)
                      ->orWhere('periode_bulan', 4)
                      ->orWhere('periode_bulan', 12);
                })
                ->orderByDesc('periode_bulan')
                ->first();

            if (!$evaluasiTw4) {
                // Ambil evaluasi terkunci terakhir di tahun tersebut sebagai fallback
                $evaluasiTw4 = EvaluasiKinerja::with('predikat')
                    ->where('pegawai_id', $pegawaiId)
                    ->where('tahun', $tahun)
                    ->orderByDesc('periode_bulan')
                    ->first();
            }

            if (!$evaluasiTw4 || !$evaluasiTw4->predikat) {
                throw new \InvalidArgumentException("Evaluasi kinerja TW4 untuk tahun {$tahun} belum ditemukan.");
            }

            $predikat = $evaluasiTw4->predikat;
        } else {
            $predikat = MasterPredikatKinerja::findOrFail($predikatTw4Id);
        }

        // Tentukan total bulan aktif dalam tahun berjalan
        $totalBulanAktif = $this->hitungBulanAktif($pegawai, $tahun);

        // Jika ada input evaluasi kinerja spesifik yang tercatat
        $sumBulanEvaluasi = EvaluasiKinerja::where('pegawai_id', $pegawaiId)
            ->where('tahun', $tahun)
            ->sum('jumlah_bulan');

        if ($sumBulanEvaluasi > 0 && $sumBulanEvaluasi <= 12) {
            $totalBulanAktif = $sumBulanEvaluasi;
        }

        $persentaseKonversi = (float) $predikat->persentase_konversi;
        $akRaw = ($totalBulanAktif / 12) * $persentaseKonversi * $koefisienTahunan;
        $akBaru = round($akRaw, 2);

        return [
            'total_bulan_aktif'   => $totalBulanAktif,
            'predikat_anchor'     => $predikat->nama,
            'persentase_predikat' => $persentaseKonversi,
            'koefisien_tahunan'   => $koefisienTahunan,
            'ak_baru'             => $akBaru,
            'rumus'               => "({$totalBulanAktif}/12) × {$persentaseKonversi} × {$koefisienTahunan} = {$akBaru} AK",
        ];
    }

    /**
     * Hitung PAK Awal Pelantikan dari masa kerja jenjang sebelumnya.
     * Rumus: (Tahun x Predikat x Koefisien) + ((Bulan/12) x Predikat x Koefisien)
     *
     * @param int $masaKerjaTahun
     * @param int $masaKerjaBulan
     * @param float $persentasePredikat
     * @param float $koefisienTahunan
     * @return array
     */
    public function hitungPakPelantikan(
        int $masaKerjaTahun,
        int $masaKerjaBulan,
        float $persentasePredikat = 1.0,
        float $koefisienTahunan = 12.5
    ): array {
        $akTahun = $masaKerjaTahun * $persentasePredikat * $koefisienTahunan;
        $akBulan = ($masaKerjaBulan / 12) * $persentasePredikat * $koefisienTahunan;

        $akTahunRounded = round($akTahun, 2);
        $akBulanRounded = round($akBulan, 2);
        $totalPak = round($akTahunRounded + $akBulanRounded, 2);

        return [
            'masa_kerja_tahun' => $masaKerjaTahun,
            'masa_kerja_bulan' => $masaKerjaBulan,
            'ak_tahun'         => $akTahunRounded,
            'ak_bulan'         => $akBulanRounded,
            'total_ak_pak'     => $totalPak,
        ];
    }
}
