<?php

namespace App\Http\Controllers;

use App\Models\EvaluasiKinerja;
use App\Models\Pegawai;
use App\Models\PenetapanAK;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class RekapitulasiController extends Controller
{
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

        return response()->json([
            'message' => 'Rekapitulasi PAK.',
            'data' => $query->paginate($request->input('per_page', 15)),
        ]);
    }

    /**
     * Detail PAK satu pegawai untuk tahun tertentu, lengkap dengan rincian
     * evaluasi kinerja per triwulan (Q1 = bulan 1-3, dst).
     */
    public function show(Request $request, string $pegawaiId, int $tahun): JsonResponse
    {
        $penetapan = PenetapanAK::query()
            ->with('pegawai.pangkatGolongan.jenjangJabatan')
            ->where('pegawai_id', $pegawaiId)
            ->where('tahun', $tahun)
            ->firstOrFail();

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

            $rows = $evaluasi->filter(fn ($e) => $e->periode_bulan >= $from && $e->periode_bulan <= $to);

            $triwulan[$q] = [
                'label' => "Triwulan {$q}",
                'jumlah_bulan' => $rows->count(),
                'ak_total' => round($rows->sum('angka_kredit'), 2),
                'rincian' => $rows->map(fn ($e) => [
                    'bulan' => $e->periode_bulan,
                    'predikat' => $e->predikat?->nama,
                    'angka_kredit' => $e->angka_kredit,
                    'is_locked' => $e->is_locked,
                ])->values(),
            ];
        }

        return response()->json([
            'message' => 'Detail PAK dan rincian triwulan.',
            'data' => [
                'pegawai' => $penetapan->pegawai->only(['id', 'nama_lengkap', 'nip']),
                'pangkat' => [
                    'golongan' => $penetapan->pegawai->pangkatGolongan?->golongan,
                    'jenjang' => $penetapan->pegawai->pangkatGolongan?->jenjangJabatan?->nama,
                ],
                'tahun' => $penetapan->tahun,
                'ak_dasar' => $penetapan->ak_dasar,
                'ak_lama' => $penetapan->ak_lama,
                'ak_baru' => $penetapan->ak_baru,
                'ak_kumulatif' => $penetapan->ak_kumulatif,
                'triwulan' => $triwulan,
                'total_ak_baru' => round($evaluasi->sum('angka_kredit'), 2),
            ],
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
            ->with('pangkatGolongan.jenjangJabatan')
            ->get()
            ->groupBy(fn ($p) => $p->pangkatGolongan?->jenjangJabatan?->nama ?? 'Tanpa Jenjang')
            ->map(fn ($group) => $group->count());

        return response()->json([
            'message' => 'Ringkasan statistik.',
            'data' => [
                'total_pegawai' => $totalPegawai,
                'per_jenjang' => $perJenjang,
            ],
        ]);
    }
}
