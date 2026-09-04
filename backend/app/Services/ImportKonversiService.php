<?php

namespace App\Services;

use App\Models\EvaluasiKinerja;
use App\Models\MasterPangkatGolongan;
use App\Models\MasterPredikatKinerja;
use App\Models\Notifikasi;
use App\Models\Pegawai;
use App\Models\PenetapanAK;
use App\Models\PengajuanPendidikan;
use App\Models\User;
use App\Support\XlsxWriter;
use Carbon\Carbon;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;

class ImportKonversiService
{
    protected HitungKonversiService $hitungKonversi;
    protected CarryOverService $carryOverService;
    protected AuditTrailService $auditTrail;

    public function __construct(
        HitungKonversiService $hitungKonversi,
        CarryOverService $carryOverService,
        AuditTrailService $auditTrail
    ) {
        $this->hitungKonversi = $hitungKonversi;
        $this->carryOverService = $carryOverService;
        $this->auditTrail = $auditTrail;
    }

    /**
     * Bangun berkas template XLSX resmi untuk import data konversi kinerja massal.
     * Dibangun secara native (tanpa dependensi pihak ketiga) memakai ZIP + XML OpenXML.
     *
     * @return string berisi biner file .xlsx
     */
    public function getXlsxTemplate(): string
    {
        $rows = [
            [
                'nip', 'nama_lengkap', 'email', 'golongan', 'pendidikan_terakhir',
                'tmt_jabatan', 'masa_kerja_tahun', 'masa_kerja_bulan', 'saldo_historis',
                'tahun', 'tw1_predikat', 'tw1_bulan', 'tw2_predikat', 'tw2_bulan',
                'tw3_predikat', 'tw3_bulan', 'tw4_predikat', 'tw4_bulan', 'klaim_ijazah_baru',
            ],
            [
                '199503012025031001', 'Budi Santoso, S.T', 'budi.santoso@kpk.go.id',
                'III/a', 'S1', '2025-03-01', '3', '5', '10.00', '2025',
                'Sangat Baik', '1', 'Sangat Baik', '3', 'Sangat Baik', '3',
                'Baik', '3', 'S1',
            ],
        ];

        return XlsxWriter::build($rows, 'Template');
    }

    /**
     * Parse file (CSV atau XLSX) menjadi array of associative array baris data.
     *
     * @param UploadedFile|string $file
     * @return array
     */
    public function parseFile($file): array
    {
        $filePath = is_string($file) ? $file : $file->getRealPath();
        $originalName = $file instanceof UploadedFile ? $file->getClientOriginalName() : (is_string($file) ? $file : '');
        $extension = strtolower(pathinfo($originalName, PATHINFO_EXTENSION));

        if ($extension === 'xlsx' || $this->isZipFile($filePath)) {
            return $this->parseXlsxFile($filePath);
        }

        return $this->parseCsvFile($filePath);
    }

    /**
     * Cek apakah file merupakan ZIP archive (format OpenXML .xlsx).
     */
    protected function isZipFile(string $filePath): bool
    {
        $handle = @fopen($filePath, 'r');
        if (!$handle) {
            return false;
        }
        $header = fread($handle, 4);
        fclose($handle);
        return $header === "PK\x03\x04";
    }

