import React, { useState, useRef, useMemo } from "react";
import {
  UploadCloud,
  FileSpreadsheet,
  Award,
  AlertTriangle,
  GraduationCap,
  Users,
  RefreshCw,
  Info,
  ShieldCheck,
  Check,
  FileText,
  XCircle,
  Download,
  Clock,
} from "lucide-react";
import {
  downloadImportTemplate,
  previewImportFile,
  processImportFile,
  type ImportPreviewResponse,
  type PreviewPegawaiItem,
} from "../../api/import";
import {
  Button,
  Card,
  CardHeader,
  Alert,
  FilterPills,
  SearchInput,
  StatusBadge,
  StatCard,
  Modal,
} from "../../components/ui";
import type { FilterStatus, TriwulanRincianItem } from "../../types";
import axios from "axios";

export const ImportKonversi: React.FC = () => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const currendDate = new Date();
  const currentYear = new Date().getFullYear();
  const currentTriwulan = Math.ceil((currendDate.getMonth() + 1) / 3);
  // 1-3 = import triwulan terpisah (satu kolom PKP), 4 = mode Tahunan (TW4 acuan)
  const [triwulan, setTriwulan] = useState<number>(currentTriwulan);
  const [tahun, setTahun] = useState<number>(currentYear);
  const TAHUN_OPTIONS = Array.from(
    { length: 11 },
    (_, i) => currentYear - 5 + i,
  ); // 5 thn lalu s.d. 5 thn depan
  const TAHUN_MIN = 2020;
  const [loadingPreview, setLoadingPreview] = useState<boolean>(false);
  const [loadingProcess, setLoadingProcess] = useState<boolean>(false);
  const [previewResult, setPreviewResult] =
    useState<ImportPreviewResponse | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [buatAkun, setBuatAkun] = useState<boolean>(true);

  const [searchQuery, setSearchQuery] = useState<string>("");
  const [filterStatus, setFilterStatus] = useState<FilterStatus>("ALL");

  // Modal Bedah Perhitungan (Inspection Modal)
  const [inspectItem, setInspectItem] = useState<PreviewPegawaiItem | null>(
    null,
  );

  // Modal Konfirmasi Overwrite (re-upload data yang sudah ada)
  const [confirmOverwrite, setConfirmOverwrite] = useState<boolean>(false);

  type Triwulan = {
    tw1?: TriwulanRincianItem;
    tw2?: TriwulanRincianItem;
    tw3?: TriwulanRincianItem;
    tw4?: TriwulanRincianItem;
  };

  const fileInputRef = useRef<HTMLInputElement>(null);

  const TRI_WULAN_OPTIONS = [
    { value: 1, label: "TW 1", desc: "Jan–Mar" },
    { value: 2, label: "TW 2", desc: "Apr–Jun" },
    { value: 3, label: "TW 3", desc: "Jul–Sep" },
    { value: 4, label: "TW 4 — Tahunan", desc: "Setahun penuh" },
  ];

  const isModeTahunan = triwulan === 4;

  const handleFileProcess = async (file: File) => {
    setSelectedFile(file);
    setErrorMessage(null);
    setSuccessMessage(null);
    setLoadingPreview(true);

    try {
      const result = await previewImportFile(file, buatAkun, triwulan, tahun);
      setPreviewResult(result);
    } catch (err: unknown) {
      if (axios.isAxiosError(err)) {
        setErrorMessage(
          err.response?.data?.message ||
            "Gagal memproses file. Pastikan format spreadsheet valid sesuai template.",
        );
      }
      setPreviewResult(null);
    } finally {
      setLoadingPreview(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFileProcess(file);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) handleFileProcess(file);
  };

  const handleDownloadTemplate = async () => {
    try {
      await downloadImportTemplate();
    } catch {
      setErrorMessage("Gagal mengunduh template spreadsheet.");
    }
  };

  const executeProcessImport = async () => {
    if (!selectedFile) return;

    setLoadingProcess(true);
    setErrorMessage(null);

    try {
      const res = await processImportFile(
        selectedFile,
        buatAkun,
        triwulan,
        tahun,
      );
      setSuccessMessage(
        res.message ||
          `Berhasil mengimpor dan mengonversi ${res.total_diproses} data pegawai ke dalam sistem.`,
      );
      setSelectedFile(null);
      setPreviewResult(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
    } catch (err: unknown) {
      if (axios.isAxiosError(err)) {
        setErrorMessage(
          err.response?.data?.message ||
            "Terjadi kesalahan saat menyimpan data import ke database.",
        );
      }
    } finally {
      setLoadingProcess(false);
    }
  };

  const handleProcessImport = async () => {
    if (!selectedFile) return;

    // Jika ada baris yang akan menimpa data lama, minta konfirmasi dulu.
    if (jumlahOverwrite > 0) {
      setConfirmOverwrite(true);
      return;
    }

    await executeProcessImport();
  };

  const handleConfirmOverwrite = async () => {
    setConfirmOverwrite(false);
    await executeProcessImport();
  };

  const handleReset = () => {
    setSelectedFile(null);
    setPreviewResult(null);
    setErrorMessage(null);
    setSuccessMessage(null);
    setSearchQuery("");
    setFilterStatus("ALL");
    setInspectItem(null);
    setConfirmOverwrite(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleTriwulanChange = (value: number) => {
    if (value === triwulan) return;
    setTriwulan(value);
    // Hasil preview terikat mode triwulan — reset agar tidak tercampur
    handleReset();
  };

  const handleTahunChange = (value: number) => {
    if (value === tahun || value < TAHUN_MIN || value > 2100) return;
    setTahun(value);
    // Preview terikat tahun — reset agar tidak tercampur
    handleReset();
  };

  const filteredData = useMemo(() => {
    if (!previewResult) return [];

    return previewResult.data.filter((item: PreviewPegawaiItem) => {
      const q = searchQuery.toLowerCase().trim();
      const matchSearch =
        !q ||
        (item.nama_lengkap && item.nama_lengkap.toLowerCase().includes(q)) ||
        (item.nip && item.nip.includes(q)) ||
        (item.golongan && item.golongan.toLowerCase().includes(q));

      if (!matchSearch) return false;

      if (filterStatus === "ALL") return true;
      if (filterStatus === "ERROR") return !item.is_valid;
      return item.kelayakan?.status === filterStatus;
    });
  }, [previewResult, searchQuery, filterStatus]);

  const filterOptions = useMemo(() => {
    if (!previewResult) return [];
    const opts = [
      {
        value: "ALL" as FilterStatus,
        label: "Semua",
        count: previewResult.data.length,
        color: "gray",
      },
      {
        value: "LAYAK_PANGKAT" as FilterStatus,
        label: "Layak Pangkat",
        count: previewResult.ringkasan_badge.layak_pangkat,
        color: "emerald",
      },
      {
        value: "LAYAK_JENJANG" as FilterStatus,
        label: "Layak Jenjang",
        count: previewResult.ringkasan_badge.layak_jenjang,
        color: "blue",
      },
      {
        value: "BELUM_CUKUP" as FilterStatus,
        label: "Belum Cukup",
        count: previewResult.ringkasan_badge.belum_cukup,
        color: "amber",
      },
    ];
    if (previewResult.total_error > 0) {
      opts.push({
        value: "ERROR" as FilterStatus,
        label: "Error",
        count: previewResult.total_error,
        color: "red",
      });
    }
    return opts;
  }, [previewResult]);

  // Baris yang akan menimpa data lama (sudah ada di triwulan/tahun ini & berbeda)
  const listOverwrite = useMemo(() => {
    if (!previewResult) return [];
    return previewResult.data.filter(
      (item) => item.is_valid && item.sudah_ada && item.berbeda,
    );
  }, [previewResult]);

  const jumlahOverwrite = listOverwrite.length;

  return (
    <div className="space-y-6">
      {/* 1. Header Banner */}
      <CardHeader
        tag="Konversi Kinerja"
        regulation="PerBKN No. 3/2023"
        title="Import & Konversi Kinerja Massal"
        subtitle="Unggah berkas spreadsheet (.xlsx / .csv) untuk mengonversi Angka Kredit (AK) pegawai KPK, memproyeksikan perolehan kinerja tahunan, serta mengevaluasi kelayakan kenaikan pangkat dan jenjang secara otomatis."
        actions={
          <Button
            variant="secondary"
            icon={<Download className="h-4 w-4 text-gray-500" />}
            onClick={handleDownloadTemplate}
          >
            Unduh Template Spreadsheet
          </Button>
        }
      />

      {/* 2. Alert Feedback */}
      {errorMessage && (
        <Alert
          variant="error"
          title="Terjadi Kesalahan:"
          message={errorMessage}
          onDismiss={() => setErrorMessage(null)}
        />
      )}
      {successMessage && (
        <Alert
          variant="success"
          title="Proses Berhasil!"
          message={successMessage}
          onDismiss={() => setSuccessMessage(null)}
        />
      )}

      {/* 2b. Pilih Periode Import */}
      <Card className="p-4 sm:p-5">
        <div className="flex flex-col gap-4">
          {/* Baris atas: label + selector tahun (fleksibel) */}
          <div className="flex flex-col sm:flex-row sm:items-center gap-3">
            <div className="flex-1 min-w-0">
              <p className="text-xs font-extrabold text-gray-900">
                Periode Import
              </p>
              <p className="text-[11px] font-medium text-gray-500 mt-0.5">
                Pilih tahun evaluasi dan triwulan. TW 1–3 satu kolom PKP; TW 4 —
                Tahunan setahun penuh + finalisasi. Kolom tahun tidak lagi diisi
                di file.
              </p>
            </div>
            <div className="flex items-center gap-2 sm:ml-auto shrink-0">
              <label
                htmlFor="import-tahun-select"
                className="text-[11px] font-extrabold text-gray-700 whitespace-nowrap"
              >
                Tahun
              </label>
              <select
                id="import-tahun-select"
                value={tahun}
                onChange={(e) => handleTahunChange(Number(e.target.value))}
                className="min-w-[110px] rounded-xl border border-gray-200 bg-white px-3 py-2 text-xs font-extrabold text-gray-900 focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none"
              >
                {TAHUN_OPTIONS.map((y) => (
                  <option key={y} value={y}>
                    {y}
                  </option>
                ))}
              </select>
              <span className="hidden sm:inline text-[10px] font-bold text-gray-400 whitespace-nowrap">
                File tanpa kolom tahun
              </span>
            </div>
          </div>
          {/* Baris bawah: pills triwulan — wrap fleksibel di mobile */}
          <div
            className="flex flex-wrap items-center gap-1.5"
            role="radiogroup"
            aria-label="Pilih periode import"
          >
            {TRI_WULAN_OPTIONS.map((opt) => {
              const active = triwulan === opt.value;
              return (
                <button
                  key={opt.value}
                  type="button"
                  role="radio"
                  aria-checked={active}
                  onClick={() => handleTriwulanChange(opt.value)}
                  className={`px-3.5 py-2 rounded-xl text-xs font-extrabold border transition-all cursor-pointer ${
                    active
                      ? "bg-primary text-white border-primary shadow-sm"
                      : "bg-white text-gray-600 border-gray-200 hover:border-primary/40 hover:text-primary"
                  }`}
                >
                  {opt.label}
                  <span
                    className={`block text-[9px] font-bold ${
                      active ? "text-white/70" : "text-gray-400"
                    }`}
                  >
                    {opt.desc}
                  </span>
                </button>
              );
            })}
            <span className="ml-1 inline-flex items-center rounded-full bg-secondary border border-primary/15 px-2.5 py-1 text-[10px] font-extrabold text-primary">
              {tahun} · {isModeTahunan ? "Tahunan" : `TW ${triwulan}`}
            </span>
          </div>
        </div>
        {!isModeTahunan ? (
          <p className="mt-3 rounded-xl bg-secondary/60 border border-primary/15 px-3.5 py-2.5 text-[11px] font-semibold text-primary">
            Mode TW {triwulan} tahun {tahun}: file cukup berisi satu kolom
            “Predikat Kinerja Pegawai (PKP)”.
          </p>
        ) : (
          <p className="mt-3 rounded-xl bg-gray-50 border border-gray-200 px-3.5 py-2.5 text-[11px] font-semibold text-gray-600">
            Mode Tahunan {tahun}: kolom “Predikat Kinerja Pegawai (PKP)” menjadi
            acuan tahunan. Rincian TW 1–TW 3 diabaikan.
          </p>
        )}
      </Card>

      {/* 3. Drag & Drop Upload Zone */}
      <Card className="p-5 sm:p-6">
        <input
          ref={fileInputRef}
          type="file"
          accept=".csv,.xlsx,.xls,.txt"
          onChange={handleFileChange}
          className="hidden"
          id="spreadsheet-upload"
        />

        <label
          htmlFor="spreadsheet-upload"
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={`flex flex-col items-center justify-center p-8 sm:p-10 border-2 border-dashed rounded-xl cursor-pointer transition-all duration-200 text-center ${
            isDragging
              ? "border-primary bg-secondary/50 scale-[0.99]"
              : "border-gray-200 hover:border-primary/50 hover:bg-secondary/20"
          }`}
        >
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-secondary text-primary mb-3.5 border border-primary/15 shadow-xs">
            {loadingPreview ? (
              <RefreshCw className="h-6 w-6 animate-spin" />
            ) : (
              <UploadCloud className="h-6 w-6" />
            )}
          </div>

          <div className="space-y-1">
            <p className="text-sm font-extrabold text-gray-900">
              {selectedFile ? (
                <span className="text-primary">{selectedFile.name}</span>
              ) : (
                "Klik untuk memilih berkas atau seret file ke sini"
              )}
            </p>
            <p className="text-xs font-medium text-gray-400">
              Mendukung format Microsoft Excel (.xlsx, .xls) dan CSV (.csv) ·
              Maksimal 10 MB
            </p>
          </div>

          <div className="mt-4 flex flex-wrap items-center justify-center gap-2 text-[11px] font-bold text-gray-500">
            <span className="inline-flex items-center gap-1 rounded-md bg-gray-100 px-2.5 py-1 text-gray-700">
              <FileSpreadsheet className="h-3 w-3 text-emerald-600" />{" "}
              Sinkronisasi Otomatis NIP
            </span>
            <span className="inline-flex items-center gap-1 rounded-md bg-gray-100 px-2.5 py-1 text-gray-700">
              <ShieldCheck className="h-3 w-3 text-primary" /> Penetapan Kinerja
              Tahunan
            </span>
            <span className="inline-flex items-center gap-1 rounded-md bg-gray-100 px-2.5 py-1 text-gray-700">
              <Award className="h-3 w-3 text-blue-600" /> Evaluasi Kelayakan
              Otomatis
            </span>
          </div>
        </label>

        {loadingPreview && (
          <div className="mt-4 flex items-center justify-center gap-2.5 rounded-xl bg-blue-50 border border-blue-200 p-3.5 text-xs font-bold text-blue-800">
            <RefreshCw className="h-4 w-4 animate-spin text-blue-600" />
            <span>
              Sedang memverifikasi data dan mengeksekusi simulasi kalkulasi di
              memori...
            </span>
          </div>
        )}

        {/* Opsi Buat Akun */}
        <div className="mt-4 flex items-center gap-3 rounded-xl border border-gray-200 bg-gray-50/60 px-4 py-3">
          <input
            id="buat-akun-toggle"
            type="checkbox"
            checked={buatAkun}
            onChange={(e) => setBuatAkun(e.target.checked)}
            className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary cursor-pointer"
          />
          <label
            htmlFor="buat-akun-toggle"
            className="cursor-pointer select-none"
          >
            <span className="text-xs font-extrabold text-gray-900">
              Buat akun login otomatis
            </span>
            <span className="ml-2 text-[11px] font-medium text-gray-500">
              Email dari nama pegawai (tanpa gelar) · Password = NIP + 5 huruf
              depan nama
            </span>
          </label>
        </div>
      </Card>

      {/* 4. Preview Results */}
      {previewResult && (
        <div className="space-y-5 animate-in fade-in duration-300">
          {/* Stat Cards */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:gap-4">
            <StatCard
              label="Total Data"
              value={previewResult.total_valid}
              suffix={`/ ${previewResult.total_baris} Baris`}
              icon={<Users className="h-4 w-4 text-gray-400" />}
            />
            <StatCard
              label="Layak Naik Pangkat"
              value={previewResult.ringkasan_badge.layak_pangkat}
              icon={<Award className="h-4 w-4 text-emerald-600" />}
              color="emerald"
            />
            <StatCard
              label="Layak Naik Jenjang"
              value={previewResult.ringkasan_badge.layak_jenjang}
              icon={<GraduationCap className="h-4 w-4 text-blue-600" />}
              color="blue"
            />
            <StatCard
              label="Belum Cukup AK"
              value={previewResult.ringkasan_badge.belum_cukup}
              icon={<Clock className="h-4 w-4 text-amber-600" />}
              color="amber"
            />
          </div>

          {/* Info Overwrite: data triwulan/tahun ini sudah pernah di-upload */}
          {jumlahOverwrite > 0 && (
            <Alert
              variant="warning"
              title="Perhatian: Beberapa Data Akan Ditimpa"
              message={`${jumlahOverwrite} baris memiliki data yang sudah tersimpan pada ${
                isModeTahunan ? "tahun" : `triwulan ini`
              } namun nilainya berbeda dengan file baru. Baris-baris tersebut akan DITIMPA saat disimpan (lihat label "Overwrite" di tabel). Klik "Terapkan & Simpan ke Database" untuk memprosesnya.`}
            />
          )}

          {/* Decision Bar */}
          <Card className="p-4 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-secondary text-primary shrink-0 border border-primary/15">
                <FileText className="h-4 w-4" />
              </div>
              <div>
                <p className="text-xs font-extrabold text-gray-900">
                  {isModeTahunan
                    ? "Pratinjau Hasil Konversi Siap Diterapkan"
                    : `Pratinjau Import TW ${triwulan} Siap Diterapkan`}
                </p>
                <p className="text-[11px] font-medium text-gray-500">
                  {isModeTahunan
                    ? 'Periksa hasil perhitungan di bawah. Klik tombol "Bedah Nilai" pada baris untuk melihat transparansi asal angka kredit.'
                    : `Hanya baris TW ${triwulan} yang akan disimpan. Penetapan tahunan dilakukan di mode TW 4 — Tahunan.`}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                onClick={handleReset}
                disabled={loadingProcess}
              >
                Batal / Ganti File
              </Button>
              <Button
                variant="primary"
                onClick={handleProcessImport}
                loading={loadingProcess}
                disabled={previewResult.total_valid === 0}
                icon={
                  !loadingProcess ? (
                    <Check className="h-3.5 w-3.5" />
                  ) : undefined
                }
              >
                {loadingProcess
                  ? "Menyimpan ke Database..."
                  : "Terapkan & Simpan ke Database"}
              </Button>
            </div>
          </Card>

          {/* Filter Bar */}
          <Card className="p-3.5 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            <FilterPills
              options={filterOptions}
              active={filterStatus}
              onChange={setFilterStatus}
            />
            <SearchInput
              value={searchQuery}
              onChange={setSearchQuery}
              placeholder="Cari NIP, nama, atau golongan..."
            />
          </Card>

          {/* Detail Table */}
          <Card className="overflow-hidden">
            <div className="p-4 border-b border-gray-100 flex items-center justify-between">
              <div>
                <h2 className="text-sm font-extrabold text-gray-900">
                  Rincian Hasil Konversi Per Pegawai
                </h2>
                <p className="text-[11px] font-medium text-gray-400">
                  Menampilkan {filteredData.length} dari total{" "}
                  {previewResult.data.length} baris data
                </p>
              </div>
              <div className="flex items-center gap-1.5 text-[11px] font-bold text-gray-500">
                <Info className="h-3.5 w-3.5 text-primary" />
                <span>
                  Klik baris / Bedah Nilai untuk melihat breakdown rumus lengkap
                </span>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-gray-50/80 border-b border-gray-200/80 text-gray-500 font-extrabold text-[11px] uppercase tracking-wider">
                    <th className="py-3 px-3.5">Baris</th>
                    <th className="py-3 px-3.5">Pegawai (NIP & Nama)</th>
                    <th className="py-3 px-3.5">Pangkat / Golongan</th>
                    <th className="py-3 px-3.5">Saldo Awal (Modal)</th>
                    <th className="py-3 px-3.5">
                      {isModeTahunan
                        ? "Kinerja Triwulanan"
                        : `Kinerja Triwulanan (s/d TW ${triwulan})`}
                    </th>
                    <th className="py-3 px-3.5 font-black text-gray-900">
                      Total AK
                    </th>
                    <th className="py-3 px-3.5 text-center">
                      Status Kelayakan
                    </th>
                    <th className="py-3 px-3.5 text-center">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 bg-white">
                  {filteredData.length === 0 ? (
                    <tr>
                      <td
                        colSpan={8}
                        className="py-12 text-center text-gray-400 text-xs"
                      >
                        <FileSpreadsheet className="h-8 w-8 mx-auto text-gray-300 mb-2" />
                        <p className="font-bold text-gray-500">
                          Tidak ada baris data yang sesuai dengan filter.
                        </p>
                        <p className="text-[11px] mt-0.5">
                          Coba sesuaikan kata kunci pencarian atau ganti filter
                          status.
                        </p>
                      </td>
                    </tr>
                  ) : (
                    filteredData.map((item) => {
                      const saldoAwalTotal =
                        Number(item.ak_pak_pelantikan || 0) +
                        Number(item.ak_historis || 0) +
                        Number(item.ak_dasar || 0);

                      return (
                        <tr
                          key={item.baris}
                          className={`transition-colors ${
                            item.is_valid ? "hover:bg-gray-50/80" : "bg-error/5"
                          }`}
                        >
                          <td className="py-3 px-3.5 font-mono font-bold text-gray-400">
                            #{item.baris}
                          </td>
                          <td className="py-3 px-3.5">
                            {item.is_valid ? (
                              <div>
                                <p className="font-extrabold text-gray-900 text-xs">
                                  {item.nama_lengkap}
                                </p>
                                <p className="font-mono text-[11px] font-bold text-gray-500 tracking-tight">
                                  {item.nip}
                                </p>
                              </div>
                            ) : (
                              <div>
                                <span className="inline-flex items-center gap-1 text-[11px] font-extrabold text-error">
                                  <XCircle className="h-3.5 w-3.5" /> Baris
                                  Ditolak (Regulasi)
                                </span>
                                <p className="text-[10px] text-error font-medium">
                                  {item.errors?.join(", ")}
                                </p>
                              </div>
                            )}
                          </td>
                          <td className="py-3 px-3.5">
                            <span className="font-mono font-extrabold text-gray-900 text-xs">
                              {item.golongan ?? "-"}
                            </span>
                            <p className="text-[11px] font-medium text-gray-500">
                              {item.jenjang ?? "-"}
                            </p>
                          </td>
                          <td className="py-3 px-3.5 font-mono font-bold text-gray-700">
                            {item.penyesuaian_khusus && (
                              <span
                                title={item.penyesuaian_khusus}
                                className="inline-flex items-center gap-1 rounded bg-purple-50 border border-purple-200 px-1.5 py-0.5 text-[10px] font-bold text-purple-700 mb-1"
                              >
                                <ShieldCheck className="h-3 w-3" /> Penyesuaian
                              </span>
                            )}
                            <div>{saldoAwalTotal.toFixed(3)} AK</div>
                          </td>
<td className="py-3 px-3.5">
                            {item.triwulan_mode ? (
                              <div className="space-y-1">
                                <div className="flex items-center gap-1">
                                  {Object.entries(item.triwulan ?? {})
                                    .sort(
                                      ([a], [b]) =>
                                        Number(a.slice(2)) - Number(b.slice(2)),
                                    )
                                    .map(([qKey, q]) => {
                                      const qNum = Number(qKey.slice(2));
                                      const isCurrent = qNum === item.triwulan_ke;
                                      return (
                                        <span
                                          key={qKey}
                                          title={`TW${qNum}: ${q?.predikat ?? "-"} (${q?.jumlah_bulan ?? 0} bln = ${Number(q?.angka_kredit ?? 0).toFixed(3)} AK)`}
                                          className={`px-1.5 py-0.5 rounded text-[10px] font-bold border ${
                                            isCurrent
                                              ? "bg-secondary text-primary border-primary/20 font-black"
                                              : "bg-gray-100 text-gray-600 border-gray-200"
                                          }`}
                                        >
                                          TW{qNum}:{" "}
                                          {Number(q?.angka_kredit ?? 0).toFixed(
                                            3,
                                          )}
                                        </span>
                                      );
                                    })}
                                </div>
                                {item.sudah_ada && item.berbeda && (
                                  <span
                                    title={`Data lama TW${item.triwulan_ke}: ${item.data_sebelumnya?.predikat ?? "-"} (${item.data_sebelumnya?.jumlah_bulan ?? 0} bln = ${Number(item.data_sebelumnya?.angka_kredit ?? 0).toFixed(3)} AK)\nFile baru: ${item.pkp ?? "-"} (${item.jumlah_bulan ?? 0} bln = ${Number(item.ak_triwulan ?? 0).toFixed(3)} AK)`}
                                    className="inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] font-black border bg-amber-50 text-amber-700 border-amber-300"
                                  >
                                    <AlertTriangle className="h-3 w-3" />
                                    Overwrite
                                  </span>
                                )}
                              </div>
                            ) : (
                              <div className="space-y-1">
                                <div className="flex items-center gap-1">
                                  {["tw1", "tw2", "tw3", "tw4"].map(
                                    (qKey, idx) => {
                                      const q = item.triwulan?.[
                                        qKey as keyof Triwulan
                                      ];
                                      const qNum = idx + 1;
                                      const isTahunan = qNum === 4;
                                      return (
                                        <span
                                          key={qKey}
                                          title={`TW${qNum}: ${q?.predikat ?? "-"} (${q?.jumlah_bulan ?? 0} bln = ${Number(q?.angka_kredit ?? 0).toFixed(3)} AK)`}
                                          className={`px-1.5 py-0.5 rounded text-[10px] font-bold border ${
                                            isTahunan
                                              ? "bg-secondary text-primary border-primary/20 font-black"
                                              : "bg-gray-100 text-gray-600 border-gray-200"
                                          }`}
                                        >
                                          TW{qNum}:{" "}
                                          {Number(q?.angka_kredit ?? 0).toFixed(
                                            3,
                                          )}
                                        </span>
                                      );
                                    },
                                  )}
                                </div>
                                {item.sudah_ada && item.berbeda && (
                                  <span className="inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] font-black border bg-amber-50 text-amber-700 border-amber-300">
                                    <AlertTriangle className="h-3 w-3" />
                                    Overwrite
                                  </span>
                                )}
                              </div>
                            )}
                          </td>
                          <td className="py-3 px-3.5 font-mono font-black text-gray-900 text-sm">
                            {item.triwulan_mode
                              ? `${Number(item.ak_parsial ?? 0).toFixed(3)} AK`
                              : item.ak_kumulatif
                              ? `${item.ak_kumulatif.toFixed(3)} AK`
                              : "0.000 AK"}
                          </td>
                          <td className="py-3 px-3.5 text-center">
                            {item.kelayakan?.status && (
                              <>
                                <StatusBadge status={item.kelayakan.status} />
                                {item.kelayakan.status === "BELUM_CUKUP" && (
                                  <span className="mt-1 block text-[10px] font-bold leading-tight text-amber-800">
                                    {item.kelayakan.jenis_target === "JENJANG"
                                      ? "untuk naik jenjang"
                                      : "untuk naik pangkat"}
                                  </span>
                                )}
                              </>
                            )}
                          </td>
                          <td className="py-3 px-3.5 text-center">
                            {item.is_valid && (
                              <Button
                                variant="secondary"
                                size="sm"
                                className="text-[11px] font-bold"
                                onClick={() => setInspectItem(item)}
                              >
                                Bedah Nilai
                              </Button>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      )}

      {/* 5. Modal Bedah Nilai & Rincian Perhitungan (UX Inspection Modal) */}
      <Modal
        open={!!inspectItem}
        onClose={() => setInspectItem(null)}
        title={
          inspectItem
            ? inspectItem.triwulan_mode
              ? `Bedah Perhitungan TW${inspectItem.triwulan_ke}: ${inspectItem.nama_lengkap}`
              : `Bedah Perhitungan Angka Kredit: ${inspectItem.nama_lengkap}`
            : ""
        }
        subtitle={
          inspectItem
            ? `NIP: ${inspectItem.nip} · Golongan: ${inspectItem.golongan} (${inspectItem.jenjang})`
            : undefined
        }
        icon={<FileText className="h-5 w-5 text-primary" />}
        footer={
          <Button variant="secondary" onClick={() => setInspectItem(null)}>
            Tutup
          </Button>
        }
      >
        {inspectItem && (
          <div className="space-y-4 text-xs">
            {/* Kartu Status Kelayakan */}
            <div className="flex items-center justify-between p-3.5 bg-gray-50 border border-gray-200 rounded-xl">
              <div>
                <span className="text-gray-400 uppercase font-bold text-[10px] block">
                  Status Keputusan Sistem:
                </span>
                <p className="font-extrabold text-gray-900 text-sm mt-0.5">
                  {inspectItem.kelayakan?.badge_label}
                </p>
                <p className="text-[11px] text-gray-500 mt-0.5">
                  {inspectItem.kelayakan?.catatan}
                </p>
              </div>
              {inspectItem.kelayakan?.status && (
                <StatusBadge status={inspectItem.kelayakan.status} size="md" />
              )}
            </div>

            {/* Kotak Komposisi Penjumlahan Angka Kredit */}
            <div className="space-y-2">
              <h4 className="font-extrabold text-gray-700 uppercase tracking-wider text-[11px]">
                {inspectItem.triwulan_mode
                  ? `1. Komposisi Parsial s/d TW${inspectItem.triwulan_ke}:`
                  : "1. Komposisi Perolehan Total Angka Kredit (AK):"}
              </h4>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                <div className="p-3 bg-gray-50 border border-gray-200 rounded-xl text-center">
                  <span className="text-[10px] uppercase font-bold text-gray-400 block">
                    AK Dasar
                  </span>
                  <span className="font-mono font-extrabold text-gray-800 text-sm mt-0.5 block">
                    {(inspectItem.ak_dasar ?? 0).toFixed(3)}
                  </span>
                </div>
                <div className="p-3 bg-gray-50 border border-gray-200 rounded-xl text-center">
                  <span className="text-[10px] uppercase font-bold text-gray-400 block">
                    Konversi Masa Kerja
                  </span>
                  <span className="font-mono font-extrabold text-gray-800 text-sm mt-0.5 block">
                    {(inspectItem.ak_pak_pelantikan ?? 0).toFixed(3)}
                  </span>
                  <span className="text-[9px] text-gray-400 block">
                    Masa kerja lama
                  </span>
                </div>
                <div className="p-3 bg-gray-50 border border-gray-200 rounded-xl text-center">
                  <span className="text-[10px] uppercase font-bold text-gray-400 block">
                    Saldo Historis
                  </span>
                  <span className="font-mono font-extrabold text-gray-800 text-sm mt-0.5 block">
                    {(inspectItem.ak_historis ?? 0).toFixed(3)}
                  </span>
                  <span className="text-[9px] text-gray-400 block">
                    Tabungan lampau
                  </span>
                </div>
                {inspectItem.triwulan_mode ? (
                  <>
                    <div className="p-3 bg-secondary/60 border border-primary/20 rounded-xl text-center">
                      <span className="text-[10px] uppercase font-bold text-primary block">
                        AK TW{inspectItem.triwulan_ke} ({inspectItem.pkp ?? "-"}
                        )
                      </span>
                      <span className="font-mono font-black text-primary text-sm mt-0.5 block">
                        {(inspectItem.ak_triwulan ?? 0).toFixed(3)}
                      </span>
                      <span className="text-[9px] text-primary/70 block">
                        {/* Formula A: (bulan/12) × %PKP × koefisien */}
                        {inspectItem.jumlah_bulan ?? 0} bulan aktif
                      </span>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="p-3 bg-blue-50/60 border border-blue-200 rounded-xl text-center">
                      <span className="text-[10px] uppercase font-bold text-blue-700 block">
                        Kinerja Tahunan
                      </span>
                      <span className="font-mono font-black text-blue-800 text-sm mt-0.5 block">
                        {(inspectItem.ak_baru_tahunan ?? 0).toFixed(3)}
                      </span>
                      <span className="text-[9px] text-blue-600 block">
                        Tahun berjalan
                      </span>
                    </div>
                    </>
                )}
                <div className={`p-3 bg-linear-to-br from-primary-dark to-primary text-white rounded-xl text-center shadow-xs col-span-2`}>
                  <span className="text-[10px] uppercase font-bold text-white/70 block">
                    {inspectItem.triwulan_mode
                      ? "Total AK"
                      : "Total AK Kumulatif"}
                  </span>
                  <span className="font-mono font-black text-white text-base mt-0.5 block">
                    {inspectItem.triwulan_mode
                      ? (inspectItem.ak_parsial ?? 0).toFixed(3)
                      : (inspectItem.ak_kumulatif ?? 0).toFixed(3)}
                  </span>
                  <span className="text-[9px] text-white/60 block">
                    {inspectItem.triwulan_mode
                      ? "Saldo + TW tercatat + TW baru"
                      : "Total Modal Sah"}
                  </span>
                </div>
              </div>
            </div>

            {/* Kotak Target Kebutuhan & Carry-Over */}
            <div className="p-3.5 bg-white border border-gray-200 rounded-xl space-y-2">
              <h4 className="font-extrabold text-gray-700 uppercase tracking-wider text-[11px]">
                2. Evaluasi Ambang Batas Kenaikan Pangkat / Jenjang:
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                <div
                  className={`p-2.5 rounded-lg border ${
                    inspectItem.kelayakan?.jenis_target !== "JENJANG"
                      ? "bg-blue-50/60 border-blue-200/80"
                      : "bg-gray-50 border-gray-200/80"
                  }`}
                >
                  <span
                    className={`font-bold block text-[11px] ${
                      inspectItem.kelayakan?.jenis_target !== "JENJANG"
                        ? "text-blue-600"
                        : "text-gray-500"
                    }`}
                  >
                    Kebutuhan Target Kenaikan Pangkat:
                  </span>
                  <span
                    className={`font-mono font-extrabold text-sm ${
                      inspectItem.kelayakan?.jenis_target !== "JENJANG"
                        ? "text-blue-800"
                        : "text-gray-900"
                    }`}
                  >
                    {(inspectItem.kelayakan?.target_kp ?? 0).toFixed(3)} AK
                  </span>
                  {inspectItem.kelayakan?.jenis_target !== "JENJANG" && (
                    <span
                      className={`text-[9px] block font-semibold ${
                        inspectItem.kelayakan?.status === "LAYAK_PANGKAT"
                          ? "text-emerald-600"
                          : "text-amber-600"
                      }`}
                    >
                      {inspectItem.kelayakan?.status === "LAYAK_PANGKAT"
                        ? "✓ Tercapai — kelebihan jadi carry-over"
                        : `Target aktif · kurang ${(
                            inspectItem.kelayakan?.kurang_ak ?? 0
                          ).toFixed(3)} AK`}
                    </span>
                  )}
                </div>
                <div
                  className={`p-2.5 rounded-lg border ${
                    inspectItem.kelayakan?.jenis_target === "JENJANG"
                      ? "bg-blue-50/60 border-blue-200/80"
                      : "bg-gray-50 border-gray-200/80"
                  }`}
                >
                  <span
                    className={`font-bold block text-[11px] ${
                      inspectItem.kelayakan?.jenis_target === "JENJANG"
                        ? "text-blue-600"
                        : "text-gray-500"
                    }`}
                  >
                    Kebutuhan Kenaikan Jenjang:
                  </span>
                  <span
                    className={`font-mono font-extrabold text-sm ${
                      inspectItem.kelayakan?.jenis_target === "JENJANG"
                        ? "text-blue-800"
                        : "text-gray-900"
                    }`}
                  >
                    {(inspectItem.kelayakan?.target_jenjang ?? 0).toFixed(3)} AK
                  </span>
                  {inspectItem.kelayakan?.jenis_target === "JENJANG" && (
                    <>
                      {inspectItem.kelayakan?.next_jenjang && (
                        <span className="text-[9px] text-blue-500 block font-semibold">
                          Target: {inspectItem.kelayakan.next_jenjang}
                        </span>
                      )}
                      <span
                        className={`text-[9px] block font-semibold ${
                          inspectItem.kelayakan?.status === "LAYAK_JENJANG"
                            ? "text-emerald-600"
                            : "text-amber-600"
                        }`}
                      >
                        {inspectItem.kelayakan?.status === "LAYAK_JENJANG"
                          ? "✓ Tercapai"
                          : `Target aktif · kurang ${(
                              inspectItem.kelayakan?.kurang_ak ?? 0
                            ).toFixed(3)} AK`}
                      </span>
                    </>
                  )}
                </div>
                <div className="p-2.5 bg-gray-50 rounded-lg border border-gray-200/80">
                  <span className="text-gray-500 font-bold block text-[11px]">
                    {inspectItem.triwulan_mode
                      ? "Sisa Proyeksi (Info, belum final):"
                      : "Deposit Carry-Over Tahun Depan:"}
                  </span>
                  <span className="font-mono font-extrabold text-emerald-700 text-sm">
                    +{(inspectItem.kelayakan?.carry_over ?? 0).toFixed(3)} AK
                  </span>
                </div>
              </div>
            </div>

            {/* Kotak Rincian Evaluasi Triwulanan */}
            <div className="space-y-2">
              <h4 className="font-extrabold text-gray-700 uppercase tracking-wider text-[11px]">
                {inspectItem.triwulan_mode
                  ? `3. Rincian TW${inspectItem.triwulan_ke}:`
                  : "3. Rincian Capaian Kinerja Triwulanan (TW1 – TW4):"}
              </h4>
              {inspectItem.triwulan_mode ? (
                <div className="space-y-2">
                  {(
                    Object.entries(
                      inspectItem.triwulan ?? {},
                    ) as [string, { predikat: string; jumlah_bulan: number; angka_kredit: number }][]
                  )
                    .sort(
                      ([a], [b]) => Number(a.slice(2)) - Number(b.slice(2)),
                    )
                    .map(([qKey, q]) => {
                      const qNum = Number(qKey.slice(2));
                      const isSaatIni = qNum === inspectItem.triwulan_ke;
                      return (
                        <div
                          key={qKey}
                          className={`flex items-center justify-between rounded-xl border px-3 py-2.5 text-xs ${
                            isSaatIni
                              ? "bg-secondary/40 border-primary/20"
                              : "bg-gray-50 border-gray-200"
                          }`}
                        >
                          <div className="min-w-0">
                            <span
                              className={`font-extrabold ${
                                isSaatIni ? "text-primary" : "text-gray-900"
                              }`}
                            >
                              TW{qNum}{" "}
                              {isSaatIni
                                ? "· new"
                                : ""}
                            </span>
                            <span className="ml-2 text-[11px] font-semibold text-gray-500">
                              {q?.predikat ?? "-"} · {q?.jumlah_bulan ?? 0}{" "}
                              bln
                            </span>
                          </div>
                          <span className="font-mono font-black text-gray-800">
                            {Number(q?.angka_kredit ?? 0).toFixed(3)} AK
                          </span>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                <div className="grid grid-cols-4 gap-2 text-center font-mono">
                  {(["tw1", "tw2", "tw3", "tw4"] as (keyof Triwulan)[]).map(
                    (qKey, idx) => {
                      const q = inspectItem.triwulan?.[qKey];
                      const qNum = idx + 1;
                      return (
                        <div
                          key={qKey}
                          className="p-2.5 bg-gray-50 border border-gray-200 rounded-lg"
                        >
                          <span className="font-sans text-[10px] font-bold text-gray-500 block">
                            TW{qNum}
                          </span>
                          <span className="font-extrabold text-gray-900 text-xs block mt-0.5">
                            {q?.predikat ?? "-"}
                          </span>
                          <span className="text-[10px] font-bold text-blue-700 block">
                            {Number(q?.angka_kredit ?? 0).toFixed(3)} AK
                          </span>
                          <span className="font-sans text-[9px] text-gray-400 block">
                            {q?.jumlah_bulan ?? 0} bln
                          </span>
                        </div>
                      );
                    },
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </Modal>

      {/* 6. Modal Konfirmasi Overwrite (Re-upload data yang sudah ada) */}
      <Modal
        open={confirmOverwrite}
        onClose={() => setConfirmOverwrite(false)}
        title="Yakin Menimpa Data yang Sudah Ada?"
        subtitle={
          isModeTahunan
            ? `Tahun ${tahun} sudah memiliki data konversi. Data lama akan diganti oleh file baru ini.`
            : `TW ${triwulan} tahun ${tahun} sudah memiliki data. Data lama akan diganti oleh file baru ini.`
        }
        icon={<AlertTriangle className="h-5 w-5 text-amber-600" />}
        footer={
          <>
            <Button
              variant="secondary"
              onClick={() => setConfirmOverwrite(false)}
              disabled={loadingProcess}
            >
              Batal
            </Button>
            <Button
              variant="primary"
              onClick={handleConfirmOverwrite}
              loading={loadingProcess}
            >
              Ya, Timpa Data
            </Button>
          </>
        }
      >
        <div className="space-y-3 text-xs">
          <div className="flex items-start gap-3 p-3.5 bg-amber-50 border border-amber-200 rounded-xl">
            <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
            <p className="text-amber-800 font-semibold leading-relaxed">
              {jumlahOverwrite} baris memiliki data lama yang nilainya{" "}
              <strong>berbeda</strong> dari file baru ini. Setelah dikonfirmasi,
              nilai lama akan diganti dengan nilai baru (proses tidak bisa
              dibatalkan secara otomatis).
            </p>
          </div>

          {listOverwrite.length > 0 && (
            <>
              <h4 className="font-extrabold text-gray-700 uppercase tracking-wider text-[11px]">
                Baris yang Akan Ditimpa:
              </h4>
              <div className="max-h-48 overflow-y-auto space-y-1.5">
                {listOverwrite.slice(0, 10).map((item) => (
                  <div
                    key={item.baris}
                    className="flex items-center justify-between gap-2 p-2.5 bg-gray-50 border border-gray-200 rounded-lg"
                  >
                    <div className="min-w-0">
                      <p className="font-extrabold text-gray-900 leading-tight truncate">
                        {item.nama_lengkap}
                      </p>
                      <p className="font-mono text-[10px] font-bold text-gray-500 tracking-tight">
                        {item.nip}
                      </p>
                    </div>
                    <span className="text-[10px] font-bold text-gray-500 shrink-0 ml-2">
                      #{item.baris} · TW{item.triwulan_ke}
                    </span>
                  </div>
                ))}
              </div>
              {listOverwrite.length > 10 && (
                <p className="text-[11px] font-semibold text-gray-500">
                  ... dan {listOverwrite.length - 10} baris lainnya.
                </p>
              )}
            </>
          )}
        </div>
      </Modal>
    </div>
  );
};
