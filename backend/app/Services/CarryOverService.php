<?php

namespace App\Services;

use App\Models\Pegawai;
use App\Models\PenetapanAK;

class CarryOverService
{
    /**
     * Evaluasi kelayakan kenaikan pangkat / jenjang dan hitung deposit carry-over ke tahun berikutnya.
     *
     * Aturan KPK / BKN:
     * 1. Kenaikan Pangkat (KP): Jika ak_kumulatif >= target_kp, sisa AK (ak_kumulatif - target_kp) dibawa sebagai deposit carry-over.
     * 2. Kenaikan Jenjang (Promosi): Jika ak_kumulatif >= target_jenjang, sisa AK TIDAK BOLEH ditabung (carry_over = 0 / HANGUS).
     * 3. Belum Cukup: ak_kumulatif dibawa utuh sebagai saldo awal tahun berikutnya.
     *
     * @param Pegawai $pegawai
     * @param float $akKumulatif
     * @return array
     */
    public function evaluasiKelayakan(Pegawai $pegawai, float $akKumulatif): array
    {
        $pegawai->loadMissing('pangkatGolongan.jenjangJabatan');
        $jenjang = $pegawai->pangkatGolongan?->jenjangJabatan;

        $targetKp = (float) ($jenjang->kebutuhan_ak_kp ?? 50.0);
        $targetJenjang = (float) ($jenjang->kebutuhan_ak_jenjang ?? 100.0);

        $status = 'BELUM_CUKUP';
        $badgeLabel = 'BELUM CUKUP AK';
        $badgeColor = 'warning'; // or red/orange in UI
        $carryOver = 0.0;
        $keterangan = '';
        $selisih = 0.0;

        // Cek kelayakan naik jenjang terlebih dahulu jika berlaku
        if ($targetJenjang < 9999 && $akKumulatif >= $targetJenjang) {
            $status = 'LAYAK_JENJANG';
            $badgeLabel = 'LAYAK NAIK JENJANG';
            $badgeColor = 'success';
            $carryOver = 0.0; // Hangus sesuai regulasi
            $keterangan = "Selamat! Pegawai telah memenuhi syarat AK untuk Kenaikan Jenjang Jabatan (Target: {$targetJenjang} AK). Sisa kelebihan AK direset ke 0 (hangus).";
        } elseif ($akKumulatif >= $targetKp) {
            $status = 'LAYAK_PANGKAT';
            $badgeLabel = 'LAYAK NAIK PANGKAT';
            $badgeColor = 'success';
            $carryOver = round($akKumulatif - $targetKp, 2);
            $keterangan = "Selamat! Pegawai telah memenuhi syarat AK untuk Kenaikan Pangkat (Target: {$targetKp} AK). Sisa tabungan AK sebesar {$carryOver} AK akan dibawa ke periode berikutnya.";
        } else {
            $status = 'BELUM_CUKUP';
            $badgeLabel = 'BELUM CUKUP AK';
            $badgeColor = 'secondary';
            $selisih = round($targetKp - $akKumulatif, 2);
            $carryOver = round($akKumulatif, 2); // Dibawa utuh karena belum naik pangkat
            $keterangan = "Angka Kredit belum mencukupi untuk Kenaikan Pangkat. Kurang {$selisih} AK dari target {$targetKp} AK. Seluruh saldo {$carryOver} AK disimpan untuk tahun depan.";
        }

        return [
            'status'          => $status,
            'badge_label'     => $badgeLabel,
            'badge_color'     => $badgeColor,
            'target_kp'       => $targetKp,
            'target_jenjang'  => $targetJenjang,
            'ak_kumulatif'    => $akKumulatif,
            'carry_over'      => $carryOver,
            'kurang_ak'       => $selisih,
            'catatan'         => $keterangan,
        ];
    }
}
