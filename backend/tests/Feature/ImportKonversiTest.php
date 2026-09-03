<?php

namespace Tests\Feature;

use App\Models\EvaluasiKinerja;
use App\Models\Pegawai;
use App\Models\PenetapanAK;
use App\Models\User;
use Database\Seeders\MasterDataSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Tests\TestCase;

class ImportKonversiTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(MasterDataSeeder::class);
    }

    private function createCsvFile(array $rows): UploadedFile
    {
        $headers = [
            'nip',
            'nama_lengkap',
            'email',
            'golongan',
            'pendidikan_terakhir',
            'tmt_jabatan',
            'masa_kerja_tahun',
            'masa_kerja_bulan',
            'saldo_historis',
            'tahun',
            'tw1_predikat',
            'tw1_bulan',
            'tw2_predikat',
            'tw2_bulan',
            'tw3_predikat',
            'tw3_bulan',
            'tw4_predikat',
            'tw4_bulan',
            'klaim_ijazah_baru',
        ];

        $output = fopen('php://temp', 'r+');
        fputcsv($output, $headers);
        foreach ($rows as $row) {
            fputcsv($output, $row);
        }
        rewind($output);
        $content = stream_get_contents($output);
        fclose($output);

        return UploadedFile::fake()->createWithContent('import_konversi.csv', $content);
    }

    public function test_admin_dapat_mengunduh_template_csv(): void
    {
        $admin = User::factory()->create(['role' => 'ADMIN']);

        $response = $this->actingAs($admin, 'sanctum')->get('/api/import/template');

        $response->assertOk();
        $this->assertStringContainsString('text/csv', $response->headers->get('Content-Type'));
        $this->assertStringContainsString('199503012025031001', $response->getContent());
        $this->assertStringContainsString('Budi Santoso, S.T', $response->getContent());
    }

    public function test_preview_import_kalkulasi_otomatis_studi_kasus_budi(): void
    {
        $admin = User::factory()->create(['role' => 'ADMIN']);

        $budiRow = [
            '199503012025031001',
            'Budi Santoso, S.T',
            'budi@kpk.go.id',
            'III/a',
            'S1',
            '2025-03-01',
            '3',
            '5',
            '10.00',
            '2025',
            'Sangat Baik',
            '1',
            'Sangat Baik',
            '3',
            'Sangat Baik',
            '3',
            'Baik',
            '3',
            'S1',
        ];

        $file = $this->createCsvFile([$budiRow]);

        $response = $this->actingAs($admin, 'sanctum')->postJson('/api/import/preview', [
            'file' => $file,
        ]);

        $response->assertOk();
        $data = $response->json('data');

        $this->assertEquals(1, $data['total_valid']);
        $this->assertEquals(0, $data['total_error']);
        $this->assertEquals(1, $data['ringkasan_badge']['layak_pangkat']);

        $budi = $data['data'][0];
        $this->assertEquals(42.71, (float) $budi['ak_pak_pelantikan']);
        $this->assertEquals(10.00, (float) $budi['ak_historis']);
        $this->assertEquals(10.42, (float) $budi['ak_baru_tahunan']); // Formula B
        $this->assertEquals(12.50, (float) $budi['ak_booster']);       // Booster S1
        $this->assertEquals(75.63, (float) $budi['ak_kumulatif']);
        $this->assertEquals('LAYAK NAIK PANGKAT', $budi['kelayakan']['badge_label']);
        $this->assertEquals(25.63, (float) $budi['kelayakan']['carry_over']);
    }

    public function test_eksekusi_import_menyimpan_data_lengkap_ke_database(): void
    {
        $admin = User::factory()->create(['role' => 'ADMIN', 'name' => 'Admin Kepegawaian']);

        $budiRow = [
            '199503012025031001',
            'Budi Santoso, S.T',
            'budi.santoso@kpk.go.id',
            'III/a',
            'S1',
            '2025-03-01',
            '3',
            '5',
            '10.00',
            '2025',
            'Sangat Baik',
            '1',
            'Sangat Baik',
            '3',
            'Sangat Baik',
            '3',
            'Baik',
            '3',
            'S1',
        ];

        $file = $this->createCsvFile([$budiRow]);

        $response = $this->actingAs($admin, 'sanctum')->postJson('/api/import/proses', [
            'file' => $file,
        ]);

        $response->assertStatus(201);
        $this->assertEquals(1, $response->json('data.total_diproses'));

        // 1. Verifikasi User & Pegawai Terbuat
        $this->assertDatabaseHas('users', ['email' => 'budi.santoso@kpk.go.id']);
        $this->assertDatabaseHas('pegawai', ['nip' => '199503012025031001']);
        $pegawai = Pegawai::where('nip', '199503012025031001')->first();

        // 2. Verifikasi Evaluasi TW1 - TW4 Terbuat & Terkunci
        $this->assertEquals(4, EvaluasiKinerja::where('pegawai_id', $pegawai->id)->where('tahun', 2025)->count());

        // 3. Verifikasi PenetapanAK Tahun 2025 Final
        $penetapan2025 = PenetapanAK::where('pegawai_id', $pegawai->id)->where('tahun', 2025)->first();
        $this->assertNotNull($penetapan2025);
        $this->assertTrue($penetapan2025->is_final);
        $this->assertEquals(42.71, (float) $penetapan2025->ak_pak_pelantikan);
        $this->assertEquals(10.00, (float) $penetapan2025->ak_historis);
        $this->assertEquals(10.42, (float) $penetapan2025->ak_baru);
        $this->assertEquals(12.50, (float) $penetapan2025->ak_booster);
        $this->assertEquals(75.63, (float) $penetapan2025->ak_kumulatif);
        $this->assertEquals('LAYAK_PANGKAT', $penetapan2025->status_kelayakan);

        // 4. Verifikasi Saldo Carry-Over Tahun 2026 Otomatis Dibuat
        $penetapan2026 = PenetapanAK::where('pegawai_id', $pegawai->id)->where('tahun', 2026)->first();
        $this->assertNotNull($penetapan2026);
        $this->assertEquals(25.63, (float) $penetapan2026->ak_lama);
        $this->assertEquals(25.63, (float) $penetapan2026->ak_kumulatif);

        // 5. Verifikasi Notifikasi Terkirim
        $this->assertDatabaseHas('notifikasi', [
            'user_id' => $pegawai->user_id,
            'tipe'    => 'SUCCESS',
        ]);
    }

    public function test_admin_dapat_mengekspor_rekapitulasi_ke_csv(): void
    {
        $admin = User::factory()->create(['role' => 'ADMIN']);

        $response = $this->actingAs($admin, 'sanctum')->get('/api/rekapitulasi/export?tahun=2025');

        $response->assertOk();
        $this->assertStringContainsString('text/csv', $response->headers->get('Content-Type'));
        $this->assertStringContainsString('Tahun,NIP,Nama Lengkap', $response->getContent());
    }
}