    /**
     * Parse file OpenXML .xlsx secara native tanpa dependensi pihak ketiga.
     *
     * @param string $filePath
     * @return array
     */
    public function parseXlsxFile(string $filePath): array
    {
        $zip = new \ZipArchive();
        if ($zip->open($filePath) !== true) {
            return $this->parseCsvFile($filePath);
        }

        // 1. Baca shared strings
        $sharedStrings = [];
        $sharedStringsXml = $zip->getFromName('xl/sharedStrings.xml');
        if ($sharedStringsXml) {
            $xml = @simplexml_load_string($sharedStringsXml);
            if ($xml) {
                foreach ($xml->si as $si) {
                    if (isset($si->t)) {
                        $sharedStrings[] = (string) $si->t;
                    } elseif (isset($si->r)) {
                        $text = '';
                        foreach ($si->r as $r) {
                            $text .= (string) $r->t;
                        }
                        $sharedStrings[] = $text;
                    } else {
                        $sharedStrings[] = '';
                    }
                }
            }
        }

        // 2. Baca sheet pertama
        $sheetXml = $zip->getFromName('xl/worksheets/sheet1.xml');
        if (!$sheetXml) {
            for ($i = 0; $i < $zip->numFiles; $i++) {
                $stat = $zip->statIndex($i);
                if (str_starts_with($stat['name'], 'xl/worksheets/sheet') && str_ends_with($stat['name'], '.xml')) {
                    $sheetXml = $zip->getFromIndex($i);
                    break;
                }
            }
        }
        $zip->close();

        if (!$sheetXml) {
            throw new \InvalidArgumentException('Lembar kerja (worksheet) tidak ditemukan di dalam file Excel.');
        }

        $xml = @simplexml_load_string($sheetXml);
        if (!$xml || !isset($xml->sheetData->row)) {
            return [];
        }

        $rows = [];
        $headers = null;

        foreach ($xml->sheetData->row as $rowNode) {
            $rowValues = [];
            foreach ($rowNode->c as $c) {
                $cellType = (string) $c['t'];
                $val = (string) $c->v;

                if ($cellType === 's') {
                    $idx = (int) $val;
                    $rowValues[] = $sharedStrings[$idx] ?? '';
                } elseif ($cellType === 'inlineStr' && isset($c->is->t)) {
                    $rowValues[] = (string) $c->is->t;
                } else {
                    $rowValues[] = $val;
                }
            }

            if (!$headers) {
                $headers = array_map(function ($h) {
                    return trim(preg_replace('/[\x00-\x1F\x80-\xFF]/', '', strtolower($h)));
                }, $rowValues);
                continue;
            }

            if (empty(array_filter($rowValues, fn ($v) => trim($v) !== ''))) {
                continue;
            }

            $row = [];
            foreach ($headers as $index => $header) {
                $row[$header] = isset($rowValues[$index]) ? trim($rowValues[$index]) : null;
            }
            $rows[] = $row;
        }

        return $rows;
    }

    /**
     * Parse file CSV/text menjadi array of associative array baris data.
     *
     * @param UploadedFile|string $file
     * @return array
     */
    public function parseCsvFile($file): array
    {
        $filePath = is_string($file) ? $file : $file->getRealPath();
        $handle = fopen($filePath, 'r');
        if (!$handle) {
            throw new \InvalidArgumentException('File tidak dapat dibaca.');
        }

        $rows = [];
        $headers = null;
        $delimiter = ',';

        // Deteksi delimiter (koma atau titik koma)
        $firstLine = fgets($handle);
        if ($firstLine !== false) {
            if (substr_count($firstLine, ';') > substr_count($firstLine, ',')) {
                $delimiter = ';';
            }
            rewind($handle);
        }

        while (($data = fgetcsv($handle, 4096, $delimiter)) !== false) {
            // Hapus BOM jika ada pada karakter pertama header
            if (!$headers) {
                $headers = array_map(function ($h) {
                    return trim(preg_replace('/[\x00-\x1F\x80-\xFF]/', '', strtolower($h)));
                }, $data);
                continue;
            }

            // Lewati baris kosong
            if (empty(array_filter($data, fn ($val) => trim($val) !== ''))) {
                continue;
            }

            $row = [];
            foreach ($headers as $index => $header) {
                $row[$header] = isset($data[$index]) ? trim($data[$index]) : null;
            }
            $rows[] = $row;
        }

        fclose($handle);
        return $rows;
    }

