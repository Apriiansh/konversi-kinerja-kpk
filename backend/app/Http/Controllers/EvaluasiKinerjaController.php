<?php

namespace App\Http\Controllers;

use App\Models\EvaluasiKinerja;
use App\Models\Pegawai;
use App\Services\AuditTrailService;
use App\Services\HitungKonversiService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class EvaluasiKinerjaController extends Controller
{
    protected HitungKonversiService $konversiService;
    protected AuditTrailService $auditTrail;

    public function __construct(HitungKonversiService $konversiService, AuditTrailService $auditTrail)
    {
        $this->konversiService = $konversiService;
        $this->auditTrail = $auditTrail;
    }

    /**
     * Daftar evaluasi kinerja — Admin melihat semua, Pegawai melihat miliknya.
     */
    public function index(Request $request): JsonResponse
    {
        $user = $request->user();

        $query = EvaluasiKinerja::with([
            'pegawai:id,nama_lengkap,nip',
            'atasanPenilai:id,nama_lengkap',
            'predikat:id,nama,persentase_konversi',
        ])->latest();

        if ($user->role !== 'ADMIN') {
            $pegawai = $user->pegawai()->first();
            if (!$pegawai) {
                return response()->json(['data' => []], 200);
            }
            $query->where('pegawai_id', $pegawai->id);
        }

        return response()->json([
            'message' => 'Daftar evaluasi kinerja.',
            'data'    => $query->paginate($request->input('per_page', 15)),
        ]);
    }

    /**
     * Simpan evaluasi kinerja triwulanan/periodik & hitung AK otomatis menggunakan rumus BKN.
     * Rumus: (Bulan / 12) x Persentase_Predikat x Koefisien_Tahunan_Jenjang
     */
    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'pegawai_id'    => 'required|uuid|exists:pegawai,id',
            'tahun'         => 'required|integer|min:2020',
            'triwulan'      => 'nullable|integer|min:1|max:4',
            'periode_bulan' => 'nullable|integer|min:1|max:12',
            'jumlah_bulan'  => 'nullable|integer|min:1|max:12',
            'predikat_id'   => 'required|uuid|exists:master_predikat_kinerja,id',
        ]);

        // Default jumlah_bulan & triwulan jika salah satu diisi
        $triwulan = $validated['triwulan'] ?? (isset($validated['periode_bulan']) ? (int) ceil($validated['periode_bulan'] / 3) : 1);
        $jumlahBulan = $validated['jumlah_bulan'] ?? ($validated['periode_bulan'] ?? 3);
        $periodeBulan = $validated['periode_bulan'] ?? ($triwulan * 3);

        // Ambil atasan penilai dari relasi user yang sedang login
        $atasanPenilaiId = $request->user()->pegawai()->first()?->id;

        // Hitung AK melalui service (Formula A)
        $angkaKredit = $this->konversiService->hitungAk(
            $validated['pegawai_id'],
            $validated['predikat_id'],
            $jumlahBulan
        );

        $evaluasi = DB::transaction(function () use ($validated, $atasanPenilaiId, $angkaKredit, $triwulan, $jumlahBulan, $periodeBulan) {
            $data = EvaluasiKinerja::create([
                'pegawai_id'        => $validated['pegawai_id'],
                'atasan_penilai_id' => $atasanPenilaiId,
                'tahun'             => $validated['tahun'],
                'triwulan'          => $triwulan,
                'periode_bulan'     => $periodeBulan,
                'jumlah_bulan'      => $jumlahBulan,
                'predikat_id'       => $validated['predikat_id'],
                'angka_kredit'      => $angkaKredit,
                'is_locked'         => false,
            ]);

            $this->auditTrail->log(
                'EVALUASI_KINERJA',
                'CREATE',
                "Membuat evaluasi kinerja TW{$triwulan} ({$jumlahBulan} bln) untuk pegawai ID: {$validated['pegawai_id']} | AK: {$angkaKredit}",
                null,
                $data->toArray()
            );

            return $data;
        });

        return response()->json([
            'message' => 'Evaluasi Kinerja berhasil disimpan.',
            'data'    => $evaluasi->load('predikat'),
        ], 201);
    }

    /**
     * Kunci (lock) predikat evaluasi kinerja — tidak bisa diubah setelahnya.
     */
    public function lock(string $id): JsonResponse
    {
        $evaluasi = EvaluasiKinerja::findOrFail($id);

        if ($evaluasi->is_locked) {
            return response()->json(['message' => 'Data sudah terkunci sebelumnya.'], 400);
        }

        $dataSebelumnya = $evaluasi->toArray();
        $evaluasi->update(['is_locked' => true]);

        $this->auditTrail->log(
            'EVALUASI_KINERJA',
            'LOCK',
            "Mengunci evaluasi kinerja ID: {$id}",
            $dataSebelumnya,
            $evaluasi->fresh()->toArray()
        );

        return response()->json([
            'message' => 'Data evaluasi berhasil dikunci. Predikat tidak dapat diubah.',
            'data'    => $evaluasi,
        ]);
    }

    /**
     * Simulasi perhitungan konversi AK tanpa menyimpan ke database.
     * Berguna untuk preview hasil sebelum user menekan tombol simpan.
     */
    public function simulasi(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'pegawai_id'    => 'required|uuid|exists:pegawai,id',
            'predikat_id'   => 'required|uuid|exists:master_predikat_kinerja,id',
            'triwulan'      => 'nullable|integer|min:1|max:4',
            'periode_bulan' => 'nullable|integer|min:1|max:12',
            'jumlah_bulan'  => 'nullable|integer|min:1|max:12',
            'tipe'          => 'nullable|in:periodik,tahunan',
            'tahun'         => 'nullable|integer',
        ]);

        $jumlahBulan = $validated['jumlah_bulan'] ?? ($validated['periode_bulan'] ?? 3);
        $pegawai = Pegawai::with(['pangkatGolongan.jenjangJabatan', 'jenjangJabatan'])->findOrFail($validated['pegawai_id']);

        $jenjang  = $pegawai->effectiveJenjang();
        $pangkat  = $pegawai->pangkatGolongan;

        if (($validated['tipe'] ?? 'periodik') === 'tahunan') {
            $tahun = $validated['tahun'] ?? (int) now()->year;
            $hasilTahunan = $this->konversiService->hitungAkTahunan($pegawai->id, $tahun, $validated['predikat_id']);

            return response()->json([
                'message' => 'Hasil simulasi konversi Angka Kredit Tahunan (Formula B - TW4 Anchor).',
                'data'    => [
                    'pegawai'                   => $pegawai->nama_lengkap,
                    'jenjang'                   => $jenjang->nama,
                    'golongan'                  => $pangkat->golongan,
                    'koefisien_tahunan'         => $jenjang->koefisien_tahunan,
                    'total_bulan_aktif'         => $hasilTahunan['total_bulan_aktif'],
                    'predikat_anchor'           => $hasilTahunan['predikat_anchor'],
                    'angka_kredit'              => $hasilTahunan['ak_baru'],
                    'rumus'                     => $hasilTahunan['rumus'],
                    'kebutuhan_ak_kp'           => $jenjang->kebutuhan_ak_kp,
                    'kebutuhan_ak_naik_jenjang' => $jenjang->kebutuhan_ak_jenjang,
                ],
            ]);
        }

        $akHasil = $this->konversiService->hitungAk(
            $validated['pegawai_id'],
            $validated['predikat_id'],
            $jumlahBulan
        );

        return response()->json([
            'message' => 'Hasil simulasi konversi Angka Kredit Periodik (Formula A).',
            'data'    => [
                'pegawai'                   => $pegawai->nama_lengkap,
                'jenjang'                   => $jenjang->nama,
                'golongan'                  => $pangkat->golongan,
                'koefisien_tahunan'         => $jenjang->koefisien_tahunan,
                'jumlah_bulan'              => $jumlahBulan,
                'angka_kredit'              => $akHasil,
                'rumus'                     => "({$jumlahBulan}/12) × Predikat × {$jenjang->koefisien_tahunan} = {$akHasil} AK",
                'kebutuhan_ak_kp'           => $jenjang->kebutuhan_ak_kp,
                'kebutuhan_ak_naik_jenjang' => $jenjang->kebutuhan_ak_jenjang,
            ],
        ]);
    }
}
