<?php

namespace App\Http\Controllers;

use App\Models\EvaluasiKinerja;
use App\Models\Pegawai;
use App\Models\PenetapanAK;
use App\Services\AuditTrailService;
use App\Services\CarryOverService;
use App\Services\FinalisasiAkService;
use App\Services\HitungKonversiService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class RekapitulasiController extends Controller
{
    protected FinalisasiAkService $finalisasiService;
    protected CarryOverService $carryOverService;
    protected HitungKonversiService $hitungKonversi;
    protected AuditTrailService $auditTrail;

    public function __construct(
        FinalisasiAkService $finalisasiService,
        CarryOverService $carryOverService,
        HitungKonversiService $hitungKonversi,
        AuditTrailService $auditTrail
    ) {
        $this->finalisasiService = $finalisasiService;
        $this->carryOverService = $carryOverService;
        $this->hitungKonversi = $hitungKonversi;
        $this->auditTrail = $auditTrail;
    }

    /**
     * Rekapitulasi PAK per pegawai: ringkasan penetapan AK + rincian
     * evaluasi kinerja (per triwulan) untuk tahun tertentu.
     *
     * Tanpa parameter "tahun" menghasilkan ringkasan seluruh tahun yang ada.
     */
    public function index(Request $request): JsonResponse
    {
        $user = $request->user();

        $query = PenetapanAK::query()
            ->with([
                'pegawai.pangkatGolongan.jenjangJabatan',
                'pegawai.atasan:id,nama_lengkap',
            ])
            ->when($request->input('tahun'), function ($q, $tahun) {
                $q->where('tahun', $tahun);
            })
            ->latest('tahun');

        if ($user->role !== 'ADMIN') {
            $pegawaiId = $user->pegawai->id ?? null;
            if (! $pegawaiId) {
                return response()->json(['message' => 'Profil pegawai tidak ditemukan.'], 404);
            }
            $query->where('pegawai_id', $pegawaiId);
        }

        $items = $query->paginate($request->input('per_page', 15));

        // Tambahkan info badge kelayakan pada setiap record
        $items->getCollection()->transform(function ($item) {
            $kelayakan = $this->carryOverService->evaluasiKelayakan($item->pegawai, (float) $item->ak_kumulatif);
            $item->badge_label = $kelayakan['badge_label'];
            $item->badge_color = $kelayakan['badge_color'];
            $item->target_kp = $kelayakan['target_kp'];
            $item->target_jenjang = $kelayakan['target_jenjang'];
            $item->carry_over = $kelayakan['carry_over'];
            return $item;
        });

        return response()->json([
            'message' => 'Rekapitulasi PAK.',
            'data' => $items,
        ]);
    }

    /**
     * Detail PAK satu pegawai untuk tahun tertentu, lengkap dengan rincian
     * evaluasi kinerja per triwulan (Q1 = TW1, dst).
     */
    public function show(Request $request, string $pegawaiId, int $tahun): JsonResponse
    {
        $penetapan = PenetapanAK::query()
            ->with('pegawai.pangkatGolongan.jenjangJabatan')
            ->where('pegawai_id', $pegawaiId)
            ->where('tahun', $tahun)
            ->first();

        // Jika belum ada record penetapan_ak, buat draft baru
        if (!$penetapan) {
            $pegawai = Pegawai::with('pangkatGolongan.jenjangJabatan')->findOrFail($pegawaiId);
            $penetapan = PenetapanAK::create([
                'pegawai_id'        => $pegawaiId,
                'tahun'             => $tahun,
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
            ]);
            $penetapan->setRelation('pegawai', $pegawai);
        }

        $evaluasi = EvaluasiKinerja::query()
            ->with('predikat:id,nama,persentase_konversi')
            ->where('pegawai_id', $pegawaiId)
            ->where('tahun', $tahun)
            ->orderBy('periode_bulan')
            ->get();

        $triwulan = [];

        foreach (range(1, 4) as $q) {
            $from = (($q - 1) * 3) + 1;
            $to = $q * 3;

            $rows = $evaluasi->filter(function ($e) use ($q, $from, $to) {
                if ($e->triwulan) {
                    return (int) $e->triwulan === $q;
                }
                return $e->periode_bulan >= $from && $e->periode_bulan <= $to;
            });

            $triwulan[$q] = [
                'triwulan'     => $q,
                'label'        => "Triwulan {$q} (TW{$q})",
                'jumlah_bulan' => $rows->sum('jumlah_bulan') ?: $rows->count(),
                'ak_total'     => round($rows->sum('angka_kredit'), 2),
                'rincian'      => $rows->map(fn ($e) => [
                    'id'           => $e->id,
                    'triwulan'     => $e->triwulan ?? $q,
                    'jumlah_bulan' => $e->jumlah_bulan ?? 3,
                    'periode_bulan'=> $e->periode_bulan,
                    'predikat'     => $e->predikat?->nama,
                    'angka_kredit' => $e->angka_kredit,
                    'is_locked'    => $e->is_locked,
                ])->values(),
            ];
        }

        // Evaluasi kelayakan kenaikan pangkat / jenjang
        $kelayakan = $this->carryOverService->evaluasiKelayakan(
            $penetapan->pegawai,
            (float) $penetapan->ak_kumulatif
        );

        return response()->json([
            'message' => 'Detail PAK dan rincian triwulan.',
            'data' => [
                'pegawai' => $penetapan->pegawai->only(['id', 'nama_lengkap', 'nip', 'pendidikan_terakhir', 'tmt_jabatan']),
                'pangkat' => [
                    'golongan' => $penetapan->pegawai->pangkatGolongan?->golongan,
                    'jenjang'  => $penetapan->pegawai->pangkatGolongan?->jenjangJabatan?->nama,
                    'koefisien'=> $penetapan->pegawai->pangkatGolongan?->jenjangJabatan?->koefisien_tahunan,
                ],
                'tahun'             => $penetapan->tahun,
                'ak_dasar'          => (float) $penetapan->ak_dasar,
                'ak_pak_pelantikan' => (float) $penetapan->ak_pak_pelantikan,
                'ak_historis'       => (float) $penetapan->ak_historis,
                'ak_lama'           => (float) $penetapan->ak_lama,
                'ak_baru'           => (float) $penetapan->ak_baru,
                'ak_booster'        => (float) $penetapan->ak_booster,
                'ak_carry_over'     => (float) $penetapan->ak_carry_over,
                'ak_kumulatif'      => (float) $penetapan->ak_kumulatif,
                'is_final'          => (bool) $penetapan->is_final,
                'kelayakan'         => [
                    'status'         => $kelayakan['status'],
                    'badge_label'    => $kelayakan['badge_label'],
                    'badge_color'    => $kelayakan['badge_color'],
                    'target_kp'      => $kelayakan['target_kp'],
                    'target_jenjang' => $kelayakan['target_jenjang'],
                    'carry_over'     => $kelayakan['carry_over'],
                    'kurang_ak'      => $kelayakan['kurang_ak'],
                    'catatan'        => $kelayakan['catatan'],
                ],
                'triwulan'          => $triwulan,
                'sum_ak_periodik'   => round($evaluasi->sum('angka_kredit'), 2),
                'total_ak_baru'     => round($evaluasi->sum('angka_kredit'), 2),
            ],
        ]);
    }

    /**
     * Finalisasi Akhir Tahun KPK: Menjalankan Formula B (TW4 Anchor) & penetapan status kelayakan.
     */
    public function finalisasi(Request $request, string $pegawaiId, int $tahun): JsonResponse
    {
        $user = $request->user();

        if ($user->role !== 'ADMIN') {
            return response()->json(['message' => 'Hanya Admin Kepegawaian yang berhak memfinalisasi PAK.'], 403);
        }

        $validated = $request->validate([
            'predikat_tw4_id' => 'nullable|uuid|exists:master_predikat_kinerja,id',
        ]);

        try {
            $hasil = $this->finalisasiService->finalisasi(
                $pegawaiId,
                $tahun,
                $user,
                $validated['predikat_tw4_id'] ?? null
            );

            $kelayakan = $this->carryOverService->evaluasiKelayakan($hasil->pegawai, (float) $hasil->ak_kumulatif);

            return response()->json([
                'message' => "Penetapan Angka Kredit Tahun {$tahun} berhasil difinalisasi.",
                'data'    => [
                    'penetapan' => $hasil,
                    'kelayakan' => $kelayakan,
                ],
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'message' => 'Gagal melakukan finalisasi PAK: ' . $e->getMessage(),
            ], 422);
        }
    }

    /**
     * Input Manual PAK Awal Pelantikan dari Masa Kerja Jabatan Lama (Studi Kasus Budi).
     */
    public function simpanPakPelantikan(Request $request, string $pegawaiId): JsonResponse
    {
        $user = $request->user();

        if ($user->role !== 'ADMIN') {
            return response()->json(['message' => 'Hanya Admin yang berhak mencatat PAK Pelantikan.'], 403);
        }

        $validated = $request->validate([
            'tahun'               => 'required|integer|min:2020',
            'masa_kerja_tahun'    => 'required|integer|min:0',
            'masa_kerja_bulan'    => 'required|integer|min:0|max:11',
            'persentase_predikat' => 'nullable|numeric|min:0.25|max:1.5',
            'koefisien_tahunan'   => 'nullable|numeric|min:0',
            'ak_pak_manual'       => 'nullable|numeric|min:0', // jika diinput angka langsung
        ]);

        $pegawai = Pegawai::with(['pangkatGolongan.jenjangJabatan', 'jenjangJabatan'])->findOrFail($pegawaiId);
        $effectiveJenjang = $pegawai->effectiveJenjang();
        $koefisien = $validated['koefisien_tahunan'] ?? (float) ($effectiveJenjang?->koefisien_tahunan ?? 12.5);
        $persentase = $validated['persentase_predikat'] ?? 1.0;

        if (isset($validated['ak_pak_manual'])) {
            $akPak = (float) $validated['ak_pak_manual'];
            $detail = ['total_ak_pak' => $akPak, 'masa_kerja_tahun' => $validated['masa_kerja_tahun'], 'masa_kerja_bulan' => $validated['masa_kerja_bulan']];
        } else {
            // Penyesuaian Perpindahan Jabatan (PerBKN No. 3/2023 Lampiran II Angka 3)
                $penyesuaian = $this->hitungKonversi->resolveMismatchPenyesuaian(
                $pegawai->getAsalJabatanOrDefault(),
                $pegawai->pangkatGolongan?->golongan,
                $effectiveJenjang
            );

            if ($penyesuaian['blocked']) {
                return response()->json(['message' => $penyesuaian['block_message']], 422);
            }

            if ($penyesuaian['flat']) {
                $akPak = 100.00;
                $detail = ['total_ak_pak' => $akPak, 'is_mismatch_flat' => true, 'catatan_regulasi' => $penyesuaian['note']];
            } else {
                $detail = $this->hitungKonversi->hitungPakPelantikan(
                    $validated['masa_kerja_tahun'],
                    $validated['masa_kerja_bulan'],
                    $persentase,
                    $koefisien
                );
                $akPak = $detail['total_ak_pak'];
            }
        }

        $penetapan = PenetapanAK::firstOrCreate(
            [
                'pegawai_id' => $pegawai->id,
                'tahun'      => $validated['tahun'],
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
            ]
        );

        $penetapan->update([
            'ak_pak_pelantikan' => $akPak,
            'ak_kumulatif'      => round((float) $penetapan->ak_lama + $akPak + (float) $penetapan->ak_historis + (float) $penetapan->ak_baru + (float) $penetapan->ak_booster, 2),
        ]);

        $this->auditTrail->log(
            'PAK_PELANTIKAN',
            'CREATE',
            "Mencatat PAK Pelantikan untuk {$pegawai->nama_lengkap} (NIP: {$pegawai->nip}) sebesar {$akPak} AK.",
            null,
            $penetapan->toArray()
        );

        return response()->json([
            'message' => 'PAK Pelantikan berhasil disimpan.',
            'data'    => [
                'penetapan' => $penetapan->fresh(),
                'detail'    => $detail,
            ],
        ]);
    }

    /**
     * Input Saldo Historis / Bawaan Kepegawaian (Historical Balance).
     */
    public function simpanSaldoHistoris(Request $request, string $pegawaiId): JsonResponse
    {
        $user = $request->user();

        if ($user->role !== 'ADMIN') {
            return response()->json(['message' => 'Hanya Admin yang berhak mencatat saldo historis.'], 403);
        }

        $validated = $request->validate([
            'tahun'       => 'required|integer|min:2020',
            'ak_historis' => 'required|numeric|min:0',
        ]);

        $pegawai = Pegawai::with('pangkatGolongan')->findOrFail($pegawaiId);

        $penetapan = PenetapanAK::firstOrCreate(
            [
                'pegawai_id' => $pegawai->id,
                'tahun'      => $validated['tahun'],
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
            ]
        );

        $penetapan->update([
            'ak_historis'  => (float) $validated['ak_historis'],
            'ak_kumulatif' => round((float) $penetapan->ak_lama + (float) $penetapan->ak_pak_pelantikan + (float) $validated['ak_historis'] + (float) $penetapan->ak_baru + (float) $penetapan->ak_booster, 2),
        ]);

        $this->auditTrail->log(
            'SALDO_HISTORIS',
            'UPDATE',
            "Mencatat Saldo Historis untuk {$pegawai->nama_lengkap} sebesar {$validated['ak_historis']} AK.",
            null,
            $penetapan->toArray()
        );

        return response()->json([
            'message' => 'Saldo historis berhasil disimpan.',
            'data'    => $penetapan->fresh(),
        ]);
    }

    /**
     * Ringkasan statistik dashboard — total pegawai & distribusi jenjang.
     */
    public function ringkasan(Request $request): JsonResponse
    {
        if ($request->user()->role !== 'ADMIN') {
            return response()->json(['message' => 'Hanya Admin yang dapat mengakses ringkasan.'], 403);
        }

        $totalPegawai = Pegawai::count();

        $perJenjang = Pegawai::query()
            ->with(['pangkatGolongan.jenjangJabatan', 'jenjangJabatan'])
            ->get()
            ->groupBy(fn ($p) => $p->effectiveJenjang()?->nama ?? 'Tanpa Jenjang')
            ->map(fn ($group) => $group->count());

        return response()->json([
            'message' => 'Ringkasan statistik.',
            'data' => [
                'total_pegawai' => $totalPegawai,
                'per_jenjang'   => $perJenjang,
            ],
        ]);
    }
}
