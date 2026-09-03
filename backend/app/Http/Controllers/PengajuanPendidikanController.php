<?php

namespace App\Http\Controllers;

use App\Http\Requests\StorePengajuanPendidikanRequest;
use App\Http\Requests\VerifikasiPengajuanRequest;
use App\Models\Notifikasi;
use App\Models\PengajuanPendidikan;
use App\Services\AuditTrailService;
use App\Services\BoosterIjazahService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;

class PengajuanPendidikanController extends Controller
{
    protected BoosterIjazahService $boosterService;
    protected AuditTrailService $auditTrail;

    public function __construct(BoosterIjazahService $boosterService, AuditTrailService $auditTrail)
    {
        $this->boosterService = $boosterService;
        $this->auditTrail = $auditTrail;
    }

    /**
     * Tampilkan daftar pengajuan pendidikan.
     * Admin: melihat semua antrean verifikasi.
     * Pegawai: hanya melihat pengajuan miliknya.
     */
    public function index(Request $request): JsonResponse
    {
        $user = $request->user();

        $query = PengajuanPendidikan::with([
            'pegawai.pangkatGolongan.jenjangJabatan',
            'verifikator:id,name,email'
        ])->latest();

        if ($user->role !== 'ADMIN') {
            $pegawaiId = $user->pegawai->id ?? null;
            if (!$pegawaiId) {
                return response()->json(['message' => 'Profil pegawai tidak ditemukan.'], 404);
            }
            $query->where('pegawai_id', $pegawaiId);
        }

        $data = $query->paginate($request->input('per_page', 15));

        return response()->json([
            'message' => 'Daftar pengajuan pendidikan berhasil diambil.',
            'data' => $data,
        ]);
    }

    /**
     * Pegawai mengajukan berkas ijazah baru & bukti BKN.
     */
    public function store(StorePengajuanPendidikanRequest $request): JsonResponse
    {
        $user = $request->user();
        $pegawai = $user->pegawai()->first();

        if (!$pegawai) {
            return response()->json(['message' => 'Akun Anda belum terhubung dengan data pegawai.'], 403);
        }

        // Upload berkas fisik ke storage
        $fileIjazahPath = $request->file('file_ijazah')->store('pengajuan_pendidikan/ijazah', 'public');
        $fileBknPath = $request->file('file_bukti_bkn')->store('pengajuan_pendidikan/bukti_bkn', 'public');

        $pengajuan = PengajuanPendidikan::create([
            'pegawai_id'         => $pegawai->id,
            'jenjang_pendidikan' => $request->jenjang_pendidikan,
            'jurusan'            => $request->jurusan,
            'nama_institusi'     => $request->nama_institusi,
            'tahun_lulus'        => $request->tahun_lulus,
            'file_ijazah'        => $fileIjazahPath,
            'file_bukti_bkn'     => $fileBknPath,
            'status'             => 'DIAJUKAN',
        ]);

        $this->auditTrail->log(
            'BOOSTER_IJAZAH',
            'SUBMIT',
            "Pegawai {$pegawai->nama_lengkap} (NIP: {$pegawai->nip}) mengajukan berkas pendidikan jenjang {$request->jenjang_pendidikan}.",
            null,
            $pengajuan->toArray()
        );

        return response()->json([
            'message' => 'Pengajuan pendidikan dan berkas bukti BKN berhasil diunggah. Menunggu verifikasi admin.',
            'data' => $pengajuan,
        ], 201);
    }

    /**
     * Detail satu pengajuan pendidikan.
     */
    public function show(string $id): JsonResponse
    {
        $pengajuan = PengajuanPendidikan::with([
            'pegawai.pangkatGolongan.jenjangJabatan',
            'verifikator:id,name,email'
        ])->findOrFail($id);

        return response()->json([
            'message' => 'Detail pengajuan pendidikan.',
            'data' => $pengajuan,
        ]);
    }

    /**
     * Admin melakukan pengecekan kevalidan dokumen (Approval / Rejection).
     */
    public function verifikasi(VerifikasiPengajuanRequest $request, string $id): JsonResponse
    {
        $user = $request->user();

        if ($user->role !== 'ADMIN') {
            return response()->json(['message' => 'Hanya Admin Kepegawaian yang berhak memverifikasi dokumen.'], 403);
        }

        $pengajuan = PengajuanPendidikan::findOrFail($id);

        if (in_array($pengajuan->status, ['DISETUJUI', 'DITOLAK_ADMIN', 'DITOLAK_SYARAT'])) {
            return response()->json(['message' => 'Pengajuan ini sudah pernah diverifikasi sebelumnya.'], 400);
        }

        $isValid = $request->boolean('is_valid');

        // Jika dokumen dinilai TIDAK VALID oleh admin
        if (!$isValid) {
            $pengajuan->update([
                'status'              => 'DITOLAK_ADMIN',
                'catatan_verifikasi'  => $request->catatan,
                'diverifikasi_oleh'   => $user->id,
                'diverifikasi_pada'   => now(),
            ]);

            // Kirim notifikasi ke pegawai terkait penolakan berkas
            if ($pengajuan->pegawai && $pengajuan->pegawai->user) {
                Notifikasi::create([
                    'user_id' => $pengajuan->pegawai->user->id,
                    'judul'   => 'Dokumen Pengajuan Pendidikan Tidak Valid',
                    'pesan'   => "Pengajuan jenjang {$pengajuan->jenjang_pendidikan} ditolak oleh verifikator. Alasan: {$request->catatan}",
                    'tipe'    => 'DANGER',
                ]);
            }

            $this->auditTrail->log(
                'BOOSTER_IJAZAH',
                'REJECT_ADMIN',
                "Admin {$user->name} menolak berkas pengajuan ID {$id}. Alasan: {$request->catatan}"
            );

            return response()->json([
                'message' => 'Dokumen pengajuan telah ditolak.',
                'data'    => $pengajuan,
            ]);
        }

        // Jika dokumen VALID, jalankan mesin pengecekan syarat otomatis & bonus AK
        $hasil = $this->boosterService->prosesPersetujuan($pengajuan, $user);

        return response()->json([
            'message' => $hasil->status === 'DISETUJUI'
                ? 'Dokumen valid & syarat otomatis terpenuhi. Bonus AK 25% berhasil ditetapkan.'
                : 'Dokumen valid, namun pengajuan ditolak sistem karena tidak memenuhi kriteria otomatis.',
            'data'    => $hasil,
        ]);
    }
}