    /**
     * Lakukan simulasi / preview hasil kalkulasi tanpa menyimpan ke database (Dry Run).
     *
     * @param UploadedFile|string $file
     * @return array
     */
    public function previewImport($file): array
    {
        $rawRows = $this->parseFile($file);
        $pangkatMap = MasterPangkatGolongan::with('jenjangJabatan')->get()->keyBy(fn ($item) => strtolower($item->golongan));
        $predikatMap = MasterPredikatKinerja::all()->keyBy(fn ($item) => strtolower($item->nama));

        $previewData = [];
        $totalValid = 0;
        $totalError = 0;
        $countLayakKp = 0;
        $countLayakJenjang = 0;
        $countBelumCukup = 0;

        foreach ($rawRows as $index => $row) {
            $rowNumber = $index + 2; // +1 header, +1 1-based index
            $errors = [];

            // 1. Validasi Kolom Wajib
            if (empty($row['nip'])) {
                $errors[] = 'NIP wajib diisi.';
            }
            if (empty($row['nama_lengkap'])) {
                $errors[] = 'Nama lengkap wajib diisi.';
            }

            $golonganKey = strtolower($row['golongan'] ?? '');
            $pangkat = $pangkatMap->get($golonganKey);
            if (!$pangkat) {
                $errors[] = "Golongan '{$row['golongan']}' tidak valid.";
            }

            $tahun = (int) ($row['tahun'] ?? date('Y'));
            if ($tahun < 2020) {
                $errors[] = 'Tahun evaluasi minimal 2020.';
            }

            if (!empty($errors)) {
                $totalError++;
                $previewData[] = [
                    'baris'     => $rowNumber,
                    'is_valid'  => false,
                    'errors'    => $errors,
                    'raw_data'  => $row,
                ];
                continue;
            }

            // 2. Kalkulasi Komponen
            $jenjang = $pangkat->jenjangJabatan;
            $koefisienTahunan = (float) $jenjang->koefisien_tahunan;

            // Modal Awal: AK Dasar
            $akDasar = (float) $pangkat->ak_dasar;

            // PAK Pelantikan
            $mkTahun = (int) ($row['masa_kerja_tahun'] ?? 0);
            $mkBulan = (int) ($row['masa_kerja_bulan'] ?? 0);
            $akPakPelantikan = 0.0;
            if ($mkTahun > 0 || $mkBulan > 0) {
                $calcPak = $this->hitungKonversi->hitungPakPelantikan($mkTahun, $mkBulan, 1.0, $koefisienTahunan);
                $akPakPelantikan = $calcPak['total_ak_pak'];
            }

            // Saldo Historis
            $akHistoris = (float) ($row['saldo_historis'] ?? 0);

            // Kinerja Triwulanan
            $triwulanData = [];
            $totalBulanAktif = 0;
            $predikatTw4Persen = 1.0;
            $predikatTw4Nama = 'Baik';

            foreach (range(1, 4) as $q) {
                $pName = $row["tw{$q}_predikat"] ?? null;
                $pBulan = (int) ($row["tw{$q}_bulan"] ?? ($pName ? 3 : 0));

                $akQ = 0.0;
                $predikatObj = $pName ? $predikatMap->get(strtolower($pName)) : null;
                if ($predikatObj && $pBulan > 0) {
                    $persen = (float) $predikatObj->persentase_konversi;
                    $akQ = round(($pBulan / 12) * $persen * $koefisienTahunan, 2);
                    $totalBulanAktif += $pBulan;

                    if ($q === 4) {
                        $predikatTw4Persen = $persen;
                        $predikatTw4Nama = $predikatObj->nama;
                    }
                }

                $triwulanData["tw{$q}"] = [
                    'predikat'     => $predikatObj?->nama ?? '-',
                    'jumlah_bulan' => $pBulan,
                    'angka_kredit' => $akQ,
                ];
            }

            // Jika tw4 tidak diisi, ambil predikat terakhir yang ada
            if ($totalBulanAktif === 0) {
                $totalBulanAktif = 12; // default full year
            }

            // Formula B (TW4 Anchor)
            $akBaru = round(($totalBulanAktif / 12) * $predikatTw4Persen * $koefisienTahunan, 2);

            // Booster Ijazah
            $akBooster = 0.0;
            $klaimIjazah = strtoupper(trim($row['klaim_ijazah_baru'] ?? ''));
            if (!empty($klaimIjazah) && in_array($klaimIjazah, ['D3', 'S1', 'S2', 'S3'])) {
                $akBooster = round(0.25 * (float) $jenjang->kebutuhan_ak_kp, 2);
            }

            // Total AK Kumulatif
            $akKumulatif = round($akDasar + $akPakPelantikan + $akHistoris + $akBaru + $akBooster, 2);

            // Evaluasi Badge Kelayakan
            $kelayakan = $this->carryOverService->evaluasiKelayakan(
                new Pegawai(['pangkat_golongan_id' => $pangkat->id]),
                $akKumulatif
            );

            if ($kelayakan['status'] === 'LAYAK_PANGKAT') {
                $countLayakKp++;
            } elseif ($kelayakan['status'] === 'LAYAK_JENJANG') {
                $countLayakJenjang++;
            } else {
                $countBelumCukup++;
            }

            $totalValid++;
            $previewData[] = [
                'baris'             => $rowNumber,
                'is_valid'          => true,
                'nip'               => $row['nip'],
                'nama_lengkap'      => $row['nama_lengkap'],
                'golongan'          => $pangkat->golongan,
                'jenjang'           => $jenjang->nama,
                'tahun'             => $tahun,
                'ak_dasar'          => $akDasar,
                'ak_pak_pelantikan' => $akPakPelantikan,
                'ak_historis'       => $akHistoris,
                'total_bulan_aktif' => $totalBulanAktif,
                'predikat_tw4'      => $predikatTw4Nama,
                'ak_baru_tahunan'   => $akBaru,
                'ak_booster'        => $akBooster,
                'ak_kumulatif'      => $akKumulatif,
                'kelayakan'         => [
                    'status'      => $kelayakan['status'],
                    'badge_label' => $kelayakan['badge_label'],
                    'badge_color' => $kelayakan['badge_color'],
                    'carry_over'  => $kelayakan['carry_over'],
                    'kurang_ak'   => $kelayakan['kurang_ak'],
                    'catatan'     => $kelayakan['catatan'],
                ],
                'triwulan'          => $triwulanData,
            ];
        }

        return [
            'total_baris'      => count($rawRows),
            'total_valid'      => $totalValid,
            'total_error'      => $totalError,
            'ringkasan_badge'  => [
                'layak_pangkat' => $countLayakKp,
                'layak_jenjang' => $countLayakJenjang,
                'belum_cukup'   => $countBelumCukup,
            ],
            'data'             => $previewData,
        ];
    }

