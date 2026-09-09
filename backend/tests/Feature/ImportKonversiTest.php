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
            'asal_jabatan',
            'jenjang_jabatan',
            'pendidikan_terakhir',
            'tmt_jabatan',
            'masa_kerja_tahun',
            'masa_kerja_bulan',
            'saldo_historis',
            'tw1_predikat',
            'tw1_bulan',
            'tw2_predikat',
            'tw2_bulan',
            'tw3_predikat',
            'tw3_bulan',
            'tw4_predikat',
            'tw4_bulan',
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

    private function createCsvFileWithHeaders(array $headers, array $rows): UploadedFile
    {
        $output = fopen('php://temp', 'r+');
        fputcsv($output, $headers);
        foreach ($rows as $row) {
            fputcsv($output, $row);
        }
        rewind($output);
        $content = stream_get_contents($output);
        fclose($output);

        return UploadedFile::fake()->createWithContent('import_flexible.csv', $content);
    }

    private function writeTempCsv(string $content): string
    {
        $path = tempnam(sys_get_temp_dir(), 'import') . '.csv';
        file_put_contents($path, $content);
        return $path;
    }

    public function test_admin_dapat_mengunduh_template_xlsx(): void
    {
        $admin = User::factory()->create(['role' => 'ADMIN']);

        $response = $this->actingAs($admin, 'sanctum')->get('/api/import/template');

        $response->assertOk();
        $this->assertStringContainsString(
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            $response->headers->get('Content-Type')
        );

        // Buka response biner sebagai ZIP XLSX dan verifikasi isi sheet
        $tempPath = tempnam(sys_get_temp_dir(), 'template') . '.xlsx';
        file_put_contents($tempPath, $response->getContent());

        $zip = new \ZipArchive();
        $this->assertTrue($zip->open($tempPath) === true, 'Respons bukan arsip XLSX yang valid.');

        $sheet = $zip->getFromName('xl/worksheets/sheet1.xml');
        $zip->close();
        @unlink($tempPath);

        $this->assertNotFalse($sheet, 'Worksheet sheet1.xml tidak ditemukan.');
        $this->assertStringContainsString('nip', $sheet);
        $this->assertStringContainsString('199503012025031001', $sheet);
        $this->assertStringContainsString('Budi Santoso, S.T', $sheet);
    }

    public function test_preview_import_kalkulasi_otomatis_studi_kasus_budi(): void
    {
        $admin = User::factory()->create(['role' => 'ADMIN']);

        $budiRow = [
            '199503012025031001',
            'Budi Santoso, S.T',
            'budi@kpk.go.id',
            'III/a',
            'PELAKSANA',
            'Ahli Pertama',
            'S1',
            '2025-03-01',
            '3',
            '5',
            '10.00',
            'Sangat Baik',
            '1',
            'Sangat Baik',
            '3',
            'Sangat Baik',
            '3',
            'Baik',
            '3',
        ];

        $file = $this->createCsvFile([$budiRow]);

        $response = $this->actingAs($admin, 'sanctum')->postJson('/api/import/preview', [
            'file' => $file,
            'tahun' => 2025,
        ]);

        $response->assertOk();
        $data = $response->json('data');

        $this->assertEquals(1, $data['total_valid']);
        $this->assertEquals(0, $data['total_error']);
        $this->assertEquals(1, $data['ringkasan_badge']['layak_pangkat']);

        $budi = $data['data'][0];
        $this->assertEqualsWithDelta(42.71, (float) $budi['ak_pak_pelantikan'], 0.01);
        $this->assertEquals(10.00, (float) $budi['ak_historis']);
        // TW1-3 sudah LAYAK (63.65 AK) -> akumulasi periodik penuh:
        // 1.563 + 4.688 + 4.688 + 3.125 = 14.064 (tanpa booster: klaim ijazah
        // hanya via verifikasi Pengajuan Pendidikan, bukan import)
        $this->assertEquals(14.064, (float) $budi['ak_baru_tahunan']);
        $this->assertEquals(0.00, (float) $budi['ak_booster']);
        $this->assertEqualsWithDelta(66.77, (float) $budi['ak_kumulatif'], 0.01);
        $this->assertEquals('LAYAK NAIK PANGKAT', $budi['kelayakan']['badge_label']);
        $this->assertEqualsWithDelta(16.77, (float) $budi['kelayakan']['carry_over'], 0.01);
    }

    public function test_preview_import_promosi_iii_b_ke_ahli_muda_menggunakan_target_jenjang(): void
    {
        $admin = User::factory()->create(['role' => 'ADMIN']);

        $row = [
            '199503012025031002',
            'Siti Promosi',
            'siti@kpk.go.id',
            'III/b',
            'PENGAWAS',
            'Ahli Muda',
            'S1',
            '',
            '0',
            '0',
            '10.00',
            '2025',
            '',
            '0',
            '',
            '0',
            '',
            '0',
            '',
            '0',
            '',
        ];

        $response = $this->actingAs($admin, 'sanctum')->postJson('/api/import/preview', [
            'file' => $this->createCsvFile([$row]),
        ]);

        $response->assertOk();
        $item = $response->json('data.data.0');

        $this->assertEquals(85.00, (float) $item['ak_kumulatif']);
        $this->assertEquals('BELUM_CUKUP', $item['kelayakan']['status']);
        $this->assertEquals(100.00, (float) $item['kelayakan']['target_jenjang']);
        $this->assertEquals(15.00, (float) $item['kelayakan']['kurang_ak']);
    }

    public function test_preview_import_iii_b_dengan_jenjang_aktif_ahli_pertama_tetap_menilai_target_jenjang(): void
    {
        $admin = User::factory()->create(['role' => 'ADMIN']);

        $row = [
            '199104042018041004',
            'Budi',
            'budi@kpk.go.id',
            'III/b',
            'JABATAN_FUNGSIONAL',
            'Ahli Pertama',
            'S1',
            '',
            '0',
            '0',
            '0',
            '2025',
            '',
            '',
            '',
            '',
            '',
            '',
            '',
            '',
            '',
        ];

        $response = $this->actingAs($admin, 'sanctum')->postJson('/api/import/preview', [
            'file' => $this->createCsvFile([$row]),
        ]);

        $response->assertOk();
        $item = $response->json('data.data.0');

        $this->assertEquals('BELUM_CUKUP', $item['kelayakan']['status']);
        $this->assertEquals('JENJANG', $item['kelayakan']['jenis_target']);
        $this->assertEquals(100.00, (float) $item['kelayakan']['target_jenjang']);
    }

    public function test_eksekusi_import_menyimpan_data_lengkap_ke_database(): void
    {
        $admin = User::factory()->create(['role' => 'ADMIN', 'name' => 'Admin Kepegawaian']);

        $budiRow = [
            '199503012025031001',
            'Budi Santoso, S.T',
            'budi.santoso@kpk.go.id',
            'III/a',
            'PELAKSANA',
            'Ahli Pertama',
            'S1',
            '2025-03-01',
            '3',
            '5',
            '10.00',
            'Sangat Baik',
            '1',
            'Sangat Baik',
            '3',
            'Sangat Baik',
            '3',
            'Baik',
            '3',
        ];

        $file = $this->createCsvFile([$budiRow]);

        $response = $this->actingAs($admin, 'sanctum')->postJson('/api/import/proses', [
            'file' => $file,
            'tahun' => 2025,
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
        $this->assertEqualsWithDelta(42.71, (float) $penetapan2025->ak_pak_pelantikan, 0.01);
        $this->assertEquals(10.00, (float) $penetapan2025->ak_historis);
        $this->assertEquals(14.064, (float) $penetapan2025->ak_baru);
        $this->assertEquals(0.00, (float) $penetapan2025->ak_booster);
        $this->assertEqualsWithDelta(66.77, (float) $penetapan2025->ak_kumulatif, 0.01);
        $this->assertEquals('LAYAK_PANGKAT', $penetapan2025->status_kelayakan);

        // 4. Verifikasi Saldo Carry-Over Tahun 2026 Otomatis Dibuat
        $penetapan2026 = PenetapanAK::where('pegawai_id', $pegawai->id)->where('tahun', 2026)->first();
        $this->assertNotNull($penetapan2026);
        $this->assertEqualsWithDelta(16.77, (float) $penetapan2026->ak_lama, 0.01);
        $this->assertEqualsWithDelta(16.77, (float) $penetapan2026->ak_kumulatif, 0.01);

        // 5. Verifikasi Notifikasi Terkirim
        $this->assertDatabaseHas('notifikasi', [
            'user_id' => $pegawai->user_id,
            'tipe'    => 'SUCCESS',
        ]);
    }

    public function test_preview_import_tolak_pelaksana_lompat_ke_ahli_muda_kasus_a(): void
    {
        $admin = User::factory()->create(['role' => 'ADMIN']);

        // Pelaksana gol. III/c (jenjang natural Ahli Muda) tanpa target Ahli Pertama -> ditolak (Kasus A).
        $row = [
            '199503012025031001',
            'Budi Santoso, S.T',
            'budi@kpk.go.id',
            'III/c',
            'PELAKSANA',
            '',
            'S1',
            '2025-03-01',
            '3',
            '5',
            '10.00',
            'Sangat Baik',
            '1',
            'Sangat Baik',
            '3',
            'Sangat Baik',
            '3',
            'Baik',
            '3',
        ];

        $file = $this->createCsvFile([$row]);

        $response = $this->actingAs($admin, 'sanctum')->postJson('/api/import/preview', ['file' => $file, 'tahun' => 2025]);

        $response->assertOk();
        $data = $response->json('data');

        $this->assertEquals(0, $data['total_valid']);
        $this->assertEquals(1, $data['total_error']);
        $this->assertFalse($data['data'][0]['is_valid']);
        $this->assertStringContainsString('Ahli Pertama', implode(' ', $data['data'][0]['errors']));
    }

    public function test_preview_import_pelaksana_iii_c_ke_ahli_pertama_flat_100_kasus_b(): void
    {
        $admin = User::factory()->create(['role' => 'ADMIN']);

        // Pelaksana gol. III/c diangkat ke Ahli Pertama -> 100 AK flat (Kasus B).
        $row = [
            '199503012025031001',
            'Budi Santoso, S.T',
            'budi@kpk.go.id',
            'III/c',
            'PELAKSANA',
            'Ahli Pertama',
            'S1',
            '2025-03-01',
            '10',
            '0',
            '10.00',
            'Sangat Baik',
            '1',
            'Sangat Baik',
            '3',
            'Sangat Baik',
            '3',
            'Baik',
            '3',
        ];

        $file = $this->createCsvFile([$row]);

        $response = $this->actingAs($admin, 'sanctum')->postJson('/api/import/preview', ['file' => $file, 'tahun' => 2025]);

        $response->assertOk();
        $data = $response->json('data');

        $this->assertEquals(1, $data['total_valid']);
        $this->assertEquals(0, $data['total_error']);

        $budi = $data['data'][0];
        $this->assertEquals(100.00, (float) $budi['ak_pak_pelantikan']);
        $this->assertEquals('Ahli Pertama', $budi['jenjang']);
        $this->assertNotNull($budi['penyesuaian_khusus']);
        $this->assertStringContainsString('Penyesuaian Perpindahan', $budi['penyesuaian_khusus']);
    }

    public function test_eksekusi_import_persist_jalur_jabatan_kasus_b(): void
    {
        $admin = User::factory()->create(['role' => 'ADMIN', 'name' => 'Admin Kepegawaian']);

        // Pelaksana gol. III/c diangkat ke Ahli Pertama -> 100 AK flat & disimpan jalur jabatannya.
        $row = [
            '199503012025031001',
            'Budi Santoso, S.T',
            'budi.santoso@kpk.go.id',
            'III/c',
            'PELAKSANA',
            'Ahli Pertama',
            'S1',
            '2025-03-01',
            '10',
            '0',
            '10.00',
            'Sangat Baik',
            '1',
            'Sangat Baik',
            '3',
            'Sangat Baik',
            '3',
            'Baik',
            '3',
        ];

        $file = $this->createCsvFile([$row]);

        $response = $this->actingAs($admin, 'sanctum')->postJson('/api/import/proses', ['file' => $file, 'tahun' => 2025]);

        $response->assertStatus(201);
        $this->assertEquals(1, $response->json('data.total_diproses'));

        $pegawai = Pegawai::where('nip', '199503012025031001')->firstOrFail();
        $this->assertEquals('PELAKSANA', $pegawai->asal_jabatan);
        $this->assertNotNull($pegawai->jenjang_jabatan_id);
        $this->assertEquals('Ahli Pertama', $pegawai->jenjangJabatan->nama);

        $penetapan = PenetapanAK::where('pegawai_id', $pegawai->id)->where('tahun', 2025)->firstOrFail();
        $this->assertEquals(100.00, (float) $penetapan->ak_pak_pelantikan);
    }

    public function test_admin_dapat_mengekspor_rekapitulasi_ke_xlsx(): void
    {
        $admin = User::factory()->create(['role' => 'ADMIN']);

        $response = $this->actingAs($admin, 'sanctum')->get('/api/rekapitulasi/export?tahun=2025');

        $response->assertOk();
        $this->assertStringContainsString(
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            $response->headers->get('Content-Type')
        );

        // Buka response biner sebagai ZIP XLSX dan verifikasi isi sheet
        $tempPath = tempnam(sys_get_temp_dir(), 'rekap') . '.xlsx';
        file_put_contents($tempPath, $response->getContent());

        $zip = new \ZipArchive();
        $this->assertTrue($zip->open($tempPath) === true, 'Respons bukan arsip XLSX yang valid.');

        $sheet = $zip->getFromName('xl/worksheets/sheet1.xml');
        $zip->close();
        @unlink($tempPath);

        $this->assertNotFalse($sheet, 'Worksheet sheet1.xml tidak ditemukan.');
        $this->assertStringContainsString('Tahun', $sheet);
        $this->assertStringContainsString('Nama Lengkap', $sheet);
    }

    public function test_preview_import_menerima_header_dengan_spasi(): void
    {
        $admin = User::factory()->create(['role' => 'ADMIN']);

        // Header menggunakan spasi antar kata, bukan underscore. Tahun via selector, bukan kolom.
        $headers = [
            'nip', 'nama lengkap', 'email', 'golongan', 'asal jabatan', 'jenjang jabatan',
            'pendidikan terakhir', 'tmt jabatan', 'masa kerja tahun', 'masa kerja bulan',
            'saldo historis', 'tw1 predikat', 'tw1 bulan', 'tw2 predikat',
            'tw2 bulan', 'tw3 predikat', 'tw3 bulan', 'tw4 predikat', 'tw4 bulan',
        ];

        $row = [
            '199503012025031001', 'Budi Santoso, S.T', 'budi@kpk.go.id', 'III/a', 'PELAKSANA',
            'Ahli Pertama', 'S1', '2025-03-01', '3', '5', '10.00', 'Sangat Baik', '1',
            'Sangat Baik', '3', 'Sangat Baik', '3', 'Baik', '3',
        ];

        $file = $this->createCsvFileWithHeaders($headers, [$row]);

        $response = $this->actingAs($admin, 'sanctum')->postJson('/api/import/preview', ['file' => $file, 'tahun' => 2025]);

        $response->assertOk();
        $data = $response->json('data');

        $this->assertEquals(1, $data['total_valid']);
        $this->assertEquals(0, $data['total_error']);
    }

    public function test_preview_import_menerima_header_alias_singkatan(): void
    {
        $admin = User::factory()->create(['role' => 'ADMIN']);

        // Header memakai alias singkatan / variasi umum. Tahun via selector.
        $headers = [
            'NIP', 'Nama', 'Email', 'Pangkat', 'Asal', 'Jenjang',
            'Pendidikan', 'TMT', 'MK Tahun', 'MK Bulan', 'Saldo',
            'Predikat TW1', 'Bulan TW1', 'Predikat TW2', 'Bulan TW2',
            'Predikat TW3', 'Bulan TW3', 'Predikat TW4', 'Bulan TW4',
        ];

        $row = [
            '199503012025031001', 'Budi Santoso, S.T', 'budi@kpk.go.id', 'III/a', 'PELAKSANA',
            'Ahli Pertama', 'S1', '2025-03-01', '3', '5', '10.00', 'Sangat Baik', '1',
            'Sangat Baik', '3', 'Sangat Baik', '3', 'Baik', '3',
        ];

        $file = $this->createCsvFileWithHeaders($headers, [$row]);

        $response = $this->actingAs($admin, 'sanctum')->postJson('/api/import/preview', ['file' => $file, 'tahun' => 2025]);

        $response->assertOk();
        $data = $response->json('data');

        $this->assertEquals(1, $data['total_valid']);
        $this->assertEquals(0, $data['total_error']);

        $pegawai = $data['data'][0];
        // Header alias + TMT-auto: TW1 = 1 bln (TMT Mar), TW2-4 penuh → kelayakan TW3
        // sudah LAYAK sehingga dipakai akumulasi periodik penuh (tanpa booster).
        $this->assertEquals('66.77', number_format($pegawai['ak_kumulatif'], 2, '.', ''));
    }

    public function test_preview_import_menerima_header_tidak_di_baris_pertama(): void
    {
        $admin = User::factory()->create(['role' => 'ADMIN']);

        // Simulasi file dengan judul/meta di atas, header baru muncul di baris berikutnya. Tahun via selector.
        $content = implode("\n", [
            'DATA KONVERSI KINERJA KPK TAHUN 2025',
            '',
            'Diolah oleh: Bagian Kepegawaian',
            'nip,nama_lengkap,email,golongan,asal_jabatan,jenjang_jabatan,pendidikan_terakhir,tmt_jabatan,masa_kerja_tahun,masa_kerja_bulan,saldo_historis,tw1_predikat,tw1_bulan,tw2_predikat,tw2_bulan,tw3_predikat,tw3_bulan,tw4_predikat,tw4_bulan',
            '199503012025031001,Budi Santoso S.T,budi@kpk.go.id,III/a,PELAKSANA,Ahli Pertama,S1,2025-03-01,3,5,10.00,Sangat Baik,1,Sangat Baik,3,Sangat Baik,3,Baik,3',
        ]);

        $file = UploadedFile::fake()->createWithContent('import_meta.csv', $content);

        $response = $this->actingAs($admin, 'sanctum')->postJson('/api/import/preview', ['file' => $file, 'tahun' => 2025]);

        $response->assertOk();
        $data = $response->json('data');

        $this->assertEquals(1, $data['total_valid']);
        $this->assertEquals(0, $data['total_error']);
        $this->assertEquals('199503012025031001', $data['data'][0]['nip']);
        $this->assertEquals('Budi Santoso S.T', $data['data'][0]['nama_lengkap']);
    }

    public function test_preview_import_mengkonversi_tanggal_dan_nip_scientific_notation(): void
    {
        $admin = User::factory()->create(['role' => 'ADMIN']);

        // NIP Excel dirender scientific notation, tanggal format d/m/Y.
        $content = implode("\n", [
            'nip,nama_lengkap,email,golongan,asal_jabatan,jenjang_jabatan,pendidikan_terakhir,tmt_jabatan,masa_kerja_tahun,masa_kerja_bulan,saldo_historis,tahun,tw1_predikat,tw1_bulan,tw2_predikat,tw2_bulan,tw3_predikat,tw3_bulan,tw4_predikat,tw4_bulan,klaim_ijazah_baru',
            '1.99609E+17,Budi Santoso S.T,budi@kpk.go.id,III/a,PELAKSANA,Ahli Pertama,S1,01/03/2025,3,5,10.00,2025,Sangat Baik,1,Sangat Baik,3,Sangat Baik,3,Baik,3',
        ]);

        // Verifikasi hasil parsing (NIP + tanggal) langsung lewat service.
        $service = app(\App\Services\ImportKonversiService::class);
        $path = $this->writeTempCsv($content);
        $parsed = $service->parseCsvFile($path);
        @unlink($path);

        $this->assertCount(1, $parsed);
        $this->assertEquals('199609000000000000', $parsed[0]['nip']);
        $this->assertEquals('2025-03-01', $parsed[0]['tmt_jabatan']);

        // End-to-end lewat endpoint preview tetap valid.
        $file = UploadedFile::fake()->createWithContent('import_formats.csv', $content);

        $response = $this->actingAs($admin, 'sanctum')->postJson('/api/import/preview', ['file' => $file]);

        $response->assertOk();
        $data = $response->json('data');

        $this->assertEquals(1, $data['total_valid']);
        $this->assertEquals('199609000000000000', $data['data'][0]['nip']);
    }

    public function test_parse_tmt_menerima_serial_date_excel_dan_iso_8601(): void
    {
        $service = app(\App\Services\ImportKonversiService::class);

        // Excel menyimpan tanggal sebagai serial number (mulai 1899-12-30) saat sel
        // diformat Date, bukan teks "01/01/2026". 46023 = 2026-01-01.
        // Baris kedua memakai notasi ISO 8601 (t="d" dari tool OpenXML lain).
        $content = implode("\n", [
            'nip,nama_lengkap,email,golongan,asal_jabatan,jenjang_jabatan,pendidikan_terakhir,tmt_jabatan',
            '199503012025031001,Budi Santoso S.T,budi@kpk.go.id,III/a,PELAKSANA,Ahli Pertama,S1,46023',
            '199503012025031002,Andi Wijaya S.Kom,andi@kpk.go.id,III/b,PELAKSANA,Ahli Pertama,S1,2026-06-01T00:00:00',
        ]);

        $path = $this->writeTempCsv($content);
        $parsed = $service->parseCsvFile($path);
        @unlink($path);

        $this->assertCount(2, $parsed);
        $this->assertEquals('2026-01-01', $parsed[0]['tmt_jabatan']);
        $this->assertEquals('2026-06-01', $parsed[1]['tmt_jabatan']);
    }

    public function test_preview_import_error_jelas_saat_kolom_golongan_hilang(): void
    {
        $admin = User::factory()->create(['role' => 'ADMIN']);

        // Header tidak memuat kolom golongan (tanpa alias apa pun).
        $content = implode("\n", [
            'nip,nama_lengkap,email,jabatan',
            '199503012025031001,Budi Santoso S.T,budi@kpk.go.id,PELAKSANA',
        ]);

        $file = UploadedFile::fake()->createWithContent('import_missing.csv', $content);

        $response = $this->actingAs($admin, 'sanctum')->postJson('/api/import/preview', ['file' => $file]);

        $response->assertStatus(422);
        $response->assertJsonPath('message', 'Gagal memproses file: Kolom wajib golongan tidak ditemukan di header. Pastikan header file mengikuti template (nip, nama_lengkap, golongan, dst) dan berada di baris awal.');
    }

    private function createPkpCsvFile(array $rows): UploadedFile
    {
        // Template baru: tanpa kolom tahun, tahun dipilih via selector UI.
        $headers = [
            'nip', 'nama_lengkap', 'email', 'golongan', 'asal_jabatan', 'jenjang_jabatan',
            'pendidikan_terakhir', 'tmt_jabatan', 'masa_kerja_tahun', 'masa_kerja_bulan',
            'saldo_historis', 'Predikat Kinerja Pegawai (PKP)',
        ];

        return $this->createCsvFileWithHeaders($headers, $rows);
    }

    public function test_template_memuat_kolom_tunggal_pkp(): void
    {
        $admin = User::factory()->create(['role' => 'ADMIN']);

        $response = $this->actingAs($admin, 'sanctum')->get('/api/import/template');

        $response->assertOk();

        $tempPath = tempnam(sys_get_temp_dir(), 'template') . '.xlsx';
        file_put_contents($tempPath, $response->getContent());

        $zip = new \ZipArchive();
        $this->assertTrue($zip->open($tempPath) === true);
        $shared = $zip->getFromName('xl/sharedStrings.xml') ?: '';
        $sheet = $zip->getFromName('xl/worksheets/sheet1.xml') ?: '';
        $zip->close();
        @unlink($tempPath);

        $this->assertStringContainsString('PKP', $shared . $sheet);
        $this->assertStringNotContainsString('tw1_predikat', strtolower($shared . $sheet));
    }

    public function test_preview_import_triwulan_hanya_hitung_quarter_terpilih(): void
    {
        $admin = User::factory()->create(['role' => 'ADMIN']);

        // Tanpa TMT: tiap triwulan penuh 3 bulan. Ahli Pertama koef 12.5, Sangat Baik 150%.
        $row = [
            '199503012025031001', 'Budi Santoso, S.T', 'budi@kpk.go.id', 'III/a',
            'JABATAN_FUNGSIONAL', 'Ahli Pertama', 'S1', '', '0', '0', '0',
            'Sangat Baik',
        ];

        $file = $this->createPkpCsvFile([$row]);

        $response = $this->actingAs($admin, 'sanctum')->postJson('/api/import/preview', [
            'file' => $file,
            'triwulan' => 2,
            'tahun' => 2025,
        ]);

        $response->assertOk();
        $data = $response->json('data');

        $this->assertEquals(1, $data['total_valid']);
        $this->assertEquals(0, $data['total_error']);

        $item = $data['data'][0];
        $this->assertTrue($item['triwulan_mode']);
        $this->assertEquals(2, $item['triwulan_ke']);
        $this->assertEquals('Sangat Baik', $item['pkp']);
        $this->assertEquals(3, $item['jumlah_bulan']);
        // Formula A TW2: (3/12) x 150% x 12.5 = 4.688
        $this->assertEquals(4.688, (float) $item['ak_triwulan']);
        // Proyeksi disetahunkan: (12/12) x 150% x 12.5 = 18.75
        $this->assertEquals(18.75, (float) $item['proyeksi_disetahunkan']);
        $this->assertEquals(4.688, (float) $item['ak_parsial']);
        $this->assertEquals('FORMULA_A_PERIODIK', $item['metode_kalkulasi']);
        // Kumulatif parsial 4.688 < target KP 50 -> BELUM_CUKUP, tetap terinfo
        $this->assertEquals('BELUM_CUKUP', $item['kelayakan']['status']);
        $this->assertEquals(1, $data['ringkasan_badge']['belum_cukup']);
    }

    public function test_preview_import_triwulan_menolak_pkp_kosong(): void
    {
        $admin = User::factory()->create(['role' => 'ADMIN']);

        $row = [
            '199503012025031001', 'Budi Santoso, S.T', 'budi@kpk.go.id', 'III/a',
            'JABATAN_FUNGSIONAL', 'Ahli Pertama', 'S1', '', '0', '0', '0',
            '',
        ];

        $file = $this->createPkpCsvFile([$row]);

        $response = $this->actingAs($admin, 'sanctum')->postJson('/api/import/preview', [
            'file' => $file,
            'triwulan' => 1,
            'tahun' => 2025,
        ]);

        $response->assertOk();
        $data = $response->json('data');

        $this->assertEquals(0, $data['total_valid']);
        $this->assertEquals(1, $data['total_error']);
        $this->assertStringContainsString('PKP', implode(' ', $data['data'][0]['errors']));
    }

    public function test_preview_import_menolak_tmt_setelah_tahun_evaluasi(): void
    {
        $admin = User::factory()->create(['role' => 'ADMIN']);

        $row = [
            '199503012025031001', 'Budi Santoso, S.T', 'budi@kpk.go.id', 'III/a',
            'JABATAN_FUNGSIONAL', 'Ahli Pertama', 'S1', '2026-01-01', '0', '0', '0',
            'Baik',
        ];

        $file = $this->createPkpCsvFile([$row]);

        $response = $this->actingAs($admin, 'sanctum')->postJson('/api/import/preview', [
            'file' => $file,
            'triwulan' => 4,
            'tahun' => 2025,
        ]);

        $response->assertOk();
        $data = $response->json('data');

        $this->assertEquals(0, $data['total_valid']);
        $this->assertEquals(1, $data['total_error']);
        $this->assertStringContainsString('TMT', implode(' ', $data['data'][0]['errors']));
    }

    public function test_eksekusi_import_triwulan_hanya_menyimpan_baris_quarter(): void
    {
        $admin = User::factory()->create(['role' => 'ADMIN', 'name' => 'Admin Kepegawaian']);

        $row = [
            '199503012025031001', 'Budi Santoso, S.T', 'budi.santoso@kpk.go.id', 'III/a',
            'JABATAN_FUNGSIONAL', 'Ahli Pertama', 'S1', '', '0', '0', '0',
            'Sangat Baik',
        ];

        $file = $this->createPkpCsvFile([$row]);

        $response = $this->actingAs($admin, 'sanctum')->postJson('/api/import/proses', [
            'file' => $file,
            'triwulan' => 2,
            'tahun' => 2025,
        ]);

        $response->assertStatus(201);
        $this->assertEquals(1, $response->json('data.total_diproses'));
        $this->assertEquals(2, $response->json('data.triwulan'));

        $pegawai = Pegawai::where('nip', '199503012025031001')->firstOrFail();

        // Hanya 1 baris evaluasi (TW2), tanpa penguncian
        $this->assertEquals(1, EvaluasiKinerja::where('pegawai_id', $pegawai->id)->where('tahun', 2025)->count());
        $evaluasi = EvaluasiKinerja::where('pegawai_id', $pegawai->id)->where('tahun', 2025)->firstOrFail();
        $this->assertEquals(2, (int) $evaluasi->triwulan);
        $this->assertEquals(4.688, (float) $evaluasi->angka_kredit);

        // Tanpa finalisasi tahunan
        $this->assertEquals(0, PenetapanAK::where('pegawai_id', $pegawai->id)->count());
    }
}
