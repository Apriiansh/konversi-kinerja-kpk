<?php

namespace App\Http\Controllers;

use App\Models\EvaluasiKinerja;
use App\Models\MasterPredikatKinerja;
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

        $predikat = MasterPredikatKinerja::findOrFail($validated['predikat_id']);
        $persentaseKonversi = (float) $predikat->persentase_konversi;

        return response()->json([
            'message' => 'Hasil simulasi konversi Angka Kredit Periodik (Formula A).',
            'data'    => [
                'pegawai'                   => $pegawai->nama_lengkap,
                'jenjang'                   => $jenjang->nama,
                'golongan'                  => $pangkat->golongan,
                'koefisien_tahunan'         => $jenjang->koefisien_tahunan,
                'jumlah_bulan'              => $jumlahBulan,
                'angka_kredit'              => $akHasil,
                'rumus'                     => "({$jumlahBulan}/12) × {$persentaseKonversi} × {$jenjang->koefisien_tahunan} = {$akHasil} AK",
                'kebutuhan_ak_kp'           => $jenjang->kebutuhan_ak_kp,
                'kebutuhan_ak_naik_jenjang' => $jenjang->kebutuhan_ak_jenjang,
            ],
        ]);
    }

    /**
     * Detail satu evaluasi kinerja.
     */
    public function show(string $id): JsonResponse
    {
        $evaluasi = EvaluasiKinerja::with([
            'pegawai:id,nama_lengkap,nip',
            'atasanPenilai:id,nama_lengkap',
            'predikat:id,nama,persentase_konversi',
        ])->findOrFail($id);

        return response()->json([
            'message' => 'Detail evaluasi kinerja.',
            'data'    => $evaluasi,
        ]);
    }

    /**
     * Update predikat evaluasi kinerja (hanya jika belum dikunci).
     * AK akan dihitung ulang secara otomatis.
     */
    public function update(Request $request, string $id): JsonResponse
    {
        $evaluasi = EvaluasiKinerja::findOrFail($id);

        if ($evaluasi->is_locked) {
            return response()->json(['message' => 'Evaluasi sudah dikunci dan tidak dapat diubah.'], 422);
        }

        $validated = $request->validate([
            'predikat_id'  => 'required|uuid|exists:master_predikat_kinerja,id',
            'jumlah_bulan' => 'nullable|integer|min:1|max:12',
        ]);

        $jumlahBulan = $validated['jumlah_bulan'] ?? $evaluasi->jumlah_bulan;

        $angkaKredit = $this->konversiService->hitungAk(
            $evaluasi->pegawai_id,
            $validated['predikat_id'],
            $jumlahBulan
        );

        $sebelumnya = $evaluasi->toArray();
        $evaluasi->update([
            'predikat_id'  => $validated['predikat_id'],
            'jumlah_bulan' => $jumlahBulan,
            'angka_kredit' => $angkaKredit,
        ]);

        $this->auditTrail->log(
            'EVALUASI_KINERJA',
            'UPDATE',
            "Memperbarui evaluasi kinerja TW{$evaluasi->triwulan} ID: {$id} | AK baru: {$angkaKredit}",
            $sebelumnya,
            $evaluasi->fresh()->toArray()
        );

        return response()->json([
            'message' => 'Evaluasi kinerja berhasil diperbarui.',
            'data'    => $evaluasi->load('predikat'),
        ]);
    }

    /**
     * Hapus evaluasi kinerja (hanya jika belum dikunci).
     */
    public function destroy(string $id): JsonResponse
    {
        $evaluasi = EvaluasiKinerja::findOrFail($id);

        if ($evaluasi->is_locked) {
            return response()->json(['message' => 'Evaluasi sudah dikunci dan tidak dapat dihapus.'], 422);
        }

        $this->auditTrail->log(
            'EVALUASI_KINERJA',
            'DELETE',
            "Menghapus evaluasi kinerja TW{$evaluasi->triwulan} tahun {$evaluasi->tahun} untuk pegawai ID: {$evaluasi->pegawai_id}",
            $evaluasi->toArray(),
            null
        );

        $evaluasi->delete();

        return response()->json(['message' => 'Evaluasi kinerja berhasil dihapus.']);
    }

    /**
     * Konteks lengkap input kinerja satu pegawai untuk tahun tertentu.
     * Mengembalikan: profil, distribusi bulan per TW, evaluasi existing, predikat master, TW aktif server.
     */
    public function context(Request $request, string $pegawaiId, int $tahun): JsonResponse
    {
        $pegawai = Pegawai::with([
            'pangkatGolongan.jenjangJabatan',
            'jenjangJabatan',
            'user:id,name,email',
        ])->findOrFail($pegawaiId);

        $jenjang = $pegawai->effectiveJenjang();
        $pangkat = $pegawai->pangkatGolongan;

        // Distribusi bulan aktif per TW dari TMT Jabatan
        $bulanPerTw = $this->hitungBulanAktifDariTmt($pegawai->tmt_jabatan?->format('Y-m-d'), $tahun);

        // Evaluasi yang sudah ada (TW1–TW4) untuk tahun ini
        $evaluasiExisting = EvaluasiKinerja::with('predikat:id,nama,persentase_konversi')
            ->where('pegawai_id', $pegawaiId)
            ->where('tahun', $tahun)
            ->orderBy('triwulan')
            ->get()
            ->keyBy('triwulan');

        // Status kelayakan saat ini dari penetapan_ak draft
        $penetapan = \App\Models\PenetapanAK::where('pegawai_id', $pegawaiId)
            ->where('tahun', $tahun)
            ->first();

        $saldoAwal = $penetapan
            ? (float)$penetapan->ak_dasar + (float)$penetapan->ak_pak_pelantikan + (float)$penetapan->ak_historis + (float)$penetapan->ak_lama
            : ((float)($pangkat?->ak_dasar ?? 0));

        // TW aktif di server berdasarkan bulan saat ini
        $bulanSekarang = (int) now()->month;
        $twAktif = match (true) {
            $bulanSekarang <= 3  => 1,
            $bulanSekarang <= 6  => 2,
            $bulanSekarang <= 9  => 3,
            default              => 4,
        };

        // Cek eligibilitas TW3 (sudah layak naik sebelum TW4?)
        $sumAkPeriodik = $evaluasiExisting->sum('angka_kredit');
        $akKumulatifDraft = $saldoAwal + $sumAkPeriodik;
        $targetKp = (float)($jenjang?->kebutuhan_ak_kp ?? 50.0);
        $targetJenjang = (float)($jenjang?->kebutuhan_ak_jenjang ?? 100.0);
        $sudahLayakSebelumTw4 = $akKumulatifDraft >= $targetKp || $akKumulatifDraft >= $targetJenjang;

        return response()->json([
            'message' => 'Konteks input kinerja pegawai.',
            'data'    => [
                'pegawai' => [
                    'id'                  => $pegawai->id,
                    'nip'                 => $pegawai->nip,
                    'nama_lengkap'        => $pegawai->nama_lengkap,
                    'email'               => $pegawai->user?->email,
                    'golongan'            => $pangkat?->golongan,
                    'jenjang'             => $jenjang?->nama,
                    'asal_jabatan'        => $pegawai->asal_jabatan,
                    'pendidikan_terakhir' => $pegawai->pendidikan_terakhir,
                    'tmt_jabatan'         => $pegawai->tmt_jabatan?->format('Y-m-d'),
                    'pangkat_golongan_id' => $pegawai->pangkat_golongan_id,
                    'jenjang_jabatan_id'  => $pegawai->jenjang_jabatan_id,
                    'koefisien_tahunan'   => $jenjang?->koefisien_tahunan,
                    'kebutuhan_ak_kp'     => $targetKp,
                    'kebutuhan_ak_jenjang'=> $targetJenjang,
                ],
                'saldo_awal'               => $saldoAwal,
                'ak_kumulatif_draft'       => round($akKumulatifDraft, 3),
                'sudah_layak_sebelum_tw4'  => $sudahLayakSebelumTw4,
                'tw_aktif'                 => $twAktif,
                'tahun'                    => $tahun,
                'bulan_per_tw'             => $bulanPerTw ?? [1 => 3, 2 => 3, 3 => 3, 4 => 3],
                'evaluasi'                 => $evaluasiExisting->map(fn($e) => [
                    'id'           => $e->id,
                    'triwulan'     => $e->triwulan,
                    'jumlah_bulan' => $e->jumlah_bulan,
                    'predikat_id'  => $e->predikat_id,
                    'predikat'     => $e->predikat?->nama,
                    'angka_kredit' => (float) $e->angka_kredit,
                    'is_locked'    => $e->is_locked,
                ]),
                'penetapan_is_final' => (bool) $penetapan?->is_final,
            ],
        ]);
    }

    /**
     * Hitung distribusi bulan aktif per triwulan dari TMT Jabatan.
     */
    protected function hitungBulanAktifDariTmt(?string $tmt, int $tahun): ?array
    {
        if (empty($tmt)) {
            return null;
        }

        try {
            $date = \Carbon\Carbon::parse($tmt);
        } catch (\Throwable $e) {
            return null;
        }

        $tmtTahun = (int) $date->year;

        if ($tmtTahun < $tahun) {
            return [1 => 3, 2 => 3, 3 => 3, 4 => 3];
        }
        if ($tmtTahun > $tahun) {
            return null;
        }

        $startMonth = (int) $date->month;
        $bulan = [];
        foreach (range(1, 4) as $q) {
            $from = (($q - 1) * 3) + 1;
            $to   = $q * 3;
            if ($startMonth > $to) {
                $bulan[$q] = 0;
            } elseif ($startMonth <= $from) {
                $bulan[$q] = 3;
            } else {
                $bulan[$q] = $to - $startMonth + 1;
            }
        }

        return $bulan;
    }
}
