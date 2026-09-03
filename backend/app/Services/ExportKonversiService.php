<?php

namespace App\Services;

use App\Models\PenetapanAK;

class ExportKonversiService
{
    protected CarryOverService $carryOverService;

    public function __construct(CarryOverService $carryOverService)
    {
        $this->carryOverService = $carryOverService;
    }

    /**
     * Ekspor seluruh data rekapitulasi konversi PAK menjadi format CSV.
     *
     * @param int|null $tahun
     * @return string
     */
    public function exportCsv(?int $tahun = null): string
    {
        $query = PenetapanAK::with([
            'pegawai.pangkatGolongan.jenjangJabatan',
        ]);

        if ($tahun) {
            $query->where('tahun', $tahun);
        }

        $records = $query->orderBy('tahun', 'desc')->get();

        $headers = [
            'Tahun',
            'NIP',
            'Nama Lengkap',
            'Golongan',
            'Jenjang Jabatan',
            'Pendidikan Terakhir',
            'TMT Jabatan',
            'AK Dasar',
            'AK PAK Pelantikan',
            'AK Saldo Historis',
            'AK Lama (Bawaan)',
            'AK Baru (Kinerja)',
            'AK Booster (Ijazah)',
            'Total AK Kumulatif',
            'Status Kelayakan',
            'Badge Label',
            'Deposit Carry-Over',
            'Kurang AK',
            'Keterangan',
        ];

        $output = fopen('php://temp', 'r+');
        fputcsv($output, $headers);

        foreach ($records as $item) {
            $pegawai = $item->pegawai;
            $pangkat = $pegawai?->pangkatGolongan;
            $jenjang = $pangkat?->jenjangJabatan;

            $kelayakan = $this->carryOverService->evaluasiKelayakan(
                $pegawai,
                (float) $item->ak_kumulatif
            );

            fputcsv($output, [
                $item->tahun,
                $pegawai?->nip ?? '-',
                $pegawai?->nama_lengkap ?? '-',
                $pangkat?->golongan ?? '-',
                $jenjang?->nama ?? '-',
                $pegawai?->pendidikan_terakhir ?? '-',
                $pegawai?->tmt_jabatan ? $pegawai->tmt_jabatan->format('Y-m-d') : '-',
                number_format((float) $item->ak_dasar, 2, '.', ''),
                number_format((float) $item->ak_pak_pelantikan, 2, '.', ''),
                number_format((float) $item->ak_historis, 2, '.', ''),
                number_format((float) $item->ak_lama, 2, '.', ''),
                number_format((float) $item->ak_baru, 2, '.', ''),
                number_format((float) $item->ak_booster, 2, '.', ''),
                number_format((float) $item->ak_kumulatif, 2, '.', ''),
                $kelayakan['status'],
                $kelayakan['badge_label'],
                number_format((float) $kelayakan['carry_over'], 2, '.', ''),
                number_format((float) $kelayakan['kurang_ak'], 2, '.', ''),
                $kelayakan['catatan'],
            ]);
        }

        rewind($output);
        $csvContent = stream_get_contents($output);
        fclose($output);

        return $csvContent;
    }
}
