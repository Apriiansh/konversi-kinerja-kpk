<?php

namespace App\Services;

use App\Models\Notifikasi;
use App\Models\Pegawai;
use App\Models\PenetapanAK;
use App\Models\PengajuanPendidikan;
use App\Models\User;
use Illuminate\Support\Facades\DB;

class FinalisasiAkService
{
    protected HitungKonversiService $hitungKonversi;
    protected CarryOverService $carryOverService;
    protected AuditTrailService $auditTrail;

    public function __construct(
        HitungKonversiService $hitungKonversi,
        CarryOverService $carryOverService,
        AuditTrailService $auditTrail
    ) {
        $this->hitungKonversi = $hitungKonversi;
        $this->carryOverService = $carryOverService;
        $this->auditTrail = $auditTrail;
    }

    /**
     * Finalisasi Angka Kredit Tahunan Pegawai.
     * Mengkalkulasi Formula B (TW4 Anchor), mengakumulasi Booster Ijazah, PAK Pelantikan,
     * menentukan badge status kelayakan KP/Jenjang, dan menyiapkan carry-over ke tahun depan.
     *
     * @param string $pegawaiId
     * @param int $tahun
     * @param User|null $admin
     * @param string|null $predikatTw4Id
     * @return PenetapanAK
     */
    public function finalisasi(
        string $pegawaiId,
        int $tahun,
        ?User $admin = null,
        ?string $predikatTw4Id = null
    ): PenetapanAK {
        $pegawai = Pegawai::with(['pangkatGolongan.jenjangJabatan', 'user'])->findOrFail($pegawaiId);

        return DB::transaction(function () use ($pegawai, $tahun, $admin, $predikatTw4Id) {
            // 1. Ambil atau inisialisasi record PenetapanAK tahun ini
            $penetapan = PenetapanAK::firstOrCreate(
                [
                    'pegawai_id' => $pegawai->id,
                    'tahun'      => $tahun,
                ],
                [
                    'ak_dasar'          => $pegawai->pangkatGolongan?->ak_dasar ?? 0,
                    'ak_pak_pelantikan' => 0,
                    'ak_historis'       => 0,
                    'ak_lama'           => 0,
                    'ak_baru'           => 0,
                    'ak_booster'        => 0,
                    'ak_carry_over'     => 0,
                    'ak_kumulatif'      => 0,
                    'status_kelayakan'  => 'BELUM_CUKUP',
                    'is_final'          => false,
                ]
            );

            // 2. Hitung AK Baru menggunakan Formula B (TW4 Anchor)
            $hasilTahunan = $this->hitungKonversi->hitungAkTahunan($pegawai->id, $tahun, $predikatTw4Id);
            $akBaru = $hasilTahunan['ak_baru'];

            // 3. Ambil total Booster Ijazah yang disetujui di tahun ini
            $akBooster = (float) PengajuanPendidikan::where('pegawai_id', $pegawai->id)
                ->where('status', 'DISETUJUI')
                ->whereYear('diverifikasi_pada', $tahun)
                ->sum('ak_bonus');

            // Jika ak_booster sebelumnya sudah diinput manual di record, gunakan yang lebih besar
            $akBooster = max($akBooster, (float) $penetapan->ak_booster);

            // 4. Hitung Total AK Kumulatif Akhir Tahun
            // ak_lama (saldo awal / bawaan tahun sebelumnya) + ak_pak_pelantikan + ak_historis + ak_baru + ak_booster
            $akLama = (float) $penetapan->ak_lama;
            $akPakPelantikan = (float) $penetapan->ak_pak_pelantikan;
            $akHistoris = (float) $penetapan->ak_historis;

            $akKumulatif = round($akLama + $akPakPelantikan + $akHistoris + $akBaru + $akBooster, 2);

            // 5. Evaluasi Status Kelayakan & Hitung Carry-Over
            $kelayakan = $this->carryOverService->evaluasiKelayakan($pegawai, $akKumulatif);

            // 6. Update penetapan_ak tahun ini menjadi FINAL
            $penetapan->update([
                'ak_baru'           => $akBaru,
                'ak_booster'        => $akBooster,
                'ak_kumulatif'      => $akKumulatif,
                'status_kelayakan'  => $kelayakan['status'],
                'catatan_kelayakan' => $kelayakan['catatan'],
                'is_final'          => true,
            ]);

            // 7. Siapkan / Update record PenetapanAK tahun berikutnya (Tahun + 1) dengan saldo carry-over
            $tahunBerikutnya = $tahun + 1;
            PenetapanAK::updateOrCreate(
                [
                    'pegawai_id' => $pegawai->id,
                    'tahun'      => $tahunBerikutnya,
                ],
                [
                    'ak_dasar'          => $pegawai->pangkatGolongan?->ak_dasar ?? 0,
                    'ak_pak_pelantikan' => 0,
                    'ak_historis'       => 0,
                    'ak_lama'           => $kelayakan['carry_over'],
                    'ak_carry_over'     => $kelayakan['carry_over'],
                    'ak_baru'           => 0,
                    'ak_booster'        => 0,
                    'ak_kumulatif'      => $kelayakan['carry_over'],
                    'status_kelayakan'  => 'BELUM_CUKUP',
                    'is_final'          => false,
                ]
            );

            // 8. Kirim Notifikasi ke Pegawai
            if ($pegawai->user) {
                $tipeNotif = $kelayakan['status'] === 'BELUM_CUKUP' ? 'INFO' : 'SUCCESS';
                Notifikasi::create([
                    'user_id' => $pegawai->user->id,
                    'judul'   => "Penetapan Angka Kredit Tahun {$tahun} Selesai - [{$kelayakan['badge_label']}]",
                    'pesan'   => "Penetapan AK Anda tahun {$tahun} telah difinalisasi. Total AK Kumulatif: {$akKumulatif} AK. Status: {$kelayakan['badge_label']}. {$kelayakan['catatan']}",
                    'tipe'    => $tipeNotif,
                ]);
            }

            // 9. Audit Trail
            $adminName = $admin ? $admin->name : (auth()->user()?->name ?? 'System');
            $this->auditTrail->log(
                'PENETAPAN_AK',
                'FINALISASI',
                "Finalisasi PAK tahun {$tahun} untuk pegawai {$pegawai->nama_lengkap} (NIP: {$pegawai->nip}) oleh {$adminName}. Status: {$kelayakan['badge_label']} (Kumulatif: {$akKumulatif} AK, Carry-over: {$kelayakan['carry_over']} AK)."
            );

            return $penetapan->fresh();
        });
    }
}
