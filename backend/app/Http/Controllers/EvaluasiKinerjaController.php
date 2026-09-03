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
     * Simpan evaluasi kinerja & hitung AK otomatis menggunakan rumus BKN.
     * Rumus: (Periode_Bulan / 12) x Persentase_Predikat x Koefisien_Tahunan_Jenjang
     */
    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'pegawai_id'    => 'required|uuid|exists:pegawai,id',
            'tahun'         => 'required|integer|min:2020',
            'periode_bulan' => 'required|integer|min:1|max:12',
            'predikat_id'   => 'required|uuid|exists:master_predikat_kinerja,id',
        ]);

        // Ambil atasan penilai dari relasi user yang sedang login
        $atasanPenilaiId = $request->user()->pegawai()->first()?->id;

        // Hitung AK melalui service (seluruh logika rumus BKN di sini)
        $angkaKredit = $this->konversiService->hitungAk(
            $validated['pegawai_id'],
            $validated['predikat_id'],
            $validated['periode_bulan']
        );

        $evaluasi = DB::transaction(function () use ($validated, $atasanPenilaiId, $angkaKredit) {
            $data = EvaluasiKinerja::create([
                'pegawai_id'        => $validated['pegawai_id'],
                'atasan_penilai_id' => $atasanPenilaiId,
                'tahun'             => $validated['tahun'],
                'periode_bulan'     => $validated['periode_bulan'],
                'predikat_id'       => $validated['predikat_id'],
                'angka_kredit'      => $angkaKredit,
                'is_locked'         => false,
            ]);

            $this->auditTrail->log(
                'EVALUASI_KINERJA',
                'CREATE',
                "Membuat evaluasi kinerja untuk pegawai ID: {$validated['pegawai_id']} | AK Dihitung: {$angkaKredit}",
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
            'periode_bulan' => 'required|integer|min:1|max:12',
        ]);

        $pegawai = Pegawai::with('pangkatGolongan.jenjangJabatan')->findOrFail($validated['pegawai_id']);

        $akHasil = $this->konversiService->hitungAk(
            $validated['pegawai_id'],
            $validated['predikat_id'],
            $validated['periode_bulan']
        );

        $jenjang  = $pegawai->pangkatGolongan->jenjangJabatan;
        $pangkat  = $pegawai->pangkatGolongan;

        return response()->json([
            'message' => 'Hasil simulasi konversi Angka Kredit.',
            'data'    => [
                'pegawai'            => $pegawai->nama_lengkap,
                'jenjang'            => $jenjang->nama,
                'golongan'           => $pangkat->golongan,
                'koefisien_tahunan'  => $jenjang->koefisien_tahunan,
                'periode_bulan'      => $validated['periode_bulan'],
                'angka_kredit'       => $akHasil,
                'rumus'              => "({$validated['periode_bulan']}/12) × Predikat × {$jenjang->koefisien_tahunan} = {$akHasil} AK",
                'kebutuhan_ak_kp'    => $jenjang->kebutuhan_ak_kp,
                'kebutuhan_ak_naik_jenjang' => $jenjang->kebutuhan_ak_jenjang,
            ],
        ]);
    }
}