    /**
     * Eksekusi import massal & auto-konversi ke database secara atomik.
     *
     * @param UploadedFile|string $file
     * @param User $admin
     * @return array
     */
    public function executeImport($file, User $admin): array
    {
        $preview = $this->previewImport($file);
        if ($preview['total_error'] > 0 && $preview['total_valid'] === 0) {
            throw new \InvalidArgumentException('Seluruh baris file tidak valid. Periksa format data Anda.');
        }

        $pangkatMap = MasterPangkatGolongan::with('jenjangJabatan')->get()->keyBy(fn ($item) => strtolower($item->golongan));
        $predikatMap = MasterPredikatKinerja::all()->keyBy(fn ($item) => strtolower($item->nama));

        $importedPegawai = [];

        DB::transaction(function () use ($preview, $pangkatMap, $predikatMap, $admin, &$importedPegawai) {
            foreach ($preview['data'] as $item) {
                if (!$item['is_valid']) {
                    continue;
                }

                $golonganKey = strtolower($item['golongan']);
                $pangkat = $pangkatMap->get($golonganKey);

                // 1. Buat / Update User Login
                $email = $item['raw_data']['email'] ?? (Str::slug($item['nama_lengkap'], '.') . '@kpk.go.id');
                $user = User::firstOrCreate(
                    ['email' => $email],
                    [
                        'name'     => $item['nama_lengkap'],
                        'password' => Hash::make('password123'), // Default password
                        'role'     => 'PEGAWAI',
                    ]
                );

                // 2. Buat / Update Data Pegawai
                $pegawai = Pegawai::updateOrCreate(
                    ['nip' => $item['nip']],
                    [
                        'user_id'             => $user->id,
                        'nama_lengkap'        => $item['nama_lengkap'],
                        'pangkat_golongan_id' => $pangkat->id,
                        'pendidikan_terakhir' => $item['raw_data']['pendidikan_terakhir'] ?? 'S1',
                        'tmt_jabatan'         => !empty($item['raw_data']['tmt_jabatan']) ? $item['raw_data']['tmt_jabatan'] : null,
                    ]
                );

                $tahun = $item['tahun'];

                // 3. Simpan Evaluasi Kinerja TW1 – TW4
                foreach (range(1, 4) as $q) {
                    $twInfo = $item['triwulan']["tw{$q}"];
                    $predName = $twInfo['predikat'];
                    $pBulan = $twInfo['jumlah_bulan'];

                    if ($predName !== '-' && $pBulan > 0) {
                        $predObj = $predikatMap->get(strtolower($predName));
                        if ($predObj) {
                            EvaluasiKinerja::updateOrCreate(
                                [
                                    'pegawai_id' => $pegawai->id,
                                    'tahun'      => $tahun,
                                    'triwulan'   => $q,
                                ],
                                [
                                    'periode_bulan' => $q * 3,
                                    'jumlah_bulan'  => $pBulan,
                                    'predikat_id'   => $predObj->id,
                                    'angka_kredit'  => $twInfo['angka_kredit'],
                                    'is_locked'     => true,
                                ]
                            );
                        }
                    }
                }

                // 4. Proses Booster Ijazah jika ada klaim
                $akBooster = $item['ak_booster'];
                $klaimIjazah = strtoupper(trim($item['raw_data']['klaim_ijazah_baru'] ?? ''));
                if ($akBooster > 0 && !empty($klaimIjazah)) {
                    PengajuanPendidikan::firstOrCreate(
                        [
                            'pegawai_id'         => $pegawai->id,
                            'jenjang_pendidikan' => $klaimIjazah,
                        ],
                        [
                            'program_studi'      => 'Pendidikan Terkait Penugasan',
                            'jurusan'            => 'Pendidikan Terkait Penugasan',
                            'nama_institusi'     => 'Institusi Terakreditasi',
                            'tahun_lulus'        => $tahun,
                            'file_ijazah'        => 'import_auto_generated.pdf',
                            'file_bukti_bkn'     => 'import_bkn_approval.pdf',
                            'status'             => 'DISETUJUI',
                            'catatan_verifikasi' => "Disetujui otomatis melalui Import Konversi Kinerja. Bonus +{$akBooster} AK.",
                            'ak_bonus'           => $akBooster,
                            'diverifikasi_oleh'  => $admin->id,
                            'diverifikasi_pada'  => now(),
                        ]
                    );

                    $pegawai->update(['pendidikan_terakhir' => $klaimIjazah]);
                }

                // 5. Simpan & Finalisasi PenetapanAK Tahun Ini
                $kelayakan = $item['kelayakan'];
                $penetapan = PenetapanAK::updateOrCreate(
                    [
                        'pegawai_id' => $pegawai->id,
                        'tahun'      => $tahun,
                    ],
                    [
                        'ak_dasar'          => $item['ak_dasar'],
                        'ak_pak_pelantikan' => $item['ak_pak_pelantikan'],
                        'ak_historis'       => $item['ak_historis'],
                        'ak_lama'           => 0,
                        'ak_baru'           => $item['ak_baru_tahunan'],
                        'ak_booster'        => $akBooster,
                        'ak_carry_over'     => 0,
                        'ak_kumulatif'      => $item['ak_kumulatif'],
                        'status_kelayakan'  => $kelayakan['status'],
                        'catatan_kelayakan' => $kelayakan['catatan'],
                        'is_final'          => true,
                    ]
                );

                // 6. Siapkan Deposit Carry-Over ke Tahun Berikutnya (Tahun + 1)
                $tahunBerikutnya = $tahun + 1;
                PenetapanAK::updateOrCreate(
                    [
                        'pegawai_id' => $pegawai->id,
                        'tahun'      => $tahunBerikutnya,
                    ],
                    [
                        'ak_dasar'          => $item['ak_dasar'],
                        'ak_pak_pelantikan' => 0,
                        'ak_historis'       => 0,
                        'ak_lama'           => $kelayakan['carry_over'],
                        'ak_carry_over'     => $kelayakan['carry_over'],
                        'ak_baru'           => 0,
                        'ak_booster'        => 0,
                        'ak_kumulatif'      => $kelayakan['carry_over'],
                        'status_kelayakan'  => 'BELUM_CUKUP',
                        'is_final'          => false,
                    ]
                );

                // 7. Kirim Notifikasi ke Pegawai
                $tipeNotif = $kelayakan['status'] === 'BELUM_CUKUP' ? 'INFO' : 'SUCCESS';
                Notifikasi::create([
                    'user_id' => $user->id,
                    'judul'   => "Konversi Angka Kredit Tahun {$tahun} Selesai - [{$kelayakan['badge_label']}]",
                    'pesan'   => "Data kinerja dan penetapan AK Anda tahun {$tahun} telah berhasil dikonversi. Total AK Kumulatif: {$item['ak_kumulatif']} AK. Status: {$kelayakan['badge_label']}.",
                    'tipe'    => $tipeNotif,
                ]);

                $importedPegawai[] = [
                    'nip'          => $pegawai->nip,
                    'nama_lengkap' => $pegawai->nama_lengkap,
                    'ak_kumulatif' => $item['ak_kumulatif'],
                    'badge_label'  => $kelayakan['badge_label'],
                    'carry_over'   => $kelayakan['carry_over'],
                ];
            }

            // 8. Audit Trail
            $this->auditTrail->log(
                'IMPORT_KONVERSI',
                'BULK_IMPORT',
                "Admin {$admin->name} berhasil mengimpor & mengonversi " . count($importedPegawai) . " data pegawai."
            );
        });

        return [
            'message'          => 'Import dan konversi kinerja massal berhasil dieksekusi.',
            'total_diproses'   => count($importedPegawai),
            'ringkasan_badge'  => $preview['ringkasan_badge'],
            'data_pegawai'     => $importedPegawai,
        ];
    }
}
