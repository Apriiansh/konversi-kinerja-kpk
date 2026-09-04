import React, { useState, useRef, useMemo } from 'react'
import {
  UploadCloud,
  FileSpreadsheet,
  Award,
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
} from 'lucide-react'
import {
  downloadImportTemplate,
  previewImportFile,
  processImportFile,
  type ImportPreviewResponse,
  type PreviewPegawaiItem,
} from '../../api/import'
import {
  Button,
  Card,
  CardHeader,
  Alert,
  FilterPills,
  SearchInput,
  StatusBadge,
  StatCard,
} from '../../components/ui'
import type { FilterStatus } from '../../types'

export const ImportKonversi: React.FC = () => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [isDragging, setIsDragging] = useState<boolean>(false)
  const [loadingPreview, setLoadingPreview] = useState<boolean>(false)
  const [loadingProcess, setLoadingProcess] = useState<boolean>(false)
  const [previewResult, setPreviewResult] = useState<ImportPreviewResponse | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const [buatAkun, setBuatAkun] = useState<boolean>(true)

  const [searchQuery, setSearchQuery] = useState<string>('')
  const [filterStatus, setFilterStatus] = useState<FilterStatus>('ALL')

  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileProcess = async (file: File) => {
    setSelectedFile(file)
    setErrorMessage(null)
    setSuccessMessage(null)
    setLoadingPreview(true)

    try {
      const result = await previewImportFile(file, buatAkun)
      setPreviewResult(result)
    } catch (err: any) {
      setErrorMessage(
        err.response?.data?.message || 'Gagal memproses file. Pastikan format spreadsheet valid sesuai template.'
      )
      setPreviewResult(null)
    } finally {
      setLoadingPreview(false)
    }
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) handleFileProcess(file)
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    const file = e.dataTransfer.files?.[0]
    if (file) handleFileProcess(file)
  }

  const handleDownloadTemplate = async () => {
    try {
      await downloadImportTemplate()
    } catch {
      setErrorMessage('Gagal mengunduh template spreadsheet.')
    }
  }

  const handleProcessImport = async () => {
    if (!selectedFile) return

    setLoadingProcess(true)
    setErrorMessage(null)

    try {
      const res = await processImportFile(selectedFile, buatAkun)
      setSuccessMessage(
        res.message || `Berhasil mengimpor dan mengonversi ${res.total_diproses} data pegawai ke dalam sistem.`
      )
      setSelectedFile(null)
      setPreviewResult(null)
      if (fileInputRef.current) fileInputRef.current.value = ''
    } catch (err: any) {
      setErrorMessage(
        err.response?.data?.message || 'Terjadi kesalahan saat menyimpan data import ke database.'
      )
    } finally {
      setLoadingProcess(false)
    }
  }

  const handleReset = () => {
    setSelectedFile(null)
    setPreviewResult(null)
    setErrorMessage(null)
    setSuccessMessage(null)
    setSearchQuery('')
    setFilterStatus('ALL')
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const filteredData = useMemo(() => {
    if (!previewResult) return []

    return previewResult.data.filter((item: PreviewPegawaiItem) => {
      const q = searchQuery.toLowerCase().trim()
      const matchSearch =
        !q ||
        (item.nama_lengkap && item.nama_lengkap.toLowerCase().includes(q)) ||
        (item.nip && item.nip.includes(q)) ||
        (item.golongan && item.golongan.toLowerCase().includes(q))

      if (!matchSearch) return false

      if (filterStatus === 'ALL') return true
      if (filterStatus === 'ERROR') return !item.is_valid
      return item.kelayakan?.status === filterStatus
    })
  }, [previewResult, searchQuery, filterStatus])

  const filterOptions = useMemo(() => {
    if (!previewResult) return []
    const opts = [
      { value: 'ALL' as FilterStatus, label: 'Semua', count: previewResult.data.length, color: 'gray' },
      { value: 'LAYAK_PANGKAT' as FilterStatus, label: 'Layak Pangkat', count: previewResult.ringkasan_badge.layak_pangkat, color: 'emerald' },
      { value: 'LAYAK_JENJANG' as FilterStatus, label: 'Layak Jenjang', count: previewResult.ringkasan_badge.layak_jenjang, color: 'blue' },
      { value: 'BELUM_CUKUP' as FilterStatus, label: 'Belum Cukup', count: previewResult.ringkasan_badge.belum_cukup, color: 'amber' },
    ]
    if (previewResult.total_error > 0) {
      opts.push({ value: 'ERROR' as FilterStatus, label: 'Error', count: previewResult.total_error, color: 'red' })
    }
    return opts
  }, [previewResult])

  return (
    <div className="space-y-6">
      {/* 1. Header Banner */}
      <CardHeader
        tag="Konversi Kinerja"
        regulation="PerBKN No. 3/2023"
        title="Import & Auto-Konversi Kinerja Massal"
        subtitle="Unggah berkas spreadsheet (.xlsx / .csv) untuk mengonversi Angka Kredit (AK) pegawai KPK, dan menentukan badge kelayakan secara instan."
        actions={
          <Button variant="secondary" icon={<Download className="h-4 w-4 text-gray-500" />} onClick={handleDownloadTemplate}>
            Unduh Template XLSX
          </Button>
        }
      />

      {/* 2. Alert Feedback */}
      {errorMessage && (
        <Alert variant="error" title="Terjadi Kesalahan:" message={errorMessage} onDismiss={() => setErrorMessage(null)} />
      )}
      {successMessage && (
        <Alert variant="success" title="Proses Berhasil!" message={successMessage} onDismiss={() => setSuccessMessage(null)} />
      )}

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
              ? 'border-[#ba191d] bg-red-50/50 scale-[0.99]'
              : 'border-gray-200 hover:border-[#ba191d]/50 hover:bg-red-50/20'
          }`}
        >
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-red-50 text-[#ba191d] mb-3.5 border border-red-100 shadow-xs">
            {loadingPreview ? (
              <RefreshCw className="h-6 w-6 animate-spin" />
            ) : (
              <UploadCloud className="h-6 w-6" />
            )}
          </div>

          <div className="space-y-1">
            <p className="text-sm font-extrabold text-gray-900">
              {selectedFile ? (
                <span className="text-[#ba191d]">{selectedFile.name}</span>
              ) : (
                'Klik untuk memilih berkas atau seret file ke sini'
              )}
            </p>
            <p className="text-xs font-medium text-gray-400">
              Mendukung format Microsoft Excel (.xlsx, .xls) dan CSV (.csv) · Maksimal 10 MB
            </p>
          </div>

          <div className="mt-4 flex flex-wrap items-center justify-center gap-2 text-[11px] font-bold text-gray-500">
            <span className="inline-flex items-center gap-1 rounded-md bg-gray-100 px-2.5 py-1 text-gray-700">
              <FileSpreadsheet className="h-3 w-3 text-emerald-600" /> Auto-Sync NIP
            </span>
            <span className="inline-flex items-center gap-1 rounded-md bg-gray-100 px-2.5 py-1 text-gray-700">
              <ShieldCheck className="h-3 w-3 text-[#ba191d]" /> Formula B (TW4 Anchor)
            </span>
            <span className="inline-flex items-center gap-1 rounded-md bg-gray-100 px-2.5 py-1 text-gray-700">
              <Award className="h-3 w-3 text-blue-600" /> Evaluasi Badge Otomatis
            </span>
          </div>
        </label>

        {loadingPreview && (
          <div className="mt-4 flex items-center justify-center gap-2.5 rounded-xl bg-blue-50 border border-blue-200 p-3.5 text-xs font-bold text-blue-800">
            <RefreshCw className="h-4 w-4 animate-spin text-blue-600" />
            <span>Sedang memverifikasi data dan mengeksekusi simulasi kalkulasi di memori...</span>
          </div>
        )}

        {/* Opsi Buat Akun */}
        <div className="mt-4 flex items-center gap-3 rounded-xl border border-gray-200 bg-gray-50/60 px-4 py-3">
          <input
            id="buat-akun-toggle"
            type="checkbox"
            checked={buatAkun}
            onChange={(e) => setBuatAkun(e.target.checked)}
            className="h-4 w-4 rounded border-gray-300 text-[#ba191d] focus:ring-[#ba191d] cursor-pointer"
          />
          <label htmlFor="buat-akun-toggle" className="cursor-pointer select-none">
            <span className="text-xs font-extrabold text-gray-900">Buat akun login otomatis</span>
            <span className="ml-2 text-[11px] font-medium text-gray-500">
              Email dari nama pegawai (tanpa gelar) · Password = NIP + 5 huruf depan nama
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

          {/* Decision Bar */}
          <Card className="p-4 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-red-50 text-[#ba191d] shrink-0 border border-red-100">
                <FileText className="h-4 w-4" />
              </div>
              <div>
                <p className="text-xs font-extrabold text-gray-900">
                  Pratinjau Hasil Konversi Siap Diterapkan
                </p>
                <p className="text-[11px] font-medium text-gray-500">
                  Pastikan hasil perhitungan instan di bawah telah sesuai sebelum disimpan permanen.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Button variant="ghost" onClick={handleReset} disabled={loadingProcess}>
                Batal / Ganti File
              </Button>
              <Button
                variant="primary"
                onClick={handleProcessImport}
                loading={loadingProcess}
                disabled={previewResult.total_valid === 0}
                icon={!loadingProcess ? <Check className="h-3.5 w-3.5" /> : undefined}
              >
                {loadingProcess ? 'Menyimpan ke Database...' : 'Terapkan & Simpan ke Database'}
              </Button>
            </div>
          </Card>

          {/* Filter Bar */}
          <Card className="p-3.5 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            <FilterPills options={filterOptions} active={filterStatus} onChange={setFilterStatus} />
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
                  Rincian Kalkulasi Per Pegawai
                </h2>
                <p className="text-[11px] font-medium text-gray-400">
                  Menampilkan {filteredData.length} dari total {previewResult.data.length} baris data
                </p>
              </div>
              <div className="flex items-center gap-1.5 text-[11px] font-bold text-gray-500">
                <Info className="h-3.5 w-3.5 text-[#ba191d]" />
                <span>AK Baru dihitung retrospektif via predikat TW4</span>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-gray-50/80 border-b border-gray-200/80 text-gray-500 font-extrabold text-[11px] uppercase tracking-wider">
                    <th className="py-3 px-3.5">Baris</th>
                    <th className="py-3 px-3.5">Pegawai (NIP & Nama)</th>
                    <th className="py-3 px-3.5">Pangkat / Golongan</th>
                    <th className="py-3 px-3.5">PAK Pelantikan</th>
                    <th className="py-3 px-3.5">Saldo Historis</th>
                    <th className="py-3 px-3.5">Kinerja TW1–TW4</th>
                    <th className="py-3 px-3.5">AK Baru (Tahunan)</th>
                    <th className="py-3 px-3.5">Booster (+25%)</th>
                    <th className="py-3 px-3.5 font-black text-gray-900">Total AK Akhir</th>
                    <th className="py-3 px-3.5 text-center">Status Kelayakan</th>
                    <th className="py-3 px-3.5">Tindak Lanjut / Sisa</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 bg-white">
                  {filteredData.length === 0 ? (
                    <tr>
                      <td colSpan={11} className="py-12 text-center text-gray-400 text-xs">
                        <FileSpreadsheet className="h-8 w-8 mx-auto text-gray-300 mb-2" />
                        <p className="font-bold text-gray-500">Tidak ada baris data yang sesuai dengan filter.</p>
                        <p className="text-[11px] mt-0.5">Coba sesuaikan kata kunci pencarian atau ganti filter status.</p>
                      </td>
                    </tr>
                  ) : (
                    filteredData.map((item) => (
                      <tr
                        key={item.baris}
                        className={`transition-colors ${
                          item.is_valid ? 'hover:bg-gray-50/80' : 'bg-red-50/60'
                        }`}
                      >
                        <td className="py-3 px-3.5 font-mono font-bold text-gray-400">
                          #{item.baris}
                        </td>
                        <td className="py-3 px-3.5">
                          {item.is_valid ? (
                            <div>
                              <p className="font-extrabold text-gray-900 text-xs">{item.nama_lengkap}</p>
                              <p className="font-mono text-[11px] font-bold text-gray-500 tracking-tight">
                                {item.nip}
                              </p>
                            </div>
                          ) : (
                            <div>
                              <span className="inline-flex items-center gap-1 text-[11px] font-extrabold text-red-700">
                                <XCircle className="h-3.5 w-3.5" /> Baris Tidak Valid
                              </span>
                              <p className="text-[10px] text-red-600 font-medium">
                                {item.errors?.join(', ')}
                              </p>
                            </div>
                          )}
                        </td>
                        <td className="py-3 px-3.5">
                          <span className="font-mono font-extrabold text-gray-900 text-xs">
                            {item.golongan ?? '-'}
                          </span>
                          <p className="text-[11px] font-medium text-gray-500">{item.jenjang ?? '-'}</p>
                        </td>
                        <td className="py-3 px-3.5">
                          {item.penyesuaian_khusus && (
                            <span
                              title={item.penyesuaian_khusus}
                              className="inline-flex items-center gap-1 rounded bg-purple-50 border border-purple-200 px-1.5 py-0.5 text-[10px] font-bold text-purple-700 mb-1"
                            >
                              <ShieldCheck className="h-3 w-3" /> 100 AK Penyesuaian Perpindahan
                            </span>
                          )}
                          <div className="font-mono font-bold text-gray-700">
                            {item.ak_pak_pelantikan ? `${item.ak_pak_pelantikan.toFixed(2)} AK` : '-'}
                          </div>
                        </td>
                        <td className="py-3 px-3.5 font-mono font-bold text-gray-700">
                          {item.ak_historis ? `${item.ak_historis.toFixed(2)} AK` : '-'}
                        </td>
                        <td className="py-3 px-3.5">
                          <div className="flex items-center gap-1">
                            {['tw1', 'tw2', 'tw3', 'tw4'].map((qKey, idx) => {
                              const q = (item.triwulan as any)?.[qKey]
                              const qNum = idx + 1
                              const isAnchor = qNum === 4
                              return (
                                <span
                                  key={qKey}
                                  title={`TW${qNum}: ${q?.predikat ?? '-'} (${q?.jumlah_bulan ?? 0} bln = ${q?.angka_kredit ?? 0} AK)`}
                                  className={`px-1.5 py-0.5 rounded text-[10px] font-bold border ${
                                    isAnchor
                                      ? 'bg-red-50 text-[#ba191d] border-red-200 font-black'
                                      : 'bg-gray-100 text-gray-600 border-gray-200'
                                  }`}
                                >
                                  TW{qNum}: {q?.angka_kredit ?? 0}
                                </span>
                              )
                            })}
                          </div>
                        </td>
                        <td className="py-3 px-3.5">
                          <span className="font-mono font-extrabold text-blue-700 text-xs">
                            {item.ak_baru_tahunan ? `${item.ak_baru_tahunan.toFixed(2)} AK` : '0.00 AK'}
                          </span>
                          <p className="text-[10px] font-medium text-gray-400">
                            TW4: {item.predikat_tw4} ({item.total_bulan_aktif} bln)
                          </p>
                        </td>
                        <td className="py-3 px-3.5">
                          {item.ak_booster && item.ak_booster > 0 ? (
                            <span className="font-mono font-extrabold text-emerald-700 text-xs">
                              +{item.ak_booster.toFixed(2)} AK
                            </span>
                          ) : (
                            <span className="text-gray-300 font-mono">-</span>
                          )}
                        </td>
                        <td className="py-3 px-3.5 font-mono font-black text-gray-900 text-sm">
                          {item.ak_kumulatif ? `${item.ak_kumulatif.toFixed(2)} AK` : '0.00 AK'}
                        </td>
                        <td className="py-3 px-3.5 text-center">
                          {item.kelayakan?.status && <StatusBadge status={item.kelayakan.status} />}
                        </td>
                        <td className="py-3 px-3.5 text-xs">
                          {item.kelayakan?.status === 'LAYAK_PANGKAT' && (
                            <div className="space-y-0.5">
                              <p className="font-extrabold text-emerald-800">
                                Naik Pangkat dari {item.golongan}
                              </p>
                              <p className="font-mono font-bold text-emerald-700">
                                Carry-Over: +{item.kelayakan.carry_over.toFixed(2)} AK
                              </p>
                            </div>
                          )}
                          {item.kelayakan?.status === 'LAYAK_JENJANG' && (
                            <div className="space-y-0.5">
                              <p className="font-extrabold text-blue-800">
                                Naik Jenjang ke {item.kelayakan.next_jenjang || 'jenjang berikutnya'}
                              </p>
                              <p className="font-mono font-bold text-blue-600">
                                Reset: 0 AK (Sisa hangus)
                              </p>
                            </div>
                          )}
                          {item.kelayakan?.status === 'BELUM_CUKUP' && (
                            <div className="space-y-0.5">
                              <p className="font-extrabold text-amber-800">
                                Perlu {item.kelayakan.kurang_ak.toFixed(2)} AK lagi
                              </p>
                              <p className="text-[10px] font-medium text-gray-400">
                                untuk Naik Pangkat
                              </p>
                            </div>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      )}
    </div>
  )
}
