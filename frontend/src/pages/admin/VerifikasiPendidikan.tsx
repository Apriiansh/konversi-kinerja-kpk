import React, { useState, useEffect, useMemo } from 'react'
import {
  GraduationCap,
  CheckCircle2,
  XCircle,
  Clock,
  FileText,
  ExternalLink,
  ShieldCheck,
  Check,
  X,
  RefreshCw,
  Award,
} from 'lucide-react'
import {
  getPengajuanList,
  verifikasiPengajuan,
  getStorageFileUrl,
} from '../../api/pengajuan'
import {
  Button,
  Card,
  CardHeader,
  Alert,
  SearchInput,
  Modal,
  Badge,
  StatCard,
} from '../../components/ui'
import type {
  PengajuanPendidikanItem,
  FilterStatusPengajuan,
} from '../../types'

export const VerifikasiPendidikan: React.FC = () => {
  const [items, setItems] = useState<PengajuanPendidikanItem[]>([])
  const [loading, setLoading] = useState<boolean>(true)
  const [searchQuery, setSearchQuery] = useState<string>('')
  const [filterStatus, setFilterStatus] = useState<FilterStatusPengajuan>('ALL')
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)

  // State Modal Verifikasi
  const [selectedItem, setSelectedItem] = useState<PengajuanPendidikanItem | null>(null)
  const [catatan, setCatatan] = useState<string>('')
  const [submitting, setSubmitting] = useState<boolean>(false)

  // Fetch daftar pengajuan
  const fetchData = async () => {
    setLoading(true)
    setErrorMessage(null)
    try {
      const res = await getPengajuanList({ per_page: 50 })
      setItems(res.data)
    } catch (err: any) {
      setErrorMessage(err.response?.data?.message || 'Gagal memuat daftar pengajuan ijazah.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [])

  // Buka modal periksa
  const handleOpenModal = (item: PengajuanPendidikanItem) => {
    setSelectedItem(item)
    setCatatan(item.catatan_verifikasi || '')
    setErrorMessage(null)
  }

  // Eksekusi Verifikasi (Approve / Reject)
  const handleVerifikasi = async (isValid: boolean) => {
    if (!selectedItem) return

    if (!isValid && !catatan.trim()) {
      setErrorMessage('Harap isi alasan / catatan jika menolak berkas pengajuan.')
      return
    }

    setSubmitting(true)
    setErrorMessage(null)

    try {
      const res = await verifikasiPengajuan(selectedItem.id, isValid, catatan)
      setSuccessMessage(res.message || 'Verifikasi berhasil disimpan.')
      setSelectedItem(null)
      fetchData()
    } catch (err: any) {
      setErrorMessage(err.response?.data?.message || 'Gagal mengeksekusi verifikasi berkas.')
    } finally {
      setSubmitting(false)
    }
  }

  // Statistik Ringkasan
  const stats = useMemo(() => {
    return {
      total: items.length,
      diajukan: items.filter((i) => i.status === 'DIAJUKAN').length,
      disetujui: items.filter((i) => i.status === 'DISETUJUI').length,
      ditolak: items.filter((i) => i.status.startsWith('DITOLAK')).length,
    }
  }, [items])

  // Filter & Search
  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      const q = searchQuery.toLowerCase().trim()
      const nama = item.pegawai?.nama_lengkap?.toLowerCase() || ''
      const nip = item.pegawai?.nip || ''
      const kampus = item.nama_institusi?.toLowerCase() || ''
      const jurusan = item.jurusan?.toLowerCase() || ''

      const matchSearch = !q || nama.includes(q) || nip.includes(q) || kampus.includes(q) || jurusan.includes(q)
      if (!matchSearch) return false

      if (filterStatus === 'ALL') return true
      if (filterStatus === 'DIAJUKAN') return item.status === 'DIAJUKAN'
      if (filterStatus === 'DISETUJUI') return item.status === 'DISETUJUI'
      if (filterStatus.startsWith('DITOLAK')) return item.status.startsWith('DITOLAK')

      return true
    })
  }, [items, searchQuery, filterStatus])

  return (
    <div className="space-y-6">
      {/* 1. Header Banner */}
      <CardHeader
        tag="Verifikator SDM"
        tagColor="#ba191d"
        regulation="Booster Ijazah +25% AK"
        title="Verifikasi Pengajuan Peningkatan Pendidikan"
        subtitle="Periksa keabsahan fisik berkas Ijazah dan SK Pencantuman Gelar BKN. Persetujuan berkas akan otomatis menyuntikkan bonus +25% Angka Kredit dan meng-upgrade jenjang pendidikan pegawai."
        actions={
          <Button
            variant="secondary"
            icon={<RefreshCw className="h-4 w-4" />}
            onClick={fetchData}
            loading={loading}
          >
            Segarkan Data
          </Button>
        }
      />

      {/* Alert Error / Sukses */}
      {errorMessage && (
        <Alert
          variant="error"
          title="Terjadi Kendala:"
          message={errorMessage}
          onDismiss={() => setErrorMessage(null)}
        />
      )}

      {successMessage && (
        <Alert
          variant="success"
          title="Berhasil!"
          message={successMessage}
          onDismiss={() => setSuccessMessage(null)}
        />
      )}

      {/* 2. Stat Cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:gap-4">
        <StatCard
          label="Total Pengajuan"
          value={stats.total}
          icon={<FileText className="h-4 w-4 text-gray-400" />}
          color="default"
        />
        <StatCard
          label="Menunggu Verifikasi"
          value={stats.diajukan}
          icon={<Clock className="h-4 w-4 text-amber-600" />}
          color="amber"
        />
        <StatCard
          label="Disetujui (+25% AK)"
          value={stats.disetujui}
          icon={<CheckCircle2 className="h-4 w-4 text-emerald-600" />}
          color="emerald"
        />
        <StatCard
          label="Berkas Ditolak"
          value={stats.ditolak}
          icon={<XCircle className="h-4 w-4 text-gray-400" />}
          color="default"
        />
      </div>

      {/* 3. Filter Bar & Search */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white p-3.5 rounded-xl border border-gray-200/80 shadow-xs">
        <div className="flex flex-wrap items-center gap-1.5">
          <button
            type="button"
            onClick={() => setFilterStatus('ALL')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
              filterStatus === 'ALL' ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            Semua ({items.length})
          </button>
          <button
            type="button"
            onClick={() => setFilterStatus('DIAJUKAN')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
              filterStatus === 'DIAJUKAN'
                ? 'bg-amber-700 text-white'
                : 'bg-amber-50 text-amber-800 hover:bg-amber-100 border border-amber-200'
            }`}
          >
            Menunggu ({stats.diajukan})
          </button>
          <button
            type="button"
            onClick={() => setFilterStatus('DISETUJUI')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
              filterStatus === 'DISETUJUI'
                ? 'bg-emerald-700 text-white'
                : 'bg-emerald-50 text-emerald-800 hover:bg-emerald-100 border border-emerald-200'
            }`}
          >
            Disetujui ({stats.disetujui})
          </button>
          <button
            type="button"
            onClick={() => setFilterStatus('DITOLAK_ADMIN')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
              filterStatus.startsWith('DITOLAK')
                ? 'bg-red-700 text-white'
                : 'bg-red-50 text-red-800 hover:bg-red-100 border border-red-200'
            }`}
          >
            Ditolak ({stats.ditolak})
          </button>
        </div>

        <SearchInput
          placeholder="Cari NIP, nama, prodi, kampus..."
          value={searchQuery}
          onChange={setSearchQuery}
        />
      </div>

      {/* 4. Tabel Antrean Pengajuan */}
      <Card>
        <div className="p-4 border-b border-gray-100 flex items-center justify-between">
          <h2 className="text-xs font-extrabold uppercase tracking-wider text-gray-500">
            Daftar Berkas Pengajuan Ijazah ({filteredItems.length} berkas)
          </h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="bg-gray-50/80 border-b border-gray-200/80 text-gray-500 font-extrabold text-[11px] uppercase tracking-wider">
                <th className="py-3 px-3.5">Pegawai</th>
                <th className="py-3 px-3.5">Peningkatan Jenjang</th>
                <th className="py-3 px-3.5">Institusi & Jurusan</th>
                <th className="py-3 px-3.5">Tahun Lulus</th>
                <th className="py-3 px-3.5 text-center">Status</th>
                <th className="py-3 px-3.5 text-center">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 bg-white">
              {loading ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-gray-400">
                    <RefreshCw className="h-6 w-6 mx-auto animate-spin text-[#ba191d] mb-2" />
                    <p className="font-bold text-gray-600">Memuat berkas pengajuan...</p>
                  </td>
                </tr>
              ) : filteredItems.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-gray-400">
                    <GraduationCap className="h-8 w-8 mx-auto text-gray-300 mb-2" />
                    <p className="font-bold text-gray-500">Tidak ada pengajuan berkas yang ditemukan.</p>
                  </td>
                </tr>
              ) : (
                filteredItems.map((item) => (
                  <tr key={item.id} className="hover:bg-gray-50/80 transition-colors">
                    {/* Pegawai */}
                    <td className="py-3 px-3.5">
                      <p className="font-extrabold text-gray-900 text-xs">
                        {item.pegawai?.nama_lengkap ?? '-'}
                      </p>
                      <p className="font-mono text-[11px] font-bold text-gray-500 tracking-tight">
                        {item.pegawai?.nip ?? '-'}
                      </p>
                      <p className="text-[10px] text-gray-400 mt-0.5">
                        {item.pegawai?.pangkat_golongan?.golongan} · {item.pegawai?.pangkat_golongan?.jenjang_jabatan?.nama}
                      </p>
                    </td>

                    {/* Jenjang */}
                    <td className="py-3 px-3.5">
                      <div className="flex items-center gap-1.5 font-bold">
                        <span className="text-gray-500 text-[11px]">
                          {item.pegawai?.pendidikan_terakhir || 'Lama'}
                        </span>
                        <span className="text-gray-400">→</span>
                        <span className="text-[#ba191d] font-black text-xs bg-red-50 px-2 py-0.5 rounded border border-red-200">
                          {item.jenjang_pendidikan}
                        </span>
                      </div>
                    </td>

                    {/* Institusi */}
                    <td className="py-3 px-3.5">
                      <p className="font-bold text-gray-800">{item.nama_institusi}</p>
                      <p className="text-[11px] text-gray-500">{item.jurusan}</p>
                    </td>

                    {/* Tahun Lulus */}
                    <td className="py-3 px-3.5 font-mono font-bold text-gray-700">
                      {item.tahun_lulus}
                    </td>

                    {/* Status Badge */}
                    <td className="py-3 px-3.5 text-center">
                      {item.status === 'DIAJUKAN' && (
                        <Badge variant="warning" icon={<Clock className="h-3 w-3" />}>
                          MENUNGGU VERIFIKASI
                        </Badge>
                      )}
                      {item.status === 'DISETUJUI' && (
                        <Badge variant="success" icon={<CheckCircle2 className="h-3 w-3" />}>
                          DISETUJUI (+25% AK)
                        </Badge>
                      )}
                      {item.status.startsWith('DITOLAK') && (
                        <Badge variant="danger" icon={<XCircle className="h-3 w-3" />}>
                          {item.status === 'DITOLAK_ADMIN' ? 'BERKAS DITOLAK' : 'SYARAT TIDAK LOLOS'}
                        </Badge>
                      )}
                    </td>

                    {/* Tombol Aksi */}
                    <td className="py-3 px-3.5 text-center">
                      <Button
                        size="sm"
                        variant={item.status === 'DIAJUKAN' ? 'primary' : 'secondary'}
                        onClick={() => handleOpenModal(item)}
                      >
                        {item.status === 'DIAJUKAN' ? 'Periksa Dokumen' : 'Detail'}
                      </Button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* 5. Modal Periksa Berkas & Keputusan Verifikasi */}
      {selectedItem && (
        <Modal
          open={!!selectedItem}
          onClose={() => setSelectedItem(null)}
          title="Verifikasi Dokumen Peningkatan Pendidikan"
          subtitle={`${selectedItem.pegawai?.nama_lengkap} (NIP: ${selectedItem.pegawai?.nip})`}
          icon={<GraduationCap className="h-5 w-5" />}
          maxWidth="max-w-2xl"
          footer={
            <div className="flex items-center justify-between w-full">
              <div className="text-[11px] text-gray-500 flex items-center gap-1.5">
                <ShieldCheck className="h-4 w-4 text-emerald-600" />
                <span>
                  Status: <strong>{selectedItem.status}</strong>
                </span>
              </div>

              <div className="flex items-center gap-2">
                <Button variant="secondary" onClick={() => setSelectedItem(null)}>
                  Tutup
                </Button>

                {selectedItem.status === 'DIAJUKAN' && (
                  <>
                    <Button
                      variant="danger"
                      onClick={() => handleVerifikasi(false)}
                      loading={submitting}
                      icon={<X className="h-3.5 w-3.5" />}
                    >
                      Tolak Berkas
                    </Button>
                    <Button
                      variant="primary"
                      onClick={() => handleVerifikasi(true)}
                      loading={submitting}
                      icon={<Check className="h-3.5 w-3.5" />}
                    >
                      Setujui & Tambah +25% AK
                    </Button>
                  </>
                )}
              </div>
            </div>
          }
        >
          <div className="space-y-5">
            {/* Box Info Pendidikan Diajukan */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 bg-[#fafbfc] border border-gray-200/80 rounded-xl p-3.5 text-xs">
              <div>
                <span className="text-gray-400 font-medium block text-[10px] uppercase">
                  Jenjang Diajukan
                </span>
                <span className="font-extrabold text-[#ba191d] text-sm">
                  {selectedItem.jenjang_pendidikan}
                </span>
              </div>
              <div>
                <span className="text-gray-400 font-medium block text-[10px] uppercase">
                  Program Studi
                </span>
                <span className="font-bold text-gray-800">{selectedItem.jurusan}</span>
              </div>
              <div>
                <span className="text-gray-400 font-medium block text-[10px] uppercase">
                  Tahun Lulus
                </span>
                <span className="font-mono font-bold text-gray-800">{selectedItem.tahun_lulus}</span>
              </div>
              <div className="col-span-2 sm:col-span-3">
                <span className="text-gray-400 font-medium block text-[10px] uppercase">
                  Perguruan Tinggi / Institusi
                </span>
                <span className="font-bold text-gray-900">{selectedItem.nama_institusi}</span>
              </div>
            </div>

            {/* Box Cek Dokumen Fisik */}
            <div className="space-y-2">
              <span className="text-xs font-extrabold text-gray-700 block">
                Dokumen Berkas Terlampir:
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* File Ijazah */}
                <a
                  href={getStorageFileUrl(selectedItem.file_ijazah)}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center justify-between p-3 rounded-xl border border-gray-200 bg-white hover:border-[#ba191d] hover:bg-red-50/20 transition-all text-xs"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <FileText className="h-4 w-4 text-[#ba191d] shrink-0" />
                    <div className="truncate">
                      <p className="font-bold text-gray-900">Scan Ijazah / SKL</p>
                      <p className="text-[10px] text-gray-400 truncate">Klik untuk membuka file</p>
                    </div>
                  </div>
                  <ExternalLink className="h-3.5 w-3.5 text-gray-400 shrink-0 ml-2" />
                </a>

                {/* File Bukti BKN */}
                <a
                  href={getStorageFileUrl(selectedItem.file_bukti_bkn)}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center justify-between p-3 rounded-xl border border-gray-200 bg-white hover:border-[#ba191d] hover:bg-red-50/20 transition-all text-xs"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <ShieldCheck className="h-4 w-4 text-blue-600 shrink-0" />
                    <div className="truncate">
                      <p className="font-bold text-gray-900">Surat Pengesahan BKN</p>
                      <p className="text-[10px] text-gray-400 truncate">Pencantuman Gelar BKN</p>
                    </div>
                  </div>
                  <ExternalLink className="h-3.5 w-3.5 text-gray-400 shrink-0 ml-2" />
                </a>
              </div>
            </div>

            {/* Box Dampak Booster Ijazah */}
            <div className="rounded-xl border border-emerald-200 bg-emerald-50/40 p-3.5 space-y-1">
              <div className="flex items-center gap-2 text-emerald-800 font-extrabold text-xs">
                <Award className="h-4 w-4 text-emerald-600" />
                <span>Dampak Persetujuan (Formula Booster +25%):</span>
              </div>
              <p className="text-xs text-emerald-700 leading-relaxed">
                Jika disetujui, pegawai akan mendapat bonus{' '}
                <strong>+25% dari Kebutuhan AK Kenaikan Pangkat</strong> jenjang saat ini, dan
                pendidikan terakhir otomatis ter-update ke{' '}
                <strong>{selectedItem.jenjang_pendidikan}</strong>.
              </p>
            </div>

            {/* Input Catatan Verifikator */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-gray-700 block">
                Catatan Verifikasi{' '}
                {selectedItem.status === 'DIAJUKAN' && (
                  <span className="text-gray-400 font-normal">(Wajib jika menolak)</span>
                )}
              </label>
              {selectedItem.status === 'DIAJUKAN' ? (
                <textarea
                  rows={3}
                  value={catatan}
                  onChange={(e) => setCatatan(e.target.value)}
                  placeholder="Contoh: Dokumen asli terverifikasi valid, atau tuliskan alasan penolakan berkas..."
                  className="w-full px-3 py-2 text-xs bg-gray-50 border border-gray-200 rounded-xl text-gray-800 placeholder-gray-400 focus:bg-white focus:outline-none focus:border-[#ba191d] focus:ring-1 focus:ring-[#ba191d]"
                />
              ) : (
                <div className="p-3 bg-gray-50 rounded-xl border border-gray-200 text-xs text-gray-700">
                  {selectedItem.catatan_verifikasi || 'Tidak ada catatan tambahan.'}
                  {selectedItem.verifikator && (
                    <p className="text-[10px] text-gray-400 mt-1">
                      Diverifikasi oleh: {selectedItem.verifikator.name} ·{' '}
                      {selectedItem.diverifikasi_pada}
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>
        </Modal>
      )}
    </div>
  )
}
