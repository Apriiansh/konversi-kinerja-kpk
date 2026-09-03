<?php

namespace Tests\Feature;

use App\Models\MasterJenjangJabatan;
use App\Models\MasterPangkatGolongan;
use App\Models\MasterPredikatKinerja;
use App\Models\Pegawai;
use App\Models\PengajuanPendidikan;
use App\Models\User;
use Database\Seeders\MasterDataSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class KonversiKinerjaTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        // Seed Master Data BKN No 3/2023
        $this->seed(MasterDataSeeder::class);
    }

    public function test_evaluasi_kinerja_dan_rumus_bkn_berhasil_dihitung_dan_dikunci(): void
    {
        $admin = User::factory()->create(['role' => 'ADMIN']);
        $pangkat = MasterPangkatGolongan::where('golongan', 'III/a')->first(); // Ahli Pertama, Koefisien 12.5, Target KP 50.0
        $predikatSangatBaik = MasterPredikatKinerja::where('nama', 'Sangat Baik')->first(); // 150%

        $userPegawai = User::factory()->create(['role' => 'PEGAWAI']);
        $pegawai = Pegawai::create([
            'user_id'             => $userPegawai->id,
            'nip'                 => 'TEST' . rand(100000000000, 999999999999),
            'nama_lengkap'        => 'Ahmad Fajar, S.Kom',
            'pangkat_golongan_id' => $pangkat->id,
            'pendidikan_terakhir' => 'S1',
        ]);

        // 1. Simpan Evaluasi Kinerja (12 bulan x 150% x 12.5 = 18.75 AK)
        $response = $this->actingAs($userPegawai, 'sanctum')->postJson('/api/evaluasi', [
            'pegawai_id'    => $pegawai->id,
            'tahun'         => 2024,
            'periode_bulan' => 12,
            'predikat_id'   => $predikatSangatBaik->id,
        ]);

        $response->assertStatus(201);
        $this->assertEquals(18.75, (float) $response->json('data.angka_kredit'));

        $evaluasiId = $response->json('data.id');

        // 2. Kunci Predikat (Lock Predicate)
        $lockResponse = $this->actingAs($userPegawai, 'sanctum')->postJson("/api/evaluasi/{$evaluasiId}/lock");
        $lockResponse->assertStatus(200);
        $this->assertTrue($lockResponse->json('data.is_locked'));

        // Cek database audit trail tercatat
        $this->assertDatabaseHas('riwayat_aktivitas', [
            'modul' => 'EVALUASI_KINERJA',
            'aksi'  => 'LOCK',
        ]);
    }

    public function test_alur_booster_ijazah_lolos_syarat_dan_dapat_bonus_25_persen(): void
    {
        Storage::fake('public');

        $admin = User::factory()->create(['role' => 'ADMIN', 'name' => 'Admin Kepegawaian']);
        $pangkat = MasterPangkatGolongan::where('golongan', 'III/a')->first(); // Kebutuhan KP = 50.0
        $predikatBaik = MasterPredikatKinerja::where('nama', 'Baik')->first(); // 100%

        $userPegawai = User::factory()->create(['role' => 'PEGAWAI']);
        $pegawai = Pegawai::create([
            'user_id'             => $userPegawai->id,
            'nip'                 => 'TEST' . rand(100000000000, 999999999999),
            'nama_lengkap'        => 'Ahmad Fajar, S.Kom',
            'pangkat_golongan_id' => $pangkat->id,
            'pendidikan_terakhir' => 'S1',
        ]);

        // Buat evaluasi kinerja terakhir minimal "Baik"
        $this->actingAs($userPegawai, 'sanctum')->postJson('/api/evaluasi', [
            'pegawai_id'    => $pegawai->id,
            'tahun'         => 2024,
            'periode_bulan' => 12,
            'predikat_id'   => $predikatBaik->id,
        ]);

        // 1. Pegawai ajukan S2 dan upload berkas Ijazah + Bukti BKN
        $fileIjazah = UploadedFile::fake()->create('ijazah_s2.pdf', 500, 'application/pdf');
        $fileBkn = UploadedFile::fake()->create('surat_bkn.pdf', 300, 'application/pdf');

        $submitResponse = $this->actingAs($userPegawai, 'sanctum')->postJson('/api/pengajuan-pendidikan', [
            'jenjang_pendidikan' => 'S2',
            'jurusan'            => 'Magister Teknologi Informasi',
            'nama_institusi'     => 'Universitas Indonesia',
            'tahun_lulus'        => 2024,
            'file_ijazah'        => $fileIjazah,
            'file_bukti_bkn'     => $fileBkn,
        ]);

        $submitResponse->assertStatus(201);
        $pengajuanId = $submitResponse->json('data.id');

        // 2. Admin verifikasi berkas VALID
        $verifResponse = $this->actingAs($admin, 'sanctum')->postJson("/api/pengajuan-pendidikan/{$pengajuanId}/verifikasi", [
            'is_valid' => true,
        ]);

        $verifResponse->assertStatus(200);

        // Target KP Ahli Pertama = 50.0 -> Bonus 25% = 12.50
        $this->assertEquals('DISETUJUI', $verifResponse->json('data.status'));
        $this->assertEquals(12.50, (float) $verifResponse->json('data.ak_bonus'));

        // Cek pendidikan terakhir pegawai terupdate menjadi S2
        $this->assertEquals('S2', $pegawai->fresh()->pendidikan_terakhir);

        // Cek notifikasi sukses diterima pegawai
        $this->assertDatabaseHas('notifikasi', [
            'user_id' => $userPegawai->id,
            'tipe'    => 'SUCCESS',
        ]);
    }
}
