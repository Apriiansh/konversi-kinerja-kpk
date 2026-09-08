<?php

namespace Tests\Feature;

use App\Models\MasterJenjangJabatan;
use App\Models\MasterPangkatGolongan;
use App\Models\MasterPredikatKinerja;
use App\Models\Pegawai;
use App\Models\PenetapanAK;
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

    public function test_master_data_berisi_informasi_bkn_no_3_tahun_2023(): void
    {
        $response = $this->getJson('/api/master-data');

        $response->assertOk();
        $jenjangNames = collect($response->json('data.jenjang_jabatan'))->pluck('nama')->all();
        $this->assertContains('Ahli Pertama', $jenjangNames);
        $this->assertEquals('Sangat Baik', $response->json('data.predikat_kinerja.0.nama'));
        $this->assertCount(4, $response->json('data.jenjang_jabatan'));
        $this->assertCount(5, $response->json('data.predikat_kinerja'));
        $this->assertCount(9, $response->json('data.ak_dasar'));
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

        // Draft penetapan AK tahun 2024 (prasyarat year-lock)
        PenetapanAK::create([
            'pegawai_id'   => $pegawai->id,
            'tahun'        => 2024,
            'ak_dasar'     => 0,
            'ak_lama'      => 100,
            'ak_kumulatif' => 118.75,
        ]);

        // 2. Kunci Tahun (Year-Lock) oleh Admin — blokir semua edit evaluasi
        $lockResponse = $this->actingAs($admin, 'sanctum')->postJson("/api/rekapitulasi/{$pegawai->id}/2024/lock");
        $lockResponse->assertStatus(200);
        $this->assertTrue($lockResponse->json('data.is_locked'));

        // Setelah terkunci, update evaluasi ditolak
        $updateBlocked = $this->actingAs($admin, 'sanctum')->putJson("/api/evaluasi/{$evaluasiId}", [
            'predikat_id'  => $predikatSangatBaik->id,
            'jumlah_bulan' => 3,
        ]);
        $updateBlocked->assertStatus(422);
        $this->assertStringContainsString('terkunci', $updateBlocked->json('message'));

        // Cek database audit trail tercatat
        $this->assertDatabaseHas('riwayat_aktivitas', [
            'modul' => 'PENETAPAN_AK',
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
            'program_studi'      => 'Magister Teknologi Informasi',
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

    public function test_alur_lengkap_studi_kasus_budi_tahun_1_dan_badge_kelayakan(): void
    {
        $admin = User::factory()->create(['role' => 'ADMIN', 'name' => 'Admin Kepegawaian']);
        $pangkat = MasterPangkatGolongan::where('golongan', 'III/a')->first(); // Ahli Pertama, Koefisien 12.5, Target KP 50.0
        $predikatSangatBaik = MasterPredikatKinerja::where('nama', 'Sangat Baik')->first(); // 150%
        $predikatBaik = MasterPredikatKinerja::where('nama', 'Baik')->first(); // 100%

        $userPegawai = User::factory()->create(['role' => 'PEGAWAI']);
        $pegawai = Pegawai::create([
            'user_id'             => $userPegawai->id,
            'nip'                 => '199503012025031001',
            'nama_lengkap'        => 'Budi Santoso, S.T',
            'pangkat_golongan_id' => $pangkat->id,
            'pendidikan_terakhir' => 'S1',
            'tmt_jabatan'         => '2025-03-01', // TMT Maret 2025 -> 10 bulan aktif
        ]);

        // 1. Simpan PAK Pelantikan: 3 Tahun 5 Bulan -> 42.71 AK
        $pakResponse = $this->actingAs($admin, 'sanctum')->postJson("/api/rekapitulasi/{$pegawai->id}/pak-pelantikan", [
            'tahun'            => 2025,
            'masa_kerja_tahun' => 3,
            'masa_kerja_bulan' => 5,
        ]);
        $pakResponse->assertOk();
        $this->assertEquals(42.708, (float) $pakResponse->json('data.penetapan.ak_pak_pelantikan'));

        // 2. Simpan Saldo Historis Kepegawaian: 10.00 AK
        $saldoResponse = $this->actingAs($admin, 'sanctum')->postJson("/api/rekapitulasi/{$pegawai->id}/saldo-historis", [
            'tahun'       => 2025,
            'ak_historis' => 10.00,
        ]);
        $saldoResponse->assertOk();
        $this->assertEquals(10.00, (float) $saldoResponse->json('data.ak_historis'));

        // 3. Simpan Kinerja Triwulan:
        // TW1 (1 bln, SB): 1.56 AK
        $this->actingAs($admin, 'sanctum')->postJson('/api/evaluasi', [
            'pegawai_id'   => $pegawai->id,
            'tahun'        => 2025,
            'triwulan'     => 1,
            'jumlah_bulan' => 1,
            'predikat_id'  => $predikatSangatBaik->id,
        ]);

        // TW2 (3 bln, SB): 4.69 AK
        $this->actingAs($admin, 'sanctum')->postJson('/api/evaluasi', [
            'pegawai_id'   => $pegawai->id,
            'tahun'        => 2025,
            'triwulan'     => 2,
            'jumlah_bulan' => 3,
            'predikat_id'  => $predikatSangatBaik->id,
        ]);

        // TW3 (3 bln, SB): 4.69 AK
        $this->actingAs($admin, 'sanctum')->postJson('/api/evaluasi', [
            'pegawai_id'   => $pegawai->id,
            'tahun'        => 2025,
            'triwulan'     => 3,
            'jumlah_bulan' => 3,
            'predikat_id'  => $predikatSangatBaik->id,
        ]);

        // TW4 (3 bln, Baik - Tahunan): 3.13 AK
        $this->actingAs($admin, 'sanctum')->postJson('/api/evaluasi', [
            'pegawai_id'   => $pegawai->id,
            'tahun'        => 2025,
            'triwulan'     => 4,
            'jumlah_bulan' => 3,
            'predikat_id'  => $predikatBaik->id,
        ]);

        // 4. Booster Ijazah S1 (Target 50 * 25% = 12.50 AK)
        // Simpan langsung ke penetapan untuk simulasi booster disetujui
        $penetapan = \App\Models\PenetapanAK::where('pegawai_id', $pegawai->id)->where('tahun', 2025)->first();
        $penetapan->update(['ak_booster' => 12.50]);

        // 5. Finalisasi Akhir Tahun 1 (2025)
        $finalisasiResponse = $this->actingAs($admin, 'sanctum')->postJson("/api/rekapitulasi/{$pegawai->id}/2025/finalisasi");
        $finalisasiResponse->assertOk();

        // Verifikasi Hasil Tahun 1:
        // TW3 sudah LAYAK (akKumulatifTw3 ~76 AK > 50) → Formula A periodik: sum TW1..TW4 = 14.06 AK
        // Total Kumulatif: 10.00 (historis) + 42.708 (PAK) + 14.06 (AK Baru) + 12.50 (Booster) = 79.27 AK (rounded)
        $this->assertEquals(14.06, (float) $finalisasiResponse->json('data.penetapan.ak_baru'));
        $this->assertEquals(79.27, (float) $finalisasiResponse->json('data.penetapan.ak_kumulatif'));
        $this->assertEquals('LAYAK_PANGKAT', $finalisasiResponse->json('data.kelayakan.status'));
        $this->assertEquals('LAYAK NAIK PANGKAT', $finalisasiResponse->json('data.kelayakan.badge_label'));
        $this->assertEquals(29.27, (float) $finalisasiResponse->json('data.kelayakan.carry_over'));

        // 6. Verifikasi carry-over otomatis tersedia di Tahun 2 (2026)
        $penetapanTahun2 = \App\Models\PenetapanAK::where('pegawai_id', $pegawai->id)->where('tahun', 2026)->first();
        $this->assertNotNull($penetapanTahun2);
        $this->assertEquals(29.27, (float) $penetapanTahun2->ak_lama);
        $this->assertEquals(29.27, (float) $penetapanTahun2->ak_kumulatif);

        // 7. Simulasi Kinerja Tahun 2 (2026): 12 bulan penuh, TW4 Sangat Baik -> AK Baru = 18.75 AK
        $this->actingAs($admin, 'sanctum')->postJson('/api/evaluasi', [
            'pegawai_id'   => $pegawai->id,
            'tahun'        => 2026,
            'triwulan'     => 4,
            'jumlah_bulan' => 3,
            'predikat_id'  => $predikatSangatBaik->id,
        ]);

        $finalisasiTahun2 = $this->actingAs($admin, 'sanctum')->postJson("/api/rekapitulasi/{$pegawai->id}/2026/finalisasi");
        $finalisasiTahun2->assertOk();

        // Total Kumulatif Tahun 2: 29.27 (carry over) + 18.75 (AK baru) = 48.02 AK
        // Target KP III/b -> III/c adalah 50 AK -> Kurang 1.98 AK -> Status: BELUM CUKUP AK
        $this->assertEquals(18.75, (float) $finalisasiTahun2->json('data.penetapan.ak_baru'));
        $this->assertEquals(48.02, (float) $finalisasiTahun2->json('data.penetapan.ak_kumulatif'));
        $this->assertEquals('BELUM_CUKUP', $finalisasiTahun2->json('data.kelayakan.status'));
        $this->assertEquals('BELUM CUKUP AK', $finalisasiTahun2->json('data.kelayakan.badge_label'));
        $this->assertEquals(48.02, (float) $finalisasiTahun2->json('data.kelayakan.carry_over'));
    }

    public function test_promosi_naik_jenjang_sisa_ak_hangus_carry_over_nol(): void
    {
        $admin = User::factory()->create(['role' => 'ADMIN']);
        $pangkat = MasterPangkatGolongan::where('golongan', 'III/b')->first(); // Ahli Pertama, Target Naik Jenjang = 100.0

        $userPegawai = User::factory()->create(['role' => 'PEGAWAI']);
        $pegawai = Pegawai::create([
            'user_id'             => $userPegawai->id,
            'nip'                 => '199001012020011001',
            'nama_lengkap'        => 'Pegawai Senior, S.Kom',
            'pangkat_golongan_id' => $pangkat->id,
            'pendidikan_terakhir' => 'S1',
        ]);

        // Simpan saldo kumulatif awal 110 AK (melebihi target naik jenjang 100 AK)
        PenetapanAK::create([
            'pegawai_id'       => $pegawai->id,
            'tahun'            => 2025,
            'ak_dasar'         => 50,
            'ak_lama'          => 110,
            'ak_baru'          => 0,
            'ak_kumulatif'     => 110,
            'status_kelayakan' => 'BELUM_CUKUP',
        ]);

        $carryOverService = app(\App\Services\CarryOverService::class);
        $kelayakan = $carryOverService->evaluasiKelayakan($pegawai, 110.0);

        $this->assertEquals('LAYAK_JENJANG', $kelayakan['status']);
        $this->assertEquals('LAYAK NAIK JENJANG', $kelayakan['badge_label']);
        $this->assertEquals(0.0, $kelayakan['carry_over']); // HANGUS
    }
}
