<?php

namespace Tests\Feature;

use App\Models\EvaluasiKinerja;
use App\Models\MasterPangkatGolongan;
use App\Models\MasterPredikatKinerja;
use App\Models\Pegawai;
use App\Models\PenetapanAK;
use App\Models\PengajuanPendidikan;
use App\Models\User;
use Database\Seeders\MasterDataSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class PegawaiRekapitulasiTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(MasterDataSeeder::class);
    }

    private function buatPegawai(string $role = 'PEGAWAI', string $golongan = 'III/a'): array
    {
        $pangkat = MasterPangkatGolongan::where('golongan', $golongan)->first();

        $user = User::factory()->create(['role' => $role]);
        $pegawai = Pegawai::create([
            'user_id'             => $user->id,
            'nip'                 => '1995' . now()->format('ymdHis') . random_int(10, 99),
            'nama_lengkap'        => 'Test Pegawai ' . random_int(100, 999),
            'pangkat_golongan_id' => $pangkat->id,
            'pendidikan_terakhir' => 'S1',
        ]);

        return ['user' => $user, 'pegawai' => $pegawai, 'pangkat' => $pangkat];
    }

    public function test_admin_membuat_pegawai_baru_dengan_akun_user(): void
    {
        $admin = User::factory()->create(['role' => 'ADMIN']);
        $pangkat = MasterPangkatGolongan::where('golongan', 'III/b')->first();

        $response = $this->actingAs($admin, 'sanctum')->postJson('/api/pegawai', [
            'nip'                 => '199002022015031001',
            'nama_lengkap'        => 'Dewi Lestari, S.T',
            'pangkat_golongan_id' => $pangkat->id,
            'pendidikan_terakhir' => 'S1',
            'email'               => 'dewi@kpk.go.id',
            'password'            => 'rahasia123',
        ]);

        $response->assertStatus(201);
        $response->assertJsonPath('data.nip', '199002022015031001');
        $response->assertJsonPath('data.user.role', 'PEGAWAI');

        $this->assertDatabaseHas('users', ['email' => 'dewi@kpk.go.id', 'role' => 'PEGAWAI']);
        $this->assertDatabaseHas('pegawai', ['nip' => '199002022015031001']);
    }

    public function test_pegawai_hanya_melihat_datanya_sendiri_di_daftar_pegawai(): void
    {
        $a = $this->buatPegawai();
        $b = $this->buatPegawai();

        $response = $this->actingAs($a['user'], 'sanctum')->getJson('/api/pegawai');

        $response->assertOk();
        $data = $response->json('data.data');
        $this->assertCount(1, $data);
        $this->assertEquals($a['pegawai']->id, $data[0]['id']);
    }

    public function test_rekapitulasi_menampilkan_rincian_pak_dan_triwulan(): void
    {
        $pegawaiData = $this->buatPegawai();
        $pegawai = $pegawaiData['pegawai'];
        $user = $pegawaiData['user'];
        $predikatBaik = MasterPredikatKinerja::where('nama', 'Baik')->first();

        PenetapanAK::create([
            'pegawai_id'  => $pegawai->id,
            'tahun'       => 2024,
            'ak_dasar'    => 0,
            'ak_lama'     => 100,
            'ak_baru'     => 25,
            'ak_kumulatif'=> 125,
        ]);

        EvaluasiKinerja::create([
            'pegawai_id'        => $pegawai->id,
            'atasan_penilai_id' => $pegawai->id,
            'tahun'             => 2024,
            'periode_bulan'     => 2,
            'predikat_id'       => $predikatBaik->id,
            'angka_kredit'      => 2.08,
        ]);

        $response = $this->actingAs($user, 'sanctum')->getJson("/api/rekapitulasi/{$pegawai->id}/2024");

        $response->assertOk();
        $response->assertJsonPath('data.tahun', 2024);
        $this->assertEquals(100, (float) $response->json('data.ak_lama'));
        // Saat is_final = false, ak_baru bersifat live = sum evaluasi (2.08), bukan nilai stored 25
        $this->assertEquals(2.08, (float) $response->json('data.ak_baru'));
        $this->assertEquals(2.08, (float) $response->json('data.total_ak_baru'));
        $this->assertCount(1, $response->json('data.triwulan.1.rincian'));
        $this->assertEquals(2.08, (float) $response->json('data.triwulan.1.ak_total'));
    }

    public function test_rekapitulasi_live_menghitung_ak_tanpa_finalisasi(): void
    {
        $pegawaiData = $this->buatPegawai();
        $pegawai = $pegawaiData['pegawai'];
        $user = $pegawaiData['user'];
        $predikatBaik = MasterPredikatKinerja::where('nama', 'Baik')->first();

        // Saldo awal dari penetapan (ak_dasar + ak_historis + ak_lama)
        PenetapanAK::create([
            'pegawai_id'   => $pegawai->id,
            'tahun'        => 2024,
            'ak_dasar'     => 20,
            'ak_historis'  => 30,
            'ak_lama'      => 40,
            'ak_baru'      => 0,
            'is_final'     => false,
        ]);

        // Evaluasi kinerja yang sudah tercatat (TW1 & TW2) - belum finalisasi
        EvaluasiKinerja::create([
            'pegawai_id'        => $pegawai->id,
            'atasan_penilai_id' => $pegawai->id,
            'tahun'             => 2024,
            'triwulan'          => 1,
            'periode_bulan'     => 3,
            'predikat_id'       => $predikatBaik->id,
            'angka_kredit'      => 3.00,
        ]);
        EvaluasiKinerja::create([
            'pegawai_id'        => $pegawai->id,
            'atasan_penilai_id' => $pegawai->id,
            'tahun'             => 2024,
            'triwulan'          => 2,
            'periode_bulan'     => 6,
            'predikat_id'       => $predikatBaik->id,
            'angka_kredit'      => 3.00,
        ]);

        // Booster Peningkatan Pendidikan disetujui di tahun berjalan
        PengajuanPendidikan::create([
            'pegawai_id'         => $pegawai->id,
            'jenjang_pendidikan' => 'S2',
            'program_studi'      => 'Magister',
            'jurusan'            => 'Magister',
            'nama_institusi'     => 'Universitas Indonesia',
            'tahun_lulus'        => 2024,
            'file_ijazah'        => 'dokumen/ijazah_s2.pdf',
            'file_bukti_bkn'     => 'dokumen/bukti_bkn.pdf',
            'status'             => 'DISETUJUI',
            'ak_bonus'           => 12.50,
            'diverifikasi_pada'  => '2024-08-01 10:00:00',
        ]);

        $response = $this->actingAs($user, 'sanctum')->getJson("/api/rekapitulasi/{$pegawai->id}/2024/live");

        $response->assertOk();

        // ak_lama = saldo awal (20 + 30 + 40 = 90)
        $this->assertEquals(90, (float) $response->json('data.ak_lama'));

        // ak_baru = sum evaluasi (3 + 3 = 6)
        $this->assertEquals(6, (float) $response->json('data.ak_baru'));

        // ak_booster = 12.50
        $this->assertEquals(12.50, (float) $response->json('data.ak_booster'));

        // ak_kumulatif = 90 + 6 + 12.50 = 108.50
        $this->assertEquals(108.50, (float) $response->json('data.ak_kumulatif'));

        // is_final false - tetap ditampilkan
        $this->assertFalse($response->json('data.is_final'));

        // Triwulan tetap terisi
        $this->assertCount(1, $response->json('data.triwulan.1.rincian'));
        $this->assertCount(1, $response->json('data.triwulan.2.rincian'));
        $this->assertEquals(3.00, (float) $response->json('data.triwulan.1.ak_total'));
    }

    public function test_ringkasan_hanya_untuk_admin(): void
    {
        $pegawaiData = $this->buatPegawai();

        $forbidden = $this->actingAs($pegawaiData['user'], 'sanctum')->getJson('/api/rekapitulasi/ringkasan');
        $forbidden->assertStatus(403);

        $admin = User::factory()->create(['role' => 'ADMIN']);
        $ok = $this->actingAs($admin, 'sanctum')->getJson('/api/rekapitulasi/ringkasan');
        $ok->assertOk();
        $this->assertEquals(1, $ok->json('data.total_pegawai'));
    }

    public function test_admin_update_dan_hapus_pegawai(): void
    {
        $admin = User::factory()->create(['role' => 'ADMIN']);
        $pegawaiData = $this->buatPegawai();
        $pegawai = $pegawaiData['pegawai'];

        $update = $this->actingAs($admin, 'sanctum')->putJson("/api/pegawai/{$pegawai->id}", [
            'pendidikan_terakhir' => 'S2',
        ]);
        $update->assertOk();
        $this->assertEquals('S2', $pegawai->fresh()->pendidikan_terakhir);

        $delete = $this->actingAs($admin, 'sanctum')->deleteJson("/api/pegawai/{$pegawai->id}");
        $delete->assertOk();
        $this->assertDatabaseMissing('pegawai', ['id' => $pegawai->id]);
        $this->assertDatabaseMissing('users', ['id' => $pegawaiData['user']->id]);
    }
}
