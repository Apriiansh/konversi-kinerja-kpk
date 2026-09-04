import React, { useState, useEffect, useMemo } from 'react'
import {
  FileText,
  Download,
  Calendar,
  RefreshCw,
  Eye,
  TrendingUp,
  ShieldCheck,
  Lock,
} from 'lucide-react'
import { useAuth } from '../../context/useAuth'
import {
  getRekapitulasiList,
  getRekapitulasiDetail,
  finalizePak,
  downloadRekapitulasiXlsx,
} from '../../api/rekapitulasi'
import {
  Button,
  Card,
  CardHeader,
  Alert,
  FilterPills,
  SearchInput,
  StatusBadge,
  Modal,
} from '../../components/ui'
import type { FilterStatus, PenetapanAKItem, RekapDetailData } from '../../types'

export const Rekapitulasi: React.FC = () => {
  const { user } = useAuth()
  const isAdmin = user?.role === 'ADMIN'

  const currentYear = new Date().getFullYear()
  const [selectedTahun, setSelectedTahun] = useState<number>(currentYear)
  const [items, setItems] = useState<PenetapanAKItem[]>([])
  const [loading, setLoading] = useState<boolean>(true)
  const [searchQuery, setSearchQuery] = useState<string>('')
  const [filterStatus, setFilterStatus] = useState<FilterStatus>('ALL')
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)

  const [selectedDetail, setSelectedDetail] = useState<RekapDetailData | null>(null)
  const [finalizing, setFinalizing] = useState<boolean>(false)

  const fetchData = async () => {
    setLoading(true)
    setErrorMessage(null)
    try {
      const res = await getRekapitulasiList({ tahun: selectedTahun, per_page: 50 })
      setItems(res.data)
    } catch (err: any) {
      setErrorMessage(err.response?.data?.message || 'Gagal memuat data rekapitulasi PAK.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [selectedTahun])

  const handleOpenDetail = async (pegawaiId: string, tahun: number) => {
    setErrorMessage(null)
    try {
      const detail = await getRekapitulasiDetail(pegawaiId, tahun)
      setSelectedDetail(detail)
    } catch (err: any) {
      setErrorMessage(err.response?.data?.message || 'Gagal memuat rincian PAK pegawai.')
    }
  }

  const handleFinalize = async (pegawaiId: string, tahun: number) => {
    if (!isAdmin) return
    setFinalizing(true)
    setErrorMessage(null)
    try {
      const res = await finalizePak(pegawaiId, tahun)
      setSuccessMessage(res.message || 'Penetapan AK berhasil difinalisasi.')
      const updatedDetail = await getRekapitulasiDetail(pegawaiId, tahun)
      setSelectedDetail(updatedDetail)
      fetchData()
    } catch (err: any) {
      setErrorMessage(err.response?.data?.message || 'Gagal memfinalisasi PAK.')
    } finally {
      setFinalizing(false)
    }
  }

  const handleExport = async () => {
    try {
      await downloadRekapitulasiXlsx(selectedTahun)
    } catch {
      setErrorMessage('Gagal mengunduh berkas rekapitulasi XLSX.')
    }
  }

  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      const q = searchQuery.toLowerCase().trim()
      const nama = item.pegawai?.nama_lengkap?.toLowerCase() || ''
      const nip = item.pegawai?.nip || ''
      const gol = item.pegawai?.pangkat_golongan?.golongan?.toLowerCase() || ''

      const matchSearch = !q || nama.includes(q) || nip.includes(q) || gol.includes(q)
      if (!matchSearch) return false

      if (filterStatus === 'ALL') return true
      return item.status_kelayakan === filterStatus
    })
  }, [items, searchQuery, filterStatus])

  const countByStatus = (status: FilterStatus) =>
    status === 'ALL' ? items.length : items.filter((i) => i.status_kelayakan === status).length

  const filterOptions = useMemo(
    () => [
      { value: 'ALL' as FilterStatus, label: 'Semua', count: items.length, color: 'gray' },
      { value: 'LAYAK_PANGKAT' as FilterStatus, label: 'Layak Pangkat', count: countByStatus('LAYAK_PANGKAT'), color: 'emerald' },
      { value: 'LAYAK_JENJANG' as FilterStatus, label: 'Layak Jenjang', count: countByStatus('LAYAK_JENJANG'), color: 'blue' },
      { value: 'BELUM_CUKUP' as FilterStatus, label: 'Belum Cukup', count: countByStatus('BELUM_CUKUP'), color: 'amber' },
    ],
    [items]
  )

  return (
    <div className="space-y-6">
      {/* 1. Header Banner */}
      <CardHeader
        tag="Penetapan Angka Kredit"
        regulation="PerBKN No. 3/2023"
        title="Rekapitulasi & Penetapan Angka Kredit (PAK)"
        subtitle="Pantau perolehan Angka Kredit berkala, saldo historis, capaian evaluasi kinerja tahunan, serta status kelayakan kenaikan pangkat dan jenjang."
        actions={
          <>
            <div className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-xl px-3 py-1.5">
              <Calendar className="h-4 w-4 text-gray-500" />
              <select
                value={selectedTahun}
                onChange={(e) => setSelectedTahun(Number(e.target.value))}
                className="text-xs font-extrabold bg-transparent text-gray-800 focus:outline-none cursor-pointer"
              >
                {[currentYear - 2, currentYear - 1, currentYear, currentYear + 1].map((yr) => (
                  <option key={yr} value={yr}>
                    Tahun {yr}
                  </option>
                ))}
              </select>
            </div>
            <Button variant="secondary" className='cursor-pointer' icon={<Download className="h-4 w-4 text-gray-500" />} onClick={handleExport}>
              Ekspor XLSX
            </Button>
          </>
        }
      />

      {/* Alert Feedback */}
      {errorMessage && (
        <Alert variant="error" message={errorMessage} onDismiss={() => setErrorMessage(null)} />
      )}
      {successMessage && (
        <Alert variant="success" message={successMessage} onDismiss={() => setSuccessMessage(null)} />
      )}

      {/* 2. Filter Bar & Search */}
      <Card className="p-3.5 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <FilterPills options={filterOptions} active={filterStatus} onChange={setFilterStatus} />
        <SearchInput
          value={searchQuery}
          onChange={setSearchQuery}
          placeholder="Cari NIP, nama, atau golongan..."
        />
      </Card>

      {/* 3. Tabel Rekapitulasi Utama */}
      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="bg-gray-50/80 border-b border-gray-200/80 text-gray-500 font-extrabold text-[11px] uppercase tracking-wider">
                <th className="py-3 px-3.5">Pegawai</th>
                <th className="py-3 px-3.5">Pangkat / Gol</th>
                <th className="py-3 px-3.5">Saldo Awal</th>
                <th className="py-3 px-3.5">PAK Pelantikan</th>
                <th className="py-3 px-3.5">AK Baru (Kinerja)</th>
                <th className="py-3 px-3.5">Booster</th>
                <th className="py-3 px-3.5 font-black text-gray-900">Total AK Kumulatif</th>
                <th className="py-3 px-3.5 text-center">Status Kelayakan</th>
                <th className="py-3 px-3.5">Tindak Lanjut</th>
                <th className="py-3 px-3.5 text-center">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 bg-white">
              {loading ? (
                <tr>
                  <td colSpan={10} className="py-12 text-center text-gray-400">
                    <RefreshCw className="h-6 w-6 mx-auto animate-spin text-[#ba191d] mb-2" />
                    <p className="font-bold text-gray-600">Memuat data rekapitulasi...</p>
                  </td>
                </tr>
              ) : filteredItems.length === 0 ? (
                <tr>
                  <td colSpan={10} className="py-12 text-center text-gray-400">
                    <FileText className="h-8 w-8 mx-auto text-gray-300 mb-2" />
                    <p className="font-bold text-gray-500">Tidak ada data rekapitulasi untuk tahun {selectedTahun}.</p>
                  </td>
                </tr>
              ) : (
                filteredItems.map((item) => (
                  <tr key={item.id} className="hover:bg-gray-50/80 transition-colors">
                    <td className="py-3 px-3.5">
                      <p className="font-extrabold text-gray-900 text-xs">
                        {item.pegawai?.nama_lengkap ?? '-'}
                      </p>
                      <p className="font-mono text-[11px] font-bold text-gray-500 tracking-tight">
                        {item.pegawai?.nip ?? '-'}
                      </p>
                    </td>
                    <td className="py-3 px-3.5">
                      <span className="font-mono font-extrabold text-gray-900 text-xs">
                        {item.pegawai?.pangkat_golongan?.golongan ?? '-'}
                      </span>
                      <p className="text-[11px] font-medium text-gray-500">
                        {item.pegawai?.pangkat_golongan?.jenjang_jabatan?.nama ?? '-'}
                      </p>
                    </td>
                    <td className="py-3 px-3.5 font-mono font-bold text-gray-600">
                      {Number(item.ak_lama || 0).toFixed(2)}
                    </td>
                    <td className="py-3 px-3.5 font-mono font-bold text-gray-600">
                      {Number(item.ak_pak_pelantikan || 0) > 0
                        ? `${Number(item.ak_pak_pelantikan).toFixed(2)}`
                        : '-'}
                    </td>
                    <td className="py-3 px-3.5 font-mono font-extrabold text-blue-700">
                      {Number(item.ak_baru || 0).toFixed(2)}
                    </td>
                    <td className="py-3 px-3.5 font-mono font-extrabold text-emerald-700">
                      {Number(item.ak_booster || 0) > 0 ? `+${Number(item.ak_booster).toFixed(2)}` : '-'}
                    </td>
                    <td className="py-3 px-3.5 font-mono font-black text-gray-900 text-sm">
                      {Number(item.ak_kumulatif || 0).toFixed(2)}
                    </td>
                    <td className="py-3 px-3.5 text-center">
                      {item.status_kelayakan && <StatusBadge status={item.status_kelayakan} />}
                    </td>
                    <td className="py-3 px-3.5 text-xs">
                      {item.status_kelayakan === 'LAYAK_PANGKAT' && (
                        <span className="font-mono font-bold text-emerald-800">
                          Carry-Over: +{Number(item.carry_over ?? item.ak_carry_over ?? 0).toFixed(2)} AK
                        </span>
                      )}
                      {item.status_kelayakan === 'LAYAK_JENJANG' && (
                        <span className="text-[11px] font-medium text-gray-400 italic">
                          Sisa Reset (0 AK)
                        </span>
                      )}
                      {(!item.status_kelayakan || item.status_kelayakan === 'BELUM_CUKUP') && (
                        <span className="text-[11px] font-medium text-amber-800">
                          Disimpan utuh
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-3.5 text-center">
                      <Button
                        variant="secondary"
                        size="sm"
                        icon={<Eye className="h-3.5 w-3.5 text-gray-500" />}
                        onClick={() => handleOpenDetail(item.pegawai_id, item.tahun)}
                      >
                        Rincian
                      </Button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* 4. Modal Detail */}
      <Modal
        open={!!selectedDetail}
        onClose={() => setSelectedDetail(null)}
        title={selectedDetail ? `Rincian Penetapan Angka Kredit Tahun ${selectedDetail.tahun}` : ''}
        subtitle={
          selectedDetail
            ? `${selectedDetail.pegawai.nama_lengkap} · NIP ${selectedDetail.pegawai.nip}`
            : undefined
        }
        icon={<FileText className="h-5 w-5" />}
        footer={
          selectedDetail && (
            <>
              <div className="flex items-center gap-2 text-xs text-gray-500">
                <ShieldCheck className="h-4 w-4 text-emerald-600" />
                <span>
                  Status Penetapan:{' '}
                  <strong>{selectedDetail.is_final ? 'Final & Terkunci' : 'Draft Berjalan'}</strong>
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="secondary" onClick={() => setSelectedDetail(null)}>
                  Tutup
                </Button>
                {isAdmin && !selectedDetail.is_final && (
                  <Button
                    variant="primary"
                    onClick={() => handleFinalize(selectedDetail.pegawai.id, selectedDetail.tahun)}
                    loading={finalizing}
                    disabled={finalizing}
                    icon={!finalizing ? <Lock className="h-3.5 w-3.5" /> : undefined}
                  >
                    {finalizing ? 'Memfinalisasi...' : 'Finalisasi PAK Tahun Ini'}
                  </Button>
                )}
              </div>
            </>
          )
        }
      >
        {selectedDetail && (
          <>
            {/* Profile Bar */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-[#fafbfc] border border-gray-200/80 rounded-xl p-3.5 text-xs">
              <div>
                <span className="text-gray-400 font-medium block text-[10px] uppercase">Golongan Ruang</span>
                <span className="font-mono font-extrabold text-gray-900 text-sm">{selectedDetail.pangkat.golongan}</span>
              </div>
              <div>
                <span className="text-gray-400 font-medium block text-[10px] uppercase">Jenjang Jabatan</span>
                <span className="font-bold text-gray-800">{selectedDetail.pangkat.jenjang}</span>
              </div>
              <div>
                <span className="text-gray-400 font-medium block text-[10px] uppercase">Pendidikan Terakhir</span>
                <span className="font-bold text-gray-800">{selectedDetail.pegawai.pendidikan_terakhir ?? '-'}</span>
              </div>
              <div>
                <span className="text-gray-400 font-medium block text-[10px] uppercase">TMT Jabatan</span>
                <span className="font-mono font-bold text-gray-800">{selectedDetail.pegawai.tmt_jabatan ?? '-'}</span>
              </div>
            </div>

            {/* Progress Card */}
            <Card className="p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-[#ba191d]" />
                  <span className="text-xs font-extrabold text-gray-900">
                    Progress Menuju Target Kenaikan Pangkat
                  </span>
                </div>
                <span className="font-mono text-xs font-black text-gray-900">
                  {selectedDetail.ak_kumulatif.toFixed(2)} / {(selectedDetail.kelayakan.target_kp ?? 0).toFixed(2)} AK
                </span>
              </div>

              {(() => {
                const targetKp = selectedDetail.kelayakan.target_kp ?? 0
                const pct = targetKp > 0 ? Math.min(100, Math.round((selectedDetail.ak_kumulatif / targetKp) * 100)) : 0
                return (
                  <div className="space-y-1">
                    <div className="h-2.5 w-full overflow-hidden rounded-full bg-gray-100">
                      <div
                        className="h-full bg-[#ba191d] transition-all duration-500 rounded-full"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <div className="flex justify-between text-[11px] font-medium text-gray-400">
                      <span>{pct}% Tercapai</span>
                      <span>
                        {selectedDetail.ak_kumulatif >= targetKp
                          ? 'Target Terpenuhi'
                          : `Kurang ${selectedDetail.kelayakan.kurang_ak.toFixed(2)} AK lagi`}
                      </span>
                    </div>
                  </div>
                )
              })()}
            </Card>

            {/* 6 Kotak Komponen Saldo */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5 text-center">
              <div className="p-3 bg-[#fafbfc] border border-gray-200 rounded-xl">
                <span className="text-[10px] font-extrabold uppercase text-gray-400 block">AK Dasar</span>
                <span className="font-mono font-extrabold text-gray-800 text-sm mt-0.5 block">{selectedDetail.ak_dasar.toFixed(2)}</span>
              </div>
              <div className="p-3 bg-[#fafbfc] border border-gray-200 rounded-xl">
                <span className="text-[10px] font-extrabold uppercase text-gray-400 block">PAK Pelantikan</span>
                <span className="font-mono font-extrabold text-gray-800 text-sm mt-0.5 block">{selectedDetail.ak_pak_pelantikan.toFixed(2)}</span>
              </div>
              <div className="p-3 bg-[#fafbfc] border border-gray-200 rounded-xl">
                <span className="text-[10px] font-extrabold uppercase text-gray-400 block">Historis</span>
                <span className="font-mono font-extrabold text-gray-800 text-sm mt-0.5 block">{selectedDetail.ak_historis.toFixed(2)}</span>
              </div>
              <div className="p-3 bg-blue-50/50 border border-blue-200 rounded-xl">
                <span className="text-[10px] font-extrabold uppercase text-blue-700 block">AK Baru (TW4)</span>
                <span className="font-mono font-black text-blue-800 text-sm mt-0.5 block">{selectedDetail.ak_baru.toFixed(2)}</span>
              </div>
              <div className="p-3 bg-emerald-50/50 border border-emerald-200 rounded-xl">
                <span className="text-[10px] font-extrabold uppercase text-emerald-700 block">Booster</span>
                <span className="font-mono font-black text-emerald-800 text-sm mt-0.5 block">+{selectedDetail.ak_booster.toFixed(2)}</span>
              </div>
              <div className="p-3 bg-gradient-to-br from-red-900 to-[#ba191d] text-white rounded-xl shadow-sm">
                <span className="text-[10px] font-extrabold uppercase text-red-100 block">Kumulatif</span>
                <span className="font-mono font-black text-white text-base mt-0.5 block">{selectedDetail.ak_kumulatif.toFixed(2)}</span>
              </div>
            </div>

            {/* Rincian Evaluasi Triwulanan */}
            <div className="space-y-3">
              <h4 className="text-xs font-extrabold uppercase tracking-wider text-gray-500">
                Capaian Kinerja Triwulanan (TW1 – TW4)
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                {[1, 2, 3, 4].map((qNum) => {
                  const qData = selectedDetail.triwulan[qNum]
                  const isAnchor = qNum === 4
                  return (
                    <div
                      key={qNum}
                      className={`p-3.5 rounded-xl border ${
                        isAnchor ? 'border-[#ba191d] bg-red-50/30' : 'border-gray-200 bg-white'
                      }`}
                    >
                      <div className="flex items-center justify-between text-xs font-extrabold">
                        <span className={isAnchor ? 'text-[#ba191d]' : 'text-gray-800'}>
                          Triwulan {qNum}
                        </span>
                        {isAnchor && (
                          <span className="text-[9px] font-black uppercase text-[#ba191d] bg-red-100 px-1.5 py-0.2 rounded">
                            Jangkar TW4
                          </span>
                        )}
                      </div>
                      <p className="font-mono font-black text-gray-900 text-base mt-1.5">
                        {qData?.ak_total ? qData.ak_total.toFixed(2) : '0.00'}{' '}
                        <span className="text-xs font-normal text-gray-500">AK</span>
                      </p>
                      <p className="text-[11px] text-gray-500 mt-1">
                        Aktif: {qData?.jumlah_bulan ?? 0} Bulan
                      </p>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Status Kelayakan & Catatan */}
            <div className="rounded-xl border border-gray-200 bg-gray-50/60 p-4 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-extrabold text-gray-700">Keputusan Kelayakan Sistem:</span>
                <StatusBadge status={selectedDetail.kelayakan.status} size="md" />
              </div>
              <p className="text-xs text-gray-600 leading-relaxed">
                {selectedDetail.kelayakan.catatan}
              </p>
            </div>
          </>
        )}
      </Modal>
    </div>
  )
}
