<?php

namespace App\Http\Controllers;

use App\Services\ExportKonversiService;
use App\Services\ImportKonversiService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class ImportExportController extends Controller
{
    protected ImportKonversiService $importService;
    protected ExportKonversiService $exportService;

    public function __construct(
        ImportKonversiService $importService,
        ExportKonversiService $exportService
    ) {
        $this->importService = $importService;
        $this->exportService = $exportService;
    }

    /**
     * Download template resmi CSV/Excel untuk import konversi kinerja.
     */
    public function downloadTemplate(): Response
    {
        $csv = $this->importService->getCsvTemplate();

        return response($csv, 200, [
            'Content-Type'        => 'text/csv; charset=UTF-8',
            'Content-Disposition' => 'attachment; filename="template_import_konversi_kinerja_kpk.csv"',
        ]);
    }

    /**
     * Preview / Dry-Run: Cek hasil parsing & auto-kalkulasi sebelum disimpan ke database.
     */
    public function preview(Request $request): JsonResponse
    {
        if ($request->user()->role !== 'ADMIN') {
            return response()->json(['message' => 'Hanya Admin Kepegawaian yang dapat melakukan import.'], 403);
        }

        $request->validate([
            'file' => 'required|file|mimes:csv,txt,xlsx,xls|max:10240', // Maks 10MB
        ]);

        try {
            $hasil = $this->importService->previewImport($request->file('file'));

            return response()->json([
                'message' => 'Preview hasil konversi import berhasil diproses.',
                'data'    => $hasil,
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'message' => 'Gagal memproses file: ' . $e->getMessage(),
            ], 422);
        }
    }

    /**
     * Eksekusi Import Massal: Simpan ke database, hitung rumus, set badge, dan siapkan carry-over.
     */
    public function proses(Request $request): JsonResponse
    {
        if ($request->user()->role !== 'ADMIN') {
            return response()->json(['message' => 'Hanya Admin Kepegawaian yang dapat melakukan import.'], 403);
        }

        $request->validate([
            'file' => 'required|file|mimes:csv,txt,xlsx,xls|max:10240',
        ]);

        try {
            $hasil = $this->importService->executeImport($request->file('file'), $request->user());

            return response()->json([
                'message' => $hasil['message'],
                'data'    => $hasil,
            ], 201);
        } catch (\Exception $e) {
            return response()->json([
                'message' => 'Gagal mengeksekusi import: ' . $e->getMessage(),
            ], 422);
        }
    }

    /**
     * Ekspor rekapitulasi konversi PAK menjadi file CSV.
     */
    public function export(Request $request): Response
    {
        $tahun = $request->has('tahun') ? (int) $request->input('tahun') : null;
        $csv = $this->exportService->exportCsv($tahun);

        $filename = $tahun ? "rekap_konversi_pak_kpk_{$tahun}.csv" : "rekap_konversi_pak_kpk_semua_tahun.csv";

        return response($csv, 200, [
            'Content-Type'        => 'text/csv; charset=UTF-8',
            'Content-Disposition' => "attachment; filename=\"{$filename}\"",
        ]);
    }
}
